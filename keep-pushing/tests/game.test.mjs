import { test } from "node:test";
import assert from "node:assert/strict";
import * as accounts from "../src/accounts.mjs";
import { mergeBet, scoreBet, scoreList, visibleBet, leaderboard, partsOf, POINTS } from "../src/bets.mjs";

const fresh = () => ({ users: {}, sessions: {}, bets: {} });
const rejects = (p, status) => assert.rejects(p, (e) => e.status === status);
const throws = (fn, status) => assert.throws(fn, (e) => e.status === status);

test("Inscription, connexion, session et déconnexion", async () => {
  const state = fresh();
  const { token, user } = await accounts.register(state, { pseudo: "Quentin", password: "monsecret1" });
  assert.equal(user.pseudo, "Quentin");
  assert.ok(!JSON.stringify(state).includes("monsecret1"));
  assert.ok(!JSON.stringify(state).includes(token)); // jeton stocké haché
  assert.equal(accounts.authenticate(state, `Bearer ${token}`).id, user.id);
  await rejects(accounts.register(state, { pseudo: "quentin", password: "autrechose" }), 409);
  await rejects(accounts.register(state, { pseudo: "Q", password: "monsecret1" }), 400);
  await rejects(accounts.register(state, { pseudo: "Léa", password: "court" }), 400);

  const failures = new Map();
  await rejects(accounts.login(state, { pseudo: "QUENTIN", password: "mauvais!!" }, { failures }), 401);
  const again = await accounts.login(state, { pseudo: "QUENTIN", password: "monsecret1" }, { failures });
  assert.equal(again.user.id, user.id);
  accounts.logout(state, `Bearer ${token}`);
  throws(() => accounts.authenticate(state, `Bearer ${token}`), 401);
  assert.equal(accounts.authenticate(state, `Bearer ${again.token}`).id, user.id);
});

test("Connexion bloquée après trop d'essais", async () => {
  const state = fresh();
  await accounts.register(state, { pseudo: "Quentin", password: "monsecret1" });
  const failures = new Map();
  for (let i = 0; i < 8; i++)
    await rejects(accounts.login(state, { pseudo: "Quentin", password: "nonnonnon" }, { failures }), 401);
  await rejects(accounts.login(state, { pseudo: "Quentin", password: "monsecret1" }, { failures }), 429);
  const later = Date.now() + 16 * 60 * 1000;
  await accounts.login(state, { pseudo: "Quentin", password: "monsecret1" }, { failures, now: later });
});

test("Mot de passe réinitialisé : anciennes sessions fermées", async () => {
  const state = fresh();
  const { token } = await accounts.register(state, { pseudo: "Quentin", password: "monsecret1" });
  await accounts.resetPassword(state, "quentin", "nouveau123");
  throws(() => accounts.authenticate(state, `Bearer ${token}`), 401);
  await accounts.login(state, { pseudo: "Quentin", password: "nouveau123" }, { failures: new Map() });
});

test("Amis : demande, acceptation, retrait", async () => {
  const state = fresh();
  const reg = async (pseudo) => accounts.authenticate(state, `Bearer ${(await accounts.register(state, { pseudo, password: "motdepasse" })).token}`);
  const [a, b] = [await reg("Quentin"), await reg("Lucas")];
  accounts.addFriend(state, a, "lucas");
  assert.deepEqual(accounts.friendsView(state, a).outgoing.map((u) => u.pseudo), ["Lucas"]);
  assert.deepEqual(accounts.friendsView(state, b).incoming.map((u) => u.pseudo), ["Quentin"]);
  assert.deepEqual(accounts.friendIds(state, a), []);
  accounts.addFriend(state, b, "Quentin"); // accepte
  assert.deepEqual(accounts.friendsView(state, a).friends.map((u) => u.pseudo), ["Lucas"]);
  assert.deepEqual(accounts.friendIds(state, b), [a.id]);
  throws(() => accounts.addFriend(state, a, "Quentin"), 400);
  throws(() => accounts.addFriend(state, a, "Personne"), 404);
  accounts.removeFriend(state, a, b.id);
  assert.deepEqual(accounts.friendsView(state, b), { me: { id: b.id, pseudo: "Lucas" }, friends: [], outgoing: [], incoming: [] });
});

