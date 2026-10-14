// Paris par week-end, façon tableau : top 10 des qualifs, top 10 de la course,
// top 8 du sprint, meilleur tour et nombre d'abandons. Chaque partie ferme au
// départ de sa session. Points par case selon l'écart à la vraie place.
import { fail } from "./errors.mjs";

export const POINTS = {
  exact: 10,
  close: 5,
  inTop: 2,
  perfect: 20,
  fastest: 5,
  dnfExact: 10,
  dnfClose: 4,
};
export const PARTS = {
  quali: { session: "Qualifying", size: 10 },
  sprint: { session: "Sprint", size: 8 },
  race: { session: "Race", size: 10 },
};
// Meilleur tour et abandons se jouent sur la course.
const EXTRAS = { fastest: "Race", dnf: "Race" };

const start = (event, type) => {
  const s = event.sessions.find((x) => x.type === type);
  return s ? Date.parse(s.startsAt) : null;
};
export const partsOf = (event) =>
  Object.keys(PARTS).filter((p) => start(event, PARTS[p].session) !== null);
export const closesAt = (event, part) => start(event, PARTS[part]?.session ?? EXTRAS[part]);
export const isOpen = (event, part, now = Date.now()) => now < closesAt(event, part);

// Fusionne un pari reçu avec le précédent : les parties fermées ne bougent plus.
export function mergeBet(event, prev = {}, body, driverIds, now = Date.now()) {
  const bet = { ...prev };
  for (const part of partsOf(event)) {
    if (!isOpen(event, part, now) || !(part in (body ?? {}))) continue;
    const list = body[part];
    if (list === null || (Array.isArray(list) && list.length === 0)) delete bet[part];
    else if (
      Array.isArray(list) &&
      list.length === PARTS[part].size &&
      list.every((id) => driverIds.includes(id)) &&
      new Set(list).size === list.length
    )
      bet[part] = list;
    else fail(400, `Classement incomplet ou pilote en double (${part}).`);
  }
  if (isOpen(event, "fastest", now) && body && "fastest" in body) {
    if (body.fastest === null) delete bet.fastest;
    else if (driverIds.includes(body.fastest)) bet.fastest = body.fastest;
    else fail(400, "Pilote inconnu (meilleur tour).");
  }
  if (isOpen(event, "dnf", now) && body && "dnf" in body) {
    if (body.dnf === null) delete bet.dnf;
    else if (Number.isInteger(body.dnf) && body.dnf >= 0 && body.dnf <= 22) bet.dnf = body.dnf;
    else fail(400, "Nombre d'abandons : entre 0 et 22.");
  }
  bet.at = now;
  return bet;
}

// Points case par case d'un classement pronostiqué.
export function scoreList(list, rows, size) {
  const pos = Object.fromEntries(rows.map((r) => [r.driverId, r.position]));
  const slots = list.map((id, i) => {
    const p = pos[id];
    if (!p) return 0;
    if (p === i + 1) return POINTS.exact;
    if (Math.abs(p - i - 1) === 1) return POINTS.close;
    return p <= size ? POINTS.inTop : 0;
  });
  const perfect = slots.every((x) => x === POINTS.exact) ? POINTS.perfect : 0;
  return { slots, bonus: perfect, total: slots.reduce((a, b) => a + b, 0) + perfect };
}

// Abandons : non classés à l'arrivée (hors forfaits « W »).
export const dnfCount = (rows) =>
  rows.filter((r) => r.positionText && /^[RDNE]$/.test(r.positionText)).length;

// results : { Qualifying?, Sprint?, Race? } (lignes Jolpica). Une partie sans
// résultat publié vaut null.
export function scoreBet(bet, results) {
  const out = { total: 0 };
  for (const [part, { session, size }] of Object.entries(PARTS)) {
    const rows = results[session];
    out[part] = bet[part] && rows?.length ? scoreList(bet[part], rows, size) : null;
  }
  const race = results.Race;
  const fastest = race?.find((r) => r.fastestLap)?.driverId;
  out.fastest = bet.fastest && fastest ? (bet.fastest === fastest ? POINTS.fastest : 0) : null;
  const dnf = race?.length ? dnfCount(race) : null;
  out.dnf =
    bet.dnf !== undefined && dnf !== null
      ? bet.dnf === dnf
        ? POINTS.dnfExact
        : Math.abs(bet.dnf - dnf) === 1
          ? POINTS.dnfClose
          : 0
      : null;
  out.total =
    ["quali", "sprint", "race"].reduce((a, p) => a + (out[p]?.total ?? 0), 0) +
    (out.fastest ?? 0) +
    (out.dnf ?? 0);
  return out;
}

// Ce qu'on voit d'un pari d'un autre joueur : seulement les parties fermées.
export function visibleBet(event, bet, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(bet).filter(([k]) => k !== "at" && !isOpen(event, k, now)),
  );
}

// Classement : total des points de chaque joueur sur tous les week-ends.
// resultsFor(eventId) -> { Qualifying?, Sprint?, Race? } | undefined.
export function leaderboard(userIds, bets, resultsFor) {
  const totals = Object.fromEntries(userIds.map((id) => [id, { points: 0, weekends: 0 }]));
  for (const [eventId, byUser] of Object.entries(bets)) {
    const results = resultsFor(eventId);
    if (!results) continue;
    for (const [uid, bet] of Object.entries(byUser)) {
      if (!totals[uid]) continue;
      totals[uid].points += scoreBet(bet, results).total;
      totals[uid].weekends += 1;
    }
  }
  return Object.entries(totals).map(([id, t]) => ({ id, ...t }));
}
