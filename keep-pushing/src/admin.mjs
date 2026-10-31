// Tableau de bord des admins : l'appli prend-elle ? Joueurs actifs,
// inscriptions, paris par GP, activité du forum, avis, erreurs ; gestion
// des joueurs, pronos saisis à la place d'un joueur, erreurs ; exports CSV.
import { PARTS } from "./bets.mjs";
import { fail } from "./errors.mjs";

const DAY = 86400000;

// Lundi (UTC) de la semaine d'une date, « AAAA-MM-JJ ».
const weekOf = (t) => {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

// events : GP de la saison en cours (id, name, round).
export function stats(state, { events = [], now = Date.now() } = {}) {
  const users = Object.values(state.users ?? {});
  const seen = (days) => users.filter((u) => now - (u.lastSeen ?? u.createdAt) < days * DAY).length;
  const weeks = Array.from({ length: 8 }, (_, i) => weekOf(now - (7 - i) * 7 * DAY));
  const signups = Object.fromEntries(weeks.map((w) => [w, 0]));
  for (const u of users) if (weekOf(u.createdAt) in signups) signups[weekOf(u.createdAt)] += 1;
  const posts = Object.values(state.forum?.topics ?? {}).flatMap((t) => t.posts);
  const leagues = Object.values(state.leagues ?? {});
  const feedback = state.feedback ?? [];
  const errors = state.errors ?? [];
  return {
    players: {
      total: users.length,
      active7: seen(7),
      active30: seen(30),
      new7: users.filter((u) => now - u.createdAt < 7 * DAY).length,
    },
    signups: weeks.map((week) => ({ week, count: signups[week] })),
    bets: events
      .filter((e) => state.bets?.[e.id])
      .map((e) => ({
        eventId: e.id,
        name: e.name,
        round: e.round,
        players: Object.keys(state.bets[e.id]).length,
      })),
    forum: {
      topics: Object.keys(state.forum?.topics ?? {}).length,
      posts: posts.length,
      posts7: posts.filter((p) => now - p.at < 7 * DAY).length,
      reported: posts.filter((p) => p.reports.length).length,
    },
    leagues: {
      count: leagues.length,
      members: leagues.reduce((n, l) => n + l.members.length, 0),
      messages7: leagues.flatMap((l) => l.messages ?? []).filter((m) => now - m.at < 7 * DAY)
        .length,
    },
    feedback: {
      count: feedback.length,
      average: feedback.length
        ? Math.round((feedback.reduce((a, f) => a + f.rating, 0) / feedback.length) * 10) / 10
        : null,
    },
    errors: {
      total: errors.length,
      last24h: errors.filter((e) => now - e.last < DAY).reduce((n, e) => n + e.count, 0),
    },
  };
}

// --- Exports CSV (séparateur « ; » pour Excel en français).
const cell = (v) => {
  const t = v === null || v === undefined ? "" : String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
export const toCsv = (header, rows) =>
  [header, ...rows].map((r) => r.map(cell).join(";")).join("\n");
const date = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") : "");

// points(userId) : points de la saison en cours.
export function exportCsv(state, type, { points = () => 0 } = {}) {
  const pseudo = (id) => state.users?.[id]?.pseudo ?? "Ancien joueur";
  if (type === "players")
    return toCsv(
      ["pseudo", "inscrit le", "dernière visite", "amis", "ligues", "GP pariés", "points saison"],
      Object.values(state.users ?? {}).map((u) => [
        u.pseudo,
        date(u.createdAt),
        date(u.lastSeen),
        u.friends.length,
        Object.values(state.leagues ?? {}).filter((l) => l.members.includes(u.id)).length,
        Object.values(state.bets ?? {}).filter((b) => b[u.id]).length,
        points(u.id),
      ]),
    );
  if (type === "bets")
    return toCsv(
      ["GP", "pseudo", "joker", "qualifs", "course", "enregistré le"],
      Object.entries(state.bets ?? {}).flatMap(([eventId, byUser]) =>
        Object.entries(byUser).map(([uid, b]) => [
          eventId,
          pseudo(uid),
          b.joker ? "oui" : "",
          (b.quali ?? []).join(" "),
          (b.race ?? []).join(" "),
          date(b.at),
        ]),
      ),
    );
  if (type === "feedback")
    return toCsv(
      ["date", "pseudo", "note", "aime", "à améliorer", "idées"],
      (state.feedback ?? []).map((f) => [
        date(f.at),
        f.userId ? pseudo(f.userId) : "Compte supprimé",
        f.rating,
        f.likes.join(", "),
        f.improve,
        f.ideas,
      ]),
    );
  if (type === "errors")
    return toCsv(
      ["source", "message", "où", "occurrences", "première", "dernière", "plateforme"],
      (state.errors ?? []).map((e) => [
        e.source,
        e.message,
        e.where,
        e.count,
        date(e.first),
        date(e.last),
        e.platform,
      ]),
    );
  return null;
}

// --- Gestion.
// Joueurs, les plus récemment vus d'abord. points(userId) : points de la saison.
export function players(state, { points = () => 0, isAdmin = () => false } = {}) {
  return Object.values(state.users ?? {})
    .map((u) => ({
      id: u.id,
      pseudo: u.pseudo,
      createdAt: u.createdAt,
      lastSeen: u.lastSeen ?? null,
      friends: u.friends.length,
      leagues: Object.values(state.leagues ?? {}).filter((l) => l.members.includes(u.id)).length,
      bets: Object.values(state.bets ?? {}).filter((b) => b[u.id]).length,
      points: points(u.id),
      admin: isAdmin(u),
    }))
    .sort((a, b) => (b.lastSeen ?? b.createdAt) - (a.lastSeen ?? a.createdAt));
}

// Pronos d'un GP : chaque joueur, avec ou sans prono.
export function betsOf(state, eventId) {
  const byUser = state.bets?.[eventId] ?? {};
  const byAdmin = (state.adminBets ?? []).filter((x) => x.eventId === eventId);
  return Object.values(state.users ?? {})
    .map((u) => ({
      id: u.id,
      pseudo: u.pseudo,
      // Un prono sans aucune partie (envoi après fermeture) ne compte pas.
      bet: Object.keys(byUser[u.id] ?? {}).some((k) => k !== "at") ? byUser[u.id] : null,
      byAdmin: [...new Set(byAdmin.filter((x) => x.userId === u.id).map((x) => x.part))],
    }))
    .sort((a, b) => Number(!!b.bet) - Number(!!a.bet) || a.pseudo.localeCompare(b.pseudo));
}

// Prono saisi par un admin à la place d'un joueur, même partie fermée.
export function setBetFor(
  state,
  { eventId, userId, part, ids, by },
  { driverIds, now = Date.now() },
) {
  if (!state.users?.[userId]) fail(404, "Joueur introuvable.");
  if (!PARTS[part]) fail(400, "Partie inconnue.");
  if (!Array.isArray(ids) || ids.length !== PARTS[part].size)
    fail(400, `Il faut ${PARTS[part].size} pilotes.`);
  if (!ids.every((id) => driverIds.includes(id))) fail(400, "Pilote inconnu.");
  if (new Set(ids).size !== ids.length) fail(400, "Un pilote est en double.");
  state.bets ??= {};
  state.bets[eventId] ??= {};
  (state.bets[eventId][userId] ??= {})[part] = ids;
  (state.adminBets ??= []).push({ userId, eventId, part, ids, by, at: now });
  return state.bets[eventId][userId];
}

// Erreur réglée : retirée de la liste (toutes si signature absente).
export function resolveErrors(state, signature) {
  const before = (state.errors ?? []).length;
  state.errors = signature ? (state.errors ?? []).filter((e) => e.signature !== signature) : [];
  return before - state.errors.length;
}
