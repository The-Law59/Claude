// Simulateur de championnat : points en jeu sur les courses et sprints
// restants, pilotes encore en lice, classement final selon des places choisies.
export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
const table = (type) => (type === "Sprint" ? SPRINT_POINTS : RACE_POINTS);
export const pointsFor = (type, position) => table(type)[position - 1] ?? 0;

// Courses et sprints pas encore partis, dans l'ordre.
export function remaining(events, now = Date.now()) {
  return events.flatMap((e) =>
    e.sessions
      .filter((s) => (s.type === "Race" || s.type === "Sprint") && Date.parse(s.startsAt) > now)
      .map((s) => ({ id: s.id, type: s.type, name: e.name })),
  );
}
export const maxLeft = (sessions) => sessions.reduce((a, s) => a + table(s.type)[0], 0);

// Pilotes qui peuvent encore être champions, du mieux placé au moins bien.
export function contenders(drivers, sessions) {
  const left = maxLeft(sessions);
  const leader = Math.max(...drivers.map((d) => d.points));
  return drivers.filter((d) => d.points + left >= leader).sort((a, b) => b.points - a.points);
}

// Pilotes simulés : les prétendants au titre, plus mon pilote favori s'il
// n'en fait pas partie (pour voir jusqu'où il peut remonter).
export function simulated(drivers, sessions, favoriteId) {
  const list = contenders(drivers, sessions);
  const fav = drivers.find((d) => d.id === favoriteId);
  return fav && !list.includes(fav) ? [...list, fav] : list;
}

// picks : { sessionId: { driverId: place } } (place absente = hors points).
export function simulate(drivers, sessions, picks) {
  return drivers
    .map((d) => {
      const gained = sessions.reduce((a, s) => a + pointsFor(s.type, picks[s.id]?.[d.id]), 0);
      return { ...d, gained, total: d.points + gained };
    })
    .sort((a, b) => b.total - a.total);
}

// Places par défaut : l'ordre actuel du championnat.
export const defaultPicks = (sessions, ids) =>
  Object.fromEntries(
    sessions.map((s) => [s.id, Object.fromEntries(ids.map((id, i) => [id, i + 1]))]),
  );

// Change la place d'un pilote ; s'il prend celle d'un autre, ils échangent.
export function setPlace(picks, sessionId, driverId, place) {
  const row = { ...picks[sessionId] };
  const other = Object.keys(row).find((id) => id !== driverId && row[id] === place);
  if (other) row[other] = row[driverId];
  row[driverId] = place;
  return { ...picks, [sessionId]: row };
}
