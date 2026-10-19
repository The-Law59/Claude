// Paris par week-end, façon tableau : top 10 des qualifs, top 10 de la course,
// top 8 du sprint, meilleur tour et nombre d'abandons. Chaque partie ferme au
// départ de sa session. Points par case selon l'écart à la vraie place.
// Ouverture : qualifs, sprint et joker le lundi qui suit le GP précédent ;
// course, meilleur tour, abandons et question 1 h après le début des qualifs.
// En plus : une question oui/non par week-end et un joker (points x2) par saison.
import { fail } from "./errors.mjs";

export const POINTS = {
  exact: 10,
  close: 5,
  inTop: 2,
  perfect: 20,
  fastest: 5,
  dnfExact: 10,
  dnfClose: 4,
  question: 5,
};
export const PARTS = {
  quali: { session: "Qualifying", size: 10 },
  sprint: { session: "Sprint", size: 8 },
  race: { session: "Race", size: 10 },
};
// Meilleur tour, abandons et question se jouent sur la course.
const EXTRAS = { fastest: "Race", dnf: "Race", answer: "Race", question: "Race" };

// Question du week-end : choisie selon la manche, vérifiable avec les
// résultats Jolpica (grille, écarts, écuries du podium).
const QUESTIONS = [
  { id: "pole", text: "Le poleman gagne-t-il la course ?" },
  { id: "podium:Ferrari", text: "Une Ferrari monte-t-elle sur le podium ?" },
  { id: "comeback", text: "Un pilote parti au-delà de la 10e place finit-il dans le top 5 ?" },
  { id: "podium:McLaren", text: "Une McLaren monte-t-elle sur le podium ?" },
  { id: "gap", text: "Le vainqueur s'impose-t-il avec plus de 5 secondes d'avance ?" },
  { id: "podium:Mercedes", text: "Une Mercedes monte-t-elle sur le podium ?" },
  { id: "podium:Red Bull", text: "Une Red Bull monte-t-elle sur le podium ?" },
];
export const questionOf = (event) => QUESTIONS[(event.round ?? 0) % QUESTIONS.length];

// Réponse réelle à une question (null si la course n'a pas de résultat).
export function answerOf(questionId, race) {
  if (!race?.length) return null;
  const byPos = [...race].sort((a, b) => a.position - b.position);
  if (questionId === "pole") return byPos[0].grid === 1;
  if (questionId === "comeback") return byPos.slice(0, 5).some((r) => r.grid === 0 || r.grid > 10);
  if (questionId === "gap") {
    const m = String(byPos[1]?.value ?? "").match(/^\+(?:(\d+):)?(\d+(?:\.\d+)?)$/);
    return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) > 5 : true; // 2e à un tour ou plus
  }
  if (questionId.startsWith("podium:")) {
    const team = questionId.slice(7);
    return byPos.slice(0, 3).some((r) => r.team === team);
  }
  return null;
}

const start = (event, type) => {
  const s = event.sessions.find((x) => x.type === type);
  return s ? Date.parse(s.startsAt) : null;
};
export const partsOf = (event) =>
  Object.keys(PARTS).filter((p) => start(event, PARTS[p].session) !== null);
export const closesAt = (event, part) =>
  part === "joker"
    ? Math.min(...partsOf(event).map((p) => closesAt(event, p)))
    : start(event, PARTS[part]?.session ?? EXTRAS[part]);

const AFTER_QUALI = ["race", "fastest", "dnf", "answer", "question"];
// Lundi 0 h (UTC) qui suit une date.
export function mondayAfter(t) {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() + ((8 - d.getUTCDay()) % 7 || 7) * 86400000;
}
// prevRace : départ de la course du GP précédent (null pour le premier GP).
export function opensAt(event, part, prevRace = null) {
  const quali = start(event, "Qualifying");
  if (AFTER_QUALI.includes(part) && quali !== null) return quali + 3600000;
  return prevRace === null ? 0 : mondayAfter(prevRace);
}
export const isOpen = (event, part, now = Date.now(), prevRace = null) =>
  now >= opensAt(event, part, prevRace) && now < closesAt(event, part);
const isClosed = (event, part, now) => now >= closesAt(event, part);

