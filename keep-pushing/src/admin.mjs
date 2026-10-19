// Tableau de bord des admins : l'appli prend-elle ? Joueurs actifs,
// inscriptions, paris par GP, activité du forum, avis, erreurs ; exports CSV.
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
