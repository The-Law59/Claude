// Saisons : pronos des champions (pilote et constructeur), palmarès des
// saisons passées. Les points de chaque week-end terminé sont figés dans
// state.final pour que les anciennes saisons restent calculables.
import { fail } from "./errors.mjs";

export const CHAMPION_POINTS = { driver: 50, team: 30 };
export const seasonOf = (key) => key.split("-")[1];
export const championsKey = (season) => `champions-${season}`;

// Fermeture : départ du 6e Grand Prix avant la fin de la saison.
export function championsCloseAt(events) {
  const e = events.at(-6) ?? events[0];
  return e ? Date.parse(e.sessions[0].startsAt) : 0;
}

export function mergeChampions(prev = {}, body, { driverIds, teamIds, closes, now = Date.now() }) {
  if (now >= closes) fail(409, "Pronos des champions fermés.");
  const bet = { ...prev };
  if (body && "driver" in body) {
    if (body.driver === null) delete bet.driver;
    else if (driverIds.includes(body.driver)) bet.driver = body.driver;
    else fail(400, "Pilote inconnu.");
  }
  if (body && "team" in body) {
    if (body.team === null) delete bet.team;
    else if (teamIds.includes(body.team)) bet.team = body.team;
    else fail(400, "Écurie inconnue.");
  }
  bet.at = now;
  return bet;
}

// champions : { driver, team } réels, une fois la saison terminée.
export const scoreChampions = (bet, champions) =>
  (bet.driver === champions.driver ? CHAMPION_POINTS.driver : 0) +
  (bet.team === champions.team ? CHAMPION_POINTS.team : 0);

// rounds : { cléDeManche: { userId: points } } ; renvoie, par saison, le
// classement final { season: [{ id, points }] } du meilleur au moins bon.
export function standingsBySeason(rounds) {
  const out = {};
  for (const [key, byUser] of Object.entries(rounds)) {
    const totals = (out[seasonOf(key)] ??= {});
    for (const [uid, p] of Object.entries(byUser)) totals[uid] = (totals[uid] ?? 0) + p;
  }
  return Object.fromEntries(
    Object.entries(out).map(([s, totals]) => [
      s,
      Object.entries(totals)
        .map(([id, points]) => ({ id, points }))
        .sort((a, b) => b.points - a.points),
    ]),
  );
}

// Sauvegardes quotidiennes : noms « game-AAAA-MM-JJ.json », on garde les N
// plus récentes.
export const backupName = (date) => `game-${date.toISOString().slice(0, 10)}.json`;
export const backupsToDelete = (names, keep = 14) =>
  names
    .filter((n) => /^game-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort()
    .slice(0, -keep);