// Fusionne un pari reçu avec le précédent : les parties fermées ne bougent plus.
// Les parties pas encore ouvertes sont ignorées de la même façon.
export function mergeBet(event, prev = {}, body, driverIds, now = Date.now(), prevRace = null) {
  const bet = { ...prev };
  const canEdit = (part) => isOpen(event, part, now, prevRace);
  for (const part of partsOf(event)) {
    if (!canEdit(part) || !(part in (body ?? {}))) continue;
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
  if (canEdit("fastest") && body && "fastest" in body) {
    if (body.fastest === null) delete bet.fastest;
    else if (driverIds.includes(body.fastest)) bet.fastest = body.fastest;
    else fail(400, "Pilote inconnu (meilleur tour).");
  }
  if (canEdit("dnf") && body && "dnf" in body) {
    if (body.dnf === null) delete bet.dnf;
    else if (Number.isInteger(body.dnf) && body.dnf >= 0 && body.dnf <= 22) bet.dnf = body.dnf;
    else fail(400, "Nombre d'abandons : entre 0 et 22.");
  }
  if (canEdit("answer") && body && "answer" in body) {
    if (body.answer === null) delete bet.answer;
    else if (typeof body.answer === "boolean") {
      bet.answer = body.answer;
      bet.question = questionOf(event).id;
    } else fail(400, "Réponse : oui ou non.");
  }
  // Joker : à poser avant la première session du week-end. Le serveur
  // vérifie qu'il n'y en a qu'un par saison.
  if (canEdit("joker") && body && "joker" in body) {
    if (body.joker === true) bet.joker = true;
    else delete bet.joker;
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
  const answer = bet.question ? answerOf(bet.question, race) : null;
  out.answer =
    bet.answer !== undefined && answer !== null
      ? bet.answer === answer
        ? POINTS.question
        : 0
      : null;
  out.total =
    ["quali", "sprint", "race"].reduce((a, p) => a + (out[p]?.total ?? 0), 0) +
    (out.fastest ?? 0) +
    (out.dnf ?? 0) +
    (out.answer ?? 0);
  if (bet.joker) out.total *= 2;
  out.joker = !!bet.joker;
  return out;
}

// Ce qu'on voit d'un pari d'un autre joueur : seulement les parties fermées.
export function visibleBet(event, bet, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(bet).filter(([k]) => k !== "at" && isClosed(event, k, now)),
  );
}

// Points de chaque joueur, week-end par week-end : { eventId: { userId: points } }.
// resultsFor(eventId) -> { Qualifying?, Sprint?, Race? } | undefined.
export function perRound(bets, resultsFor) {
  const out = {};
  for (const [eventId, byUser] of Object.entries(bets)) {
    const results = resultsFor(eventId);
    if (!results) continue;
    out[eventId] = Object.fromEntries(
      Object.entries(byUser).map(([uid, bet]) => [uid, scoreBet(bet, results).total]),
    );
  }
  return out;
}

// Classement : total des points de chaque joueur sur tous les week-ends.
export function leaderboard(userIds, rounds) {
  const totals = Object.fromEntries(userIds.map((id) => [id, { points: 0, weekends: 0 }]));
  for (const byUser of Object.values(rounds))
    for (const [uid, points] of Object.entries(byUser)) {
      if (!totals[uid]) continue;
      totals[uid].points += points;
      totals[uid].weekends += 1;
    }
  return Object.entries(totals).map(([id, t]) => ({ id, ...t }));
}

// Manche par manche pour un joueur : ses points, le meilleur score, et sa
// place au classement cumulé après la manche. order : ids de GP dans l'ordre.
export function history(userIds, rounds, order, me) {
  const totals = Object.fromEntries(userIds.map((id) => [id, 0]));
  return order
    .filter((id) => rounds[id])
    .map((eventId) => {
      const byUser = rounds[eventId];
      for (const [uid, p] of Object.entries(byUser)) if (uid in totals) totals[uid] += p;
      const best = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0];
      return {
        eventId,
        points: byUser[me] ?? null,
        best: { id: best[0], points: best[1] },
        total: totals[me],
        rank: 1 + Object.values(totals).filter((t) => t > totals[me]).length,
      };
    });
}
