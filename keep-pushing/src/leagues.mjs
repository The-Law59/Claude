// Ligues privées : un nom, un code d'invitation, un classement à part.
// État : state.leagues = { id: { id, name, code, owner, members: [userId] } }.
import { randomBytes } from "node:crypto";
import { fail } from "./errors.mjs";

const LIMITS = { name: 40, members: 100, perUser: 10, total: 2000 };
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I

const mine = (state, user) =>
  Object.values(state.leagues ?? {}).filter((l) => l.members.includes(user.id));

export function createLeague(state, user, body, rand = randomBytes) {
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > LIMITS.name)
    fail(400, `Nom de la ligue : 1 à ${LIMITS.name} caractères.`);
  state.leagues ??= {};
  if (mine(state, user).length >= LIMITS.perUser) fail(409, `${LIMITS.perUser} ligues au maximum.`);
  if (Object.keys(state.leagues).length >= LIMITS.total)
    fail(503, "Trop de ligues sur ce serveur.");
  let code;
  do code = [...rand(6)].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
  while (Object.values(state.leagues).some((l) => l.code === code));
  const league = {
    id: rand(9).toString("base64url"),
    name,
    code,
    owner: user.id,
    members: [user.id],
  };
  state.leagues[league.id] = league;
  return league;
}

export function joinLeague(state, user, body) {
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const league = Object.values(state.leagues ?? {}).find((l) => l.code === code);
  if (!league) fail(404, "Aucune ligue avec ce code.");
  if (league.members.includes(user.id)) return league;
  if (league.members.length >= LIMITS.members) fail(409, "Ligue complète.");
  if (mine(state, user).length >= LIMITS.perUser) fail(409, `${LIMITS.perUser} ligues au maximum.`);
  league.members.push(user.id);
  return league;
}

// Quitter ; la ligue disparaît quand il n'y a plus personne.
export function leaveLeague(state, user, id) {
  const league = state.leagues?.[id];
  if (!league?.members.includes(user.id)) fail(404, "Ligue inconnue.");
  league.members = league.members.filter((m) => m !== user.id);
  if (!league.members.length) delete state.leagues[id];
}

export const leaguesOf = mine;

// --- Chat de la ligue : 280 caractères, un message toutes les 3 s, les
// 200 derniers gardés. On efface ses messages ; le créateur modère.
const CHAT = { length: 280, keep: 200, gapMs: 3000 };

function member(state, user, id) {
  const league = state.leagues?.[id];
  if (!league?.members.includes(user.id)) fail(404, "Ligue inconnue.");
  return league;
}

export function postMessage(state, user, id, body, { now = Date.now(), rand = randomBytes } = {}) {
  const league = member(state, user, id);
  const text = typeof body?.text === "string" ? body.text.trim().replace(/\s+/g, " ") : "";
  if (!text || text.length > CHAT.length) fail(400, `Message : 1 à ${CHAT.length} caractères.`);
  league.messages ??= [];
  const last = league.messages.findLast((m) => m.userId === user.id);
  if (last && now - last.at < CHAT.gapMs)
    fail(429, "Doucement : un message toutes les 3 secondes.");
  league.messages.push({ id: rand(6).toString("base64url"), userId: user.id, text, at: now });
  league.messages = league.messages.slice(-CHAT.keep);
}

export function deleteMessage(state, user, id, messageId) {
  const league = member(state, user, id);
  const m = (league.messages ?? []).find((x) => x.id === messageId);
  if (!m) fail(404, "Message introuvable.");
  if (m.userId !== user.id && league.owner !== user.id)
    fail(403, "Seul l'auteur ou le créateur peut l'effacer.");
  league.messages = league.messages.filter((x) => x.id !== messageId);
}

export function messagesOf(state, user, id) {
  const league = member(state, user, id);
  return {
    owner: league.owner === user.id,
    messages: (league.messages ?? []).map((m) => ({
      id: m.id,
      pseudo: state.users?.[m.userId]?.pseudo ?? "Ancien membre",
      mine: m.userId === user.id,
      text: m.text,
      at: m.at,
    })),
  };
}
