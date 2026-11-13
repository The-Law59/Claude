// Réinitialise le mot de passe d'un joueur (serveur arrêté, sinon il
// réécrit data/game.json) : node scripts/reset-password.mjs <pseudo>
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { resetPassword } from "../src/accounts.mjs";

const file = join(import.meta.dirname, "..", "data", "game.json");
const pseudo = process.argv[2];
if (!pseudo) {
  console.error("Usage : node scripts/reset-password.mjs <pseudo>");
  process.exit(1);
}
const state = JSON.parse(await readFile(file, "utf8"));
const password = randomBytes(6).toString("base64url");
await resetPassword(state, pseudo, password);
await writeFile(file, JSON.stringify(state));
console.log(`Nouveau mot de passe de ${pseudo} : ${password}`);
