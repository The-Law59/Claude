import test from "node:test";
import assert from "node:assert/strict";
import { clientIp, parseTrusted, adminPseudoTaken, failureCounter } from "../src/securite.mjs";
import * as accounts from "../src/accounts.mjs";

const req = (remote, xff) => ({ socket: { remoteAddress: remote }, headers: xff ? { "x-forwarded-for": xff } : {} });

test("IP : sans proxy de confiance, l'en-tête X-Forwarded-For est ignoré", () => {
  assert.equal(clientIp(req("203.0.113.9", "6.6.6.6"), []), "203.0.113.9");
});

test("IP : derrière le proxy, on prend la valeur ajoutée par le proxy, pas celle du visiteur", () => {
  const trusted = parseTrusted("192.168.1.97");
  assert.equal(clientIp(req("::ffff:192.168.1.97", "6.6.6.6, 203.0.113.9"), trusted), "203.0.113.9");
  assert.equal(clientIp(req("192.168.1.97", "203.0.113.9"), trusted), "203.0.113.9");
  assert.equal(clientIp(req("192.168.1.97"), trusted), "192.168.1.97");
});

test("pseudos admins : réservés, sauf pour l'admin qui les porte déjà", () => {
  const admins = ["quentin", "lucas"];
  assert.equal(adminPseudoTaken(admins, "Lucas"), true, "personne ne peut créer « Lucas »");
  assert.equal(adminPseudoTaken(admins, " quentin "), true);
  assert.equal(adminPseudoTaken(admins, "Bob"), false);
  assert.equal(adminPseudoTaken(admins, "QUENTIN", { pseudo: "Quentin" }), false, "changer sa casse");
  assert.equal(adminPseudoTaken(admins, "Lucas", { pseudo: "Bob" }), true, "pas de renommage en admin");
});

test("compteur d'échecs : bloque après le maximum, oublie après la fenêtre", () => {
  const c = failureCounter(3, 1000);
  for (let i = 0; i < 3; i++) c.fail("ip", 0);
  assert.equal(c.blocked("ip", 10), true);
  assert.equal(c.blocked("autre", 10), false);
  assert.equal(c.blocked("ip", 2000), false);
});

test("connexion : un inconnu ne peut pas bloquer le compte d'un autre", async () => {
  const state = { users: {}, sessions: {} };
  await accounts.register(state, { pseudo: "Alice", password: "motdepasse-alice" });
  const failures = new Map();
  for (let i = 0; i < 8; i++)
    await assert.rejects(accounts.login(state, { pseudo: "Alice", password: "faux" }, { failures, ip: "6.6.6.6" }));
  await assert.rejects(
    accounts.login(state, { pseudo: "Alice", password: "motdepasse-alice" }, { failures, ip: "6.6.6.6" }),
    /Trop d'essais/,
    "l'attaquant est bloqué",
  );
  const ok = await accounts.login(state, { pseudo: "Alice", password: "motdepasse-alice" }, { failures, ip: "198.51.100.4" });
  assert.equal(ok.user.pseudo, "Alice", "Alice se connecte depuis chez elle");
});