const H = 3600000;
const T = Date.parse("2026-05-02T12:00:00Z");
const at = (h) => new Date(T + h * H).toISOString();
const sprintWeekend = {
  id: "f1-2026-6",
  sessions: [
    { type: "FirstPractice", startsAt: at(-24) },
    { type: "SprintQualifying", startsAt: at(-20) },
    { type: "Sprint", startsAt: at(0) },
    { type: "Qualifying", startsAt: at(4) },
    { type: "Race", startsAt: at(24) },
  ],
};
const ids = Array.from({ length: 22 }, (_, i) => `d${i + 1}`);
const top = (n) => ids.slice(0, n);

test("Paris : parties du week-end, fermeture au départ de chaque session", () => {
  assert.deepEqual(partsOf(sprintWeekend), ["quali", "sprint", "race"]);
  const before = mergeBet(sprintWeekend, undefined, { quali: top(10), sprint: top(8), race: top(10), fastest: "d1", dnf: 2 }, ids, T - H);
  assert.deepEqual(before.sprint, top(8));
  // Après le départ du sprint : le sprint est figé, le reste modifiable.
  const after = mergeBet(sprintWeekend, before, { sprint: ids.slice(1, 9), quali: ids.slice(1, 11), dnf: 3 }, ids, T + H);
  assert.deepEqual(after.sprint, top(8));
  assert.deepEqual(after.quali, ids.slice(1, 11));
  assert.equal(after.dnf, 3);
  throws(() => mergeBet(sprintWeekend, {}, { race: [...top(9), "d1"] }, ids, T), 400); // doublon
  throws(() => mergeBet(sprintWeekend, {}, { race: top(9) }, ids, T), 400); // incomplet
  throws(() => mergeBet(sprintWeekend, {}, { fastest: "inconnu" }, ids, T), 400);
  // Les autres ne voient que les parties fermées.
  assert.deepEqual(Object.keys(visibleBet(sprintWeekend, after, T + H)), ["sprint"]);
});

test("Barème du tableau : exact, à une place près, dans le top, bonus parfait", () => {
  const rows = ids.map((driverId, i) => ({ driverId, position: i + 1 }));
  assert.deepEqual(scoreList(top(10), rows, 10), { slots: Array(10).fill(10), bonus: POINTS.perfect, total: 120 });
  // d2 et d1 inversés (5+5), d12 en 3e alors qu'il finit 12e (0), d4 en 10e (2)
  const pick = ["d2", "d1", "d12", "d5", "d6", "d7", "d8", "d9", "d10", "d4"];
  const s = scoreList(pick, rows, 10);
  assert.deepEqual(s.slots, [5, 5, 0, 5, 5, 5, 5, 5, 5, 2]);
  assert.equal(s.total, 42);
});

test("Meilleur tour, abandons et total ; résultats absents = null", () => {
  const race = ids.map((driverId, i) => ({
    driverId,
    position: i + 1,
    positionText: i >= 19 ? "W" : i >= 16 ? "R" : String(i + 1),
    fastestLap: driverId === "d3",
  }));
  const bet = { race: top(10), fastest: "d3", dnf: 2 };
  const s = scoreBet(bet, { Race: race });
  assert.equal(s.race.total, 120);
  assert.equal(s.fastest, POINTS.fastest);
  assert.equal(s.dnf, POINTS.dnfClose); // 3 abandons (R), forfaits exclus
  assert.equal(s.quali, null);
  assert.equal(s.total, 120 + POINTS.fastest + POINTS.dnfClose);
  assert.deepEqual(scoreBet(bet, {}), { total: 0, quali: null, sprint: null, race: null, fastest: null, dnf: null });

  const board = leaderboard(["u1", "u2"], { e1: { u1: bet }, e2: { u1: bet } }, (id) => (id === "e1" ? { Race: race } : undefined));
  assert.deepEqual(board, [
    { id: "u1", points: s.total, weekends: 1 },
    { id: "u2", points: 0, weekends: 0 },
  ]);
});
