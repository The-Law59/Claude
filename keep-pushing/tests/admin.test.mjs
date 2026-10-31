import { test } from "node:test";
import assert from "node:assert/strict";
import { exportCsv, stats, toCsv } from "../src/admin.mjs";
import { health, rateLimiter, recordError } from "../src/monitor.mjs";

const DAY = 86400000;
const NOW = Date.parse("2026-10-21T12:00:00Z");

test("Statistiques admin : actifs, inscriptions par semaine, paris, forum", () => {
  const state = {
    users: {
      a: {
        id: "a",
        pseudo: "Quentin",
        friends: ["b"],
        createdAt: NOW - 40 * DAY,
        lastSeen: NOW - DAY,
      },
      b: {
        id: "b",
        pseudo: "Lucas",
        friends: ["a"],
        createdAt: NOW - 3 * DAY,
        lastSeen: NOW - 10 * DAY,
      },
      c: { id: "c", pseudo: "Max", friends: [], createdAt: NOW - 60 * DAY },
    },
    bets: { "f1-2026-17": { a: {}, b: {} }, "f1-2026-18": { a: {} } },
    forum: {
      topics: {
        t: {
          posts: [
            { at: NOW - DAY, reports: ["b"] },
            { at: NOW - 9 * DAY, reports: [] },
          ],
        },
      },
    },
    leagues: { l: { members: ["a", "b"], messages: [{ at: NOW - DAY }] } },
    feedback: [{ rating: 5 }, { rating: 4 }],
    errors: [
      { count: 3, last: NOW - 3600000 },
      { count: 2, last: NOW - 3 * DAY },
    ],
  };
  const events = [
    { id: "f1-2026-17", name: "Singapore", round: 17 },
    { id: "f1-2026-18", name: "Austin", round: 18 },
    { id: "f1-2026-19", name: "Mexico", round: 19 },
  ];
  const s = stats(state, { events, now: NOW });
  assert.deepEqual(s.players, { total: 3, active7: 1, active30: 2, new7: 1 });
  assert.equal(s.signups.length, 8);
  assert.deepEqual(s.signups.slice(-2), [
    { week: "2026-10-12", count: 1 },
    { week: "2026-10-19", count: 0 },
  ]); // Lucas : dimanche 18
  assert.deepEqual(
    s.bets.map((b) => [b.name, b.players]),
    [
      ["Singapore", 2],
      ["Austin", 1],
    ],
  );
  assert.deepEqual(s.forum, { topics: 1, posts: 2, posts7: 1, reported: 1 });
  assert.deepEqual(s.leagues, { count: 1, members: 2, messages7: 1 });
  assert.deepEqual(s.feedback, { count: 2, average: 4.5 });
  assert.deepEqual(s.errors, { total: 2, last24h: 3 });
});

test("Exports CSV : séparateur ; et guillemets échappés", () => {
  assert.equal(
    toCsv(
      ["a", "b"],
      [
        ["x;y", 'il a dit "oui"'],
        [1, null],
      ],
    ),
    'a;b\n"x;y";"il a dit ""oui"""\n1;',
  );
  const state = {
    users: { a: { id: "a", pseudo: "Quentin", friends: [], createdAt: NOW, lastSeen: NOW } },
    bets: { "f1-2026-18": { a: { quali: ["d1", "d2"], joker: true, at: NOW } } },
    feedback: [
      { userId: null, rating: 4, likes: ["pronos"], improve: "Plus de stats", ideas: "", at: NOW },
    ],
  };
  const players = exportCsv(state, "players", { points: () => 42 }).split("\n");
  assert.equal(players[0], "pseudo;inscrit le;dernière visite;amis;ligues;GP pariés;points saison");
  assert.equal(players[1], "Quentin;2026-10-21 12:00;2026-10-21 12:00;0;0;1;42");
  assert.match(exportCsv(state, "bets"), /f1-2026-18;Quentin;oui;d1 d2;/);
  assert.match(exportCsv(state, "feedback"), /Compte supprimé;4;pronos;Plus de stats/);
  assert.equal(exportCsv(state, "inconnu"), null);
});

