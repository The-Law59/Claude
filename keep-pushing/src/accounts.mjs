// Comptes joueurs (pseudo + mot de passe) et liste d'amis. Fonctions sur un
// état JSON { users, sessions } ; server.mjs gère HTTP et sauvegarde.
// Mots de passe dérivés avec scrypt + sel, jetons de session stockés hachés.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { GameError, fail } from "./errors.mjs";

export { GameError };

const derive = promisify(scrypt);
const LIMITS = { users: 10000, friends: 200, sessions: 10 };
const PSEUDO = /^[\p{L}\p{N}_.-]{3,20}$/u;
const BLOCK = { failures: 8, ms: 15 * 60 * 1000 };

const sha = (s) => createHash("sha256").update(s).digest("hex");
const keyOf = (pseudo) => pseudo.toLowerCase();
const publicUser = (u) => ({ id: u.id, pseudo: u.pseudo });

function credentials(body) {
  const pseudo = typeof body?.pseudo === "string" ? body.pseudo.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  return { pseudo, password };
}

export async function hashPassword(password, salt) {
  return (await derive(password, salt, 64)).toString("hex");
}
export async function checkPassword(user, password) {
  const hash = await hashPassword(typeof password === "string" ? password : "", user.salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.hash, "hex"));
}
export const PSEUDO_RULE = PSEUDO;
export const sessionHash = sha;

function openSession(state, user, rand) {
  const token = rand(32).toString("base64url");
  state.sessions[sha(token)] = { userId: user.id, at: Date.now() };
  // Au-delà de N appareils, on oublie les plus anciens.
  const mine = Object.entries(state.sessions).filter(([, s]) => s.userId === user.id);
  mine
    .sort((a, b) => a[1].at - b[1].at)
    .slice(0, -LIMITS.sessions)
    .forEach(([h]) => delete state.sessions[h]);
  return { token, user: publicUser(user) };
}

export async function register(state, body, rand = randomBytes) {
  const { pseudo, password } = credentials(body);
  if (!PSEUDO.test(pseudo)) fail(400, "Pseudo : 3 à 20 lettres, chiffres, « _ », « - » ou « . ».");
  if (password.length < 8 || password.length > 100)
    fail(400, "Mot de passe : au moins 8 caractères.");
  if (Object.keys(state.users).length >= LIMITS.users)
    fail(503, "Inscriptions fermées sur ce serveur.");
  if (Object.values(state.users).some((u) => keyOf(u.pseudo) === keyOf(pseudo)))
    fail(409, "Ce pseudo est déjà pris.");
  const salt = rand(16).toString("hex");
  const user = {
    id: rand(9).toString("base64url"),
    pseudo,
    salt,
    hash: await hashPassword(password, salt),
    friends: [],
    createdAt: Date.now(),
  };
  state.users[user.id] = user;
  return openSession(state, user, rand);
}

// failures : Map en mémoire (pseudo -> { count, until }) contre les essais en rafale.
export async function login(state, body, { failures, now = Date.now(), rand = randomBytes }) {
  const { pseudo, password } = credentials(body);
  const key = keyOf(pseudo);
  const f = failures.get(key);
  if (f && f.until > now) fail(429, "Trop d'essais : réessayez dans 15 minutes.");
  const user = Object.values(state.users).find((u) => keyOf(u.pseudo) === key);
  const hash = await hashPassword(password, user?.salt ?? "absent");
  if (!user || !timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.hash, "hex"))) {
    const recent = f && now - f.first < BLOCK.ms;
    const count = (recent ? f.count : 0) + 1;
    if (failures.size > 10000) failures.clear();
    failures.set(key, {
      count,
      first: recent ? f.first : now,
      until: count >= BLOCK.failures ? now + BLOCK.ms : 0,
    });
    fail(401, "Pseudo ou mot de passe incorrect.");
  }
  failures.delete(key);
  return openSession(state, user, rand);
}

const bearer = (header) => (header ?? "").replace(/^Bearer /, "");

// En-tête « Authorization: Bearer <jeton> » -> utilisateur.
export function authenticate(state, header) {
  const token = bearer(header);
  const user = token && state.users[state.sessions[sha(token)]?.userId];
  if (!user) fail(401, "Session expirée : reconnectez-vous.");
  return user;
}

export function logout(state, header) {
  delete state.sessions[sha(bearer(header))];
}

// Réinitialisation par l'administrateur (scripts/reset-password.mjs).
export async function resetPassword(state, pseudo, password) {
  const user = Object.values(state.users).find((u) => keyOf(u.pseudo) === keyOf(pseudo));
  if (!user) fail(404, "Pseudo inconnu.");
  user.salt = randomBytes(16).toString("hex");
  user.hash = await hashPassword(password, user.salt);
  for (const [h, s] of Object.entries(state.sessions))
    if (s.userId === user.id) delete state.sessions[h];
}

// Amitié = ajout dans les deux sens. Ajouter quelqu'un qui vous a déjà
// ajouté accepte sa demande.
export function addFriend(state, user, pseudo) {
  const other = Object.values(state.users).find(
    (u) => keyOf(u.pseudo) === keyOf(String(pseudo ?? "").trim()),
  );
  if (!other) fail(404, "Aucun joueur avec ce pseudo.");
  if (other.id === user.id) fail(400, "C'est vous !");
  if (user.friends.length >= LIMITS.friends) fail(409, "Liste d'amis pleine.");
  if (!user.friends.includes(other.id)) user.friends.push(other.id);
}

export function removeFriend(state, user, otherId) {
  user.friends = user.friends.filter((id) => id !== otherId);
  const other = state.users[otherId];
  if (other) other.friends = other.friends.filter((id) => id !== user.id);
}

export const friendIds = (state, user) =>
  user.friends.filter((id) => state.users[id]?.friends.includes(user.id));

export function friendsView(state, user) {
  const pick = (ids) =>
    ids.map((id) => publicUser(state.users[id])).sort((a, b) => a.pseudo.localeCompare(b.pseudo));
  const mutual = friendIds(state, user);
  return {
    me: publicUser(user),
    friends: pick(mutual),
    // Demandes envoyées en attente, et reçues à accepter.
    outgoing: pick(user.friends.filter((id) => state.users[id] && !mutual.includes(id))),
    incoming: pick(
      Object.values(state.users)
        .filter((u) => u.friends.includes(user.id) && !user.friends.includes(u.id))
        .map((u) => u.id),
    ),
  };
}
