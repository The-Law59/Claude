// Pronostics entre amis : groupes à code d'invitation, pronos pole + podium,
// fermés au début des premières qualifications du week-end. Fonctions pures
// sur un état JSON ; server.mjs gère HTTP et sauvegarde sur disque.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { lockTime } from "./model.mjs";

export { lockTime };

export const POINTS = { pole: 3, exact: 5, podium: 2 };
const LIMITS = { groups: 500, members: 30, pseudo: 20, name: 40 };
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I
const SLOTS = ["pole", "p1", "p2", "p3"];

export class PredictionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new PredictionError(status, message);
};
const hash = (token) => createHash("sha256").update(token).digest("hex");
const id = (rand) => rand(9).toString("base64url");
const text = (value, max, what) => {
  const v = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!v || v.length > max) fail(400, `${what} : 1 à ${max} caractères.`);
  return v;
};

function addMember(group, pseudo, rand) {
  if (Object.keys(group.members).length >= LIMITS.members) fail(409, "Groupe complet.");
  if (Object.values(group.members).some((m) => m.pseudo.toLowerCase() === pseudo.toLowerCase()))
    fail(409, "Ce pseudo est déjà pris dans le groupe.");
  const memberId = id(rand);
  const token = rand(24).toString("base64url");
  group.members[memberId] = { id: memberId, pseudo, tokenHash: hash(token), joinedAt: Date.now() };
  return { groupId: group.id, memberId, token, name: group.name, code: group.code };
}

export function createGroup(state, body, rand = randomBytes) {
  const name = text(body?.name, LIMITS.name, "Nom du groupe");
  const pseudo = text(body?.pseudo, LIMITS.pseudo, "Pseudo");
  if (Object.keys(state.groups).length >= LIMITS.groups) fail(503, "Trop de groupes sur ce serveur.");
  let code;
  do code = [...rand(6)].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
  while (Object.values(state.groups).some((g) => g.code === code));
  const group = { id: id(rand), name, code, members: {}, predictions: {} };
  state.groups[group.id] = group;
  return addMember(group, pseudo, rand);
}

export function joinGroup(state, body, rand = randomBytes) {
  const code = text(body?.code, 6, "Code").toUpperCase();
  const pseudo = text(body?.pseudo, LIMITS.pseudo, "Pseudo");
  const group = Object.values(state.groups).find((g) => g.code === code);
  if (!group) fail(404, "Aucun groupe avec ce code.");
  return addMember(group, pseudo, rand);
}

// En-tête « Authorization: Bearer memberId.token ».
export function authenticate(state, groupId, header) {
  const group = state.groups[groupId];
  const [memberId, token] = (header ?? "").replace(/^Bearer /, "").split(".");
  const member = group?.members[memberId];
  const ok =
    member && token && timingSafeEqual(Buffer.from(hash(token)), Buffer.from(member.tokenHash));
  if (!ok) fail(401, "Accès refusé à ce groupe.");
  return { group, member };
}

export function setPrediction(state, { groupId, memberId, event, body, driverIds, now = Date.now() }) {
  const group = state.groups[groupId];
  if (!event) fail(404, "Grand Prix inconnu.");
  if (now >= lockTime(event)) fail(409, "Pronostics fermés pour ce Grand Prix.");
  const pick = Object.fromEntries(SLOTS.map((k) => [k, body?.[k]]));
  if (SLOTS.some((k) => !driverIds.includes(pick[k]))) fail(400, "Pilote inconnu.");
  if (new Set([pick.p1, pick.p2, pick.p3]).size !== 3) fail(400, "Trois pilotes différents sur le podium.");
  group.predictions[event.id] ??= {};
  group.predictions[event.id][memberId] = { ...pick, at: now };
}

// Points d'un prono, ou null si les résultats ne sont pas encore connus.
export function score(pick, results) {
  const podium = (results.race ?? []).slice(0, 3).map((r) => r.driverId);
  const pole = results.qualifying?.[0]?.driverId;
  if (podium.length < 3) return null;
  let points = pick.pole === pole ? POINTS.pole : 0;
  ["p1", "p2", "p3"].forEach((slot, i) => {
    if (pick[slot] === podium[i]) points += POINTS.exact;
    else if (podium.includes(pick[slot])) points += POINTS.podium;
  });
  return points;
}

// Ce que voit un membre : ses pronos, ceux des autres seulement une fois
// fermés, et le classement. resultsFor(eventId) -> { race, qualifying } | undefined.
export function view(state, groupId, memberId, { events, resultsFor, now = Date.now() }) {
  const group = state.groups[groupId];
  const pseudo = (mid) => group.members[mid]?.pseudo ?? "Ancien membre";
  const totals = Object.fromEntries(Object.keys(group.members).map((m) => [m, 0]));
  const rounds = Object.entries(group.predictions).map(([eventId, picks]) => {
    const event = events.find((e) => e.id === eventId);
    const locked = !event || now >= lockTime(event);
    const results = resultsFor(eventId);
    return {
      eventId,
      name: event?.name ?? eventId,
      locked,
      picks: Object.entries(picks)
        .filter(([mid]) => locked || mid === memberId)
        .map(([mid, pick]) => {
          const points = locked && results ? score(pick, results) : null;
          if (points !== null && mid in totals) totals[mid] += points;
          return { pseudo: pseudo(mid), mine: mid === memberId, pick, points };
        }),
    };
  });
  return {
    name: group.name,
    code: group.code,
    me: pseudo(memberId),
    rounds,
    leaderboard: Object.entries(totals)
      .map(([mid, points]) => ({ pseudo: pseudo(mid), points, mine: mid === memberId }))
      .sort((a, b) => b.points - a.points || a.pseudo.localeCompare(b.pseudo)),
  };
}