test("Erreurs : regroupées par signature, première occurrence signalée", () => {
  const state = {};
  const e = {
    source: "app",
    message: "TypeError: x is undefined\n  at …",
    where: "/pronos",
    platform: "android",
  };
  assert.equal(recordError(state, e, 1).fresh, true);
  assert.equal(recordError(state, e, 2).fresh, false);
  recordError(state, { ...e, where: "/forum" }, 3);
  assert.deepEqual(
    state.errors.map((x) => [x.where, x.count]),
    [
      ["/forum", 1],
      ["/pronos", 2],
    ],
  );
  assert.equal(recordError(state, { message: "x".repeat(5000) }, 4).entry.message.length, 300);
});

test("Limite de rapports et santé du serveur", () => {
  const allow = rateLimiter(2, 1000);
  assert.deepEqual(
    [allow("ip", 0), allow("ip", 1), allow("ip", 2), allow("autre", 2), allow("ip", 1500)],
    [true, true, false, true, true],
  );
  const ok = health({
    startedAt: 0,
    version: "0.2.0",
    season: {},
    news: [1, 2],
    saveError: null,
    now: 5000,
  });
  assert.deepEqual(ok, {
    ok: true,
    version: "0.2.0",
    uptime: 5,
    checks: { season: "ok", news: "2 articles", save: "ok" },
  });
  assert.equal(
    health({ startedAt: 0, season: null, news: null, saveError: "disque plein" }).ok,
    false,
  );
});

test("Gestion admin : joueurs, prono saisi à la place d'un joueur, erreurs réglées", async () => {
  const { players, betsOf, setBetFor, resolveErrors } = await import("../src/admin.mjs");
  const { removeUser } = await import("../src/account.mjs");
  const state = {
    users: {
      a: { id: "a", pseudo: "Quentin", createdAt: 1, lastSeen: 50, friends: ["b"] },
      b: { id: "b", pseudo: "Lucas", createdAt: 2, lastSeen: 90, friends: ["a"] },
    },
    sessions: { h: { userId: "b" } },
    leagues: {},
    bets: { gp: { a: { quali: ["d1"] } } },
    errors: [{ signature: "app|x|y" }, { signature: "server|z|" }],
  };
  const list = players(state, {
    points: (id) => (id === "a" ? 12 : 0),
    isAdmin: (u) => u.id === "a",
  });
  assert.deepEqual(
    list.map((p) => [p.pseudo, p.bets, p.points, p.admin]),
    [
      ["Lucas", 0, 0, false],
      ["Quentin", 1, 12, true],
    ],
  );
  const driverIds = Array.from({ length: 12 }, (_, i) => `d${i}`);
  const ten = driverIds.slice(0, 10);
  assert.throws(
    () =>
      setBetFor(
        state,
        { eventId: "gp", userId: "b", part: "quali", ids: ten.slice(0, 9) },
        { driverIds },
      ),
    /10 pilotes/,
  );
  assert.throws(
    () =>
      setBetFor(
        state,
        { eventId: "gp", userId: "b", part: "quali", ids: [...ten.slice(0, 9), "d0"] },
        { driverIds },
      ),
    /double/,
  );
  assert.throws(
    () => setBetFor(state, { eventId: "gp", userId: "z", part: "quali", ids: ten }, { driverIds }),
    /introuvable/,
  );
  setBetFor(
    state,
    { eventId: "gp", userId: "b", part: "quali", ids: ten, by: "a" },
    { driverIds, now: 5 },
  );
  const rows = betsOf(state, "gp");
  assert.deepEqual(rows.find((r) => r.id === "b").byAdmin, ["quali"]);
  assert.deepEqual(rows.find((r) => r.id === "b").bet.quali, ten);
  assert.equal(resolveErrors(state, "app|x|y"), 1);
  assert.equal(resolveErrors(state, null), 1);
  assert.deepEqual(state.errors, []);
  removeUser(state, "b");
  assert.equal(state.users.b, undefined);
  assert.deepEqual(state.users.a.friends, []);
  assert.deepEqual(state.sessions, {});
  assert.equal(state.bets.gp.b, undefined);
});
