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
