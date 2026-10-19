// « Mon compte » : changer de mot de passe ou de pseudo, exporter ses données,
// supprimer son compte (obligatoire pour l'App Store et Google Play). Chaque
// action sensible redemande le mot de passe actuel.
import { randomBytes } from "node:crypto";
import { PSEUDO_RULE, checkPassword, hashPassword, sessionHash } from "./accounts.mjs";
import { fail } from "./errors.mjs";

const bearer = (header) => (header ?? "").replace(/^Bearer /, "");
async function confirm(user, password) {
  if (!(await checkPassword(user, password))) fail(403, "Mot de passe actuel incorrect.");
}

// Les autres appareils sont déconnectés ; celui-ci reste connecté.
export async function changePassword(state, user, body, header) {
  await confirm(user, body?.current);
  const next = typeof body?.next === "string" ? body.next : "";
  if (next.length < 8 || next.length > 100)
    fail(400, "Nouveau mot de passe : au moins 8 caractères.");
  user.salt = randomBytes(16).toString("hex");
  user.hash = await hashPassword(next, user.salt);
  const keep = sessionHash(bearer(header));
  for (const [h, s] of Object.entries(state.sessions))
    if (s.userId === user.id && h !== keep) delete state.sessions[h];
}

export async function changePseudo(state, user, body) {
  await confirm(user, body?.password);
  const pseudo = typeof body?.pseudo === "string" ? body.pseudo.trim() : "";
  if (!PSEUDO_RULE.test(pseudo))
    fail(400, "Pseudo : 3 à 20 lettres, chiffres, « _ », « - » ou « . ».");
  const taken = Object.values(state.users).some(
    (u) => u.id !== user.id && u.pseudo.toLowerCase() === pseudo.toLowerCase(),
  );
  if (taken) fail(409, "Ce pseudo est déjà pris.");
  user.pseudo = pseudo;
  return { id: user.id, pseudo };
}

// Toutes les données liées au joueur (droit d'accès RGPD).
export function exportData(state, user) {
  const mine = (list) => list.filter((x) => x.userId === user.id);
  const name = (id) => state.users[id]?.pseudo ?? "Ancien joueur";
  return {
    exportedAt: new Date().toISOString(),
    profile: { pseudo: user.pseudo, createdAt: new Date(user.createdAt).toISOString() },
    friends: user.friends.map(name),
    blocked: (user.blocked ?? []).map(name),
    settings: user.settings?.data ?? null,
    bets: Object.fromEntries(
      Object.entries(state.bets ?? {})
        .filter(([, byUser]) => byUser[user.id])
        .map(([eventId, byUser]) => [eventId, byUser[user.id]]),
    ),
    champions: Object.fromEntries(
      Object.entries(state.champions ?? {})
        .filter(([, byUser]) => byUser[user.id])
        .map(([s, byUser]) => [s, byUser[user.id]]),
    ),
    leagues: Object.values(state.leagues ?? {})
      .filter((l) => l.members.includes(user.id))
      .map((l) => ({ name: l.name, owner: l.owner === user.id, messages: mine(l.messages ?? []) })),
    forum: Object.values(state.forum?.topics ?? {}).flatMap((t) =>
      mine(t.posts).map((p) => ({
        topic: t.title,
        text: p.text,
        at: new Date(p.at).toISOString(),
      })),
    ),
    feedback: mine(state.feedback ?? []),
  };
}

// Suppression définitive : compte, sessions, paris, amitiés, messages et
// sujets du forum, notifications. Les ligues créées passent au membre suivant ;
// les avis restent, anonymes, pour les statistiques.
export async function deleteAccount(state, user, body) {
  await confirm(user, body?.password);
  const id = user.id;
  delete state.users[id];
  for (const [h, s] of Object.entries(state.sessions))
    if (s.userId === id) delete state.sessions[h];
  for (const u of Object.values(state.users)) {
    u.friends = u.friends.filter((f) => f !== id);
    if (u.blocked) u.blocked = u.blocked.filter((b) => b !== id);
  }
  for (const group of [state.bets, state.final, state.champions])
    for (const byUser of Object.values(group ?? {})) delete byUser[id];
  for (const l of Object.values(state.leagues ?? {})) {
    l.members = l.members.filter((m) => m !== id);
    l.messages = (l.messages ?? []).filter((m) => m.userId !== id);
    if (!l.members.length) delete state.leagues[l.id];
    else if (l.owner === id) l.owner = l.members[0];
  }
  for (const t of Object.values(state.forum?.topics ?? {})) {
    if (t.posts[0]?.userId === id) delete state.forum.topics[t.id];
    else {
      t.posts = t.posts.filter((p) => p.userId !== id);
      for (const p of t.posts) p.reports = p.reports.filter((r) => r !== id);
    }
  }
  delete state.notifications?.[id];
  for (const f of state.feedback ?? []) if (f.userId === id) f.userId = null;
}
