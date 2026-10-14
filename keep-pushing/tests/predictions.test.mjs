import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticate,
  createGroup,
  joinGroup,
  lockTime,
  score,
  setPrediction,
  view,
} from "../src/predictions.mjs";

const event = {
  id: "f1-2026-18",
  name: "United States Grand Prix",
  sessions: [
    { type: "FirstPractice", startsAt: "2026-10-23T17:30:00Z" },
    { type: "Qualifying", startsAt: "2026-10-24T21:00:00Z" },
    { type: "Race", startsAt: "2026-10-25T20:00:00Z" },
  ],
};
const before = Date.parse("2026-10-24T20:00:00Z");
const after = Date.parse("2026-10-26T00:00:00Z");
const drivers = ["driver-a", "driver-b", "driver-c", "driver-d"];
const pick = { pole: "driver-a", p1: "driver-a", p2: "driver-b", p3: "driver-c" };
const results = {
  race: ["driver-a", "driver-c", "driver-b"].map((driverId, i) => ({ position: i + 1, driverId })),
  qualifying: [{ position: 1, driverId: "driver-d" }],
};

test("Création, invitation par code, authentification par jeton", () => {
  const state = { groups: {} };
  const alice = createGroup(state, { name: " Les Tifosi ", pseudo: "Alice" });
  assert.match(alice.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(alice.name, "Les Tifosi");
  const bob = joinGroup(state, { code: alice.code.toLowerCase(), pseudo: "Bob" });
  assert.equal(bob.groupId, alice.groupId);
  assert.equal(authenticate(state, alice.groupId, `Bearer ${bob.memberId}.${bob.token}`).member.pseudo, "Bob");
  assert.throws(() => authenticate(state, alice.groupId, `Bearer ${bob.memberId}.mauvais`), { status: 401 });
  assert.throws(() => joinGroup(state, { code: alice.code, pseudo: "alice" }), { status: 409 });
  assert.throws(() => joinGroup(state, { code: "ZZZZZZ", pseudo: "Carl" }), { status: 404 });
  assert.throws(() => createGroup(state, { name: "", pseudo: "X" }), { status: 400 });
  // Le jeton n'est jamais stocké en clair.
  assert(!JSON.stringify(state).includes(bob.token));
});

test("Pronos : fermés aux qualifications, pilotes valides et podium sans doublon", () => {
  const state = { groups: {} };
  const a = createGroup(state, { name: "G", pseudo: "Alice" });
  assert.equal(lockTime(event), Date.parse("2026-10-24T21:00:00Z"));
  const args = { groupId: a.groupId, memberId: a.memberId, event, driverIds: drivers };
  setPrediction(state, { ...args, body: pick, now: before });
  assert.throws(() => setPrediction(state, { ...args, body: pick, now: after }), { status: 409 });
  assert.throws(() => setPrediction(state, { ...args, body: { ...pick, p3: "driver-a" }, now: before }), { status: 400 });
  assert.throws(() => setPrediction(state, { ...args, body: { ...pick, pole: "inconnu" }, now: before }), { status: 400 });
});

test("Barème : pole 3, place exacte 5, sur le podium 2", () => {
  // Pole ratée (d), P1 exact (a), b et c sur le podium mais inversés.
  assert.equal(score(pick, results), 0 + 5 + 2 + 2);
  assert.equal(score({ ...pick, pole: "driver-d", p2: "driver-c", p3: "driver-b" }, results), 3 + 15);
  assert.equal(score(pick, { race: [], qualifying: [] }), null);
});

test("Vue : pronos des autres cachés avant fermeture, classement après", () => {
  const state = { groups: {} };
  const a = createGroup(state, { name: "G", pseudo: "Alice" });
  const b = joinGroup(state, { code: a.code, pseudo: "Bob" });
  for (const m of [a, b])
    setPrediction(state, { groupId: a.groupId, memberId: m.memberId, event, body: pick, driverIds: drivers, now: before });
  const opts = { events: [event], resultsFor: () => results };
  const open = view(state, a.groupId, a.memberId, { ...opts, now: before });
  assert.deepEqual(open.rounds[0].picks.map((p) => p.pseudo), ["Alice"]);
  assert.equal(open.rounds[0].picks[0].points, null);
  const closed = view(state, a.groupId, a.memberId, { ...opts, now: after });
  assert.deepEqual(closed.rounds[0].picks.map((p) => p.pseudo), ["Alice", "Bob"]);
  assert.deepEqual(closed.leaderboard.map((l) => [l.pseudo, l.points]), [["Alice", 9], ["Bob", 9]]);
  assert.equal(closed.leaderboard[0].mine, true);
});
