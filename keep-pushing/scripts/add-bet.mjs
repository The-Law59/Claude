// Enregistre le prono d'un joueur à sa place, par exemple quand il a oublié
// de valider avant la fermeture et a donné sa liste à un admin
// (serveur arrêté, sinon il réécrit data/game.json) :
//   node scripts/add-bet.mjs <pseudo> <gp> <quali|sprint|race> "Nom1,Nom2,…"
// <gp> : id du GP (f1-2026-19) ou son numéro de manche (19).
// Les pilotes s'écrivent par leur nom de famille, sans se soucier des accents.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PARTS } from "../src/bets.mjs";
import { loadSeason } from "../src/jolpica.mjs";
import { matchDriver } from "../src/practice.mjs";

const file = join(import.meta.dirname, "..", "data", "game.json");
const [pseudo, gp, part, names] = process.argv.slice(2);
const stop = (message) => {
  console.error(message);
  process.exit(1);
};
if (!pseudo || !gp || !PARTS[part] || !names)
  stop('Usage : node scripts/add-bet.mjs <pseudo> <gp> <quali|sprint|race> "Nom1,Nom2,…"');

const state = JSON.parse(await readFile(file, "utf8"));
const user = Object.values(state.users).find(
  (u) => u.pseudo.toLowerCase() === pseudo.toLowerCase(),
);
if (!user) stop(`Joueur introuvable : ${pseudo}`);
const season = await loadSeason();
const event = season.events.find((e) => e.id === gp || String(e.round) === gp);
if (!event) stop(`GP introuvable : ${gp}`);

const list = names
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);
const ids = list.map((n) => matchDriver(n, season.drivers)?.id ?? stop(`Pilote inconnu : ${n}`));
if (ids.length !== PARTS[part].size)
  stop(`Il faut ${PARTS[part].size} pilotes, pas ${ids.length}.`);
if (new Set(ids).size !== ids.length) stop("Un pilote est en double.");

state.bets ??= {};
state.bets[event.id] ??= {};
(state.bets[event.id][user.id] ??= {})[part] = ids;
// Trace des pronos saisis par un admin.
(state.adminBets ??= []).push({ userId: user.id, eventId: event.id, part, ids, at: Date.now() });
await writeFile(file, JSON.stringify(state));
console.log(`${user.pseudo} · ${event.name} · ${part} :`);
ids.forEach((id, i) => console.log(`  ${i + 1}. ${season.drivers.find((d) => d.id === id).name}`));
