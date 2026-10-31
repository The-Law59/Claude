import { test } from "node:test";
import assert from "node:assert/strict";
import * as accounts from "../src/accounts.mjs";
import {
  mergeBet, scoreBet, scoreList, visibleBet, leaderboard, partsOf, perRound, history,
  questionOf, answerOf, closesAt, opensAt, mondayAfter, qualiReference, POINTS,
} from "../src/bets.mjs";
import { createLeague, joinLeague, leaveLeague, leaguesOf, postMessage, deleteMessage, messagesOf } from "../src/leagues.mjs";
import { championsCloseAt, mergeChampions, scoreChampions, standingsBySeason, backupName, backupsToDelete } from "../src/seasons.mjs";

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

test("Paris : parties du week-end, ouverture et fermeture de chaque partie", () => {
  assert.deepEqual(partsOf(sprintWeekend), ["quali", "sprint", "race"]);
  // Avant les qualifs : course, meilleur tour et abandons pas encore ouverts.
  const before = mergeBet(sprintWeekend, undefined, { quali: top(10), sprint: top(8), race: top(10), fastest: "d1", dnf: 2 }, ids, T - H);
  assert.deepEqual(before.sprint, top(8));
  assert.deepEqual([before.race, before.fastest, before.dnf], [undefined, undefined, undefined]);
  // 1 h après le début des qualifs : qualifs et sprint figés, course ouverte.
  const after = mergeBet(sprintWeekend, before, { sprint: ids.slice(1, 9), quali: ids.slice(1, 11), race: top(10), dnf: 3 }, ids, T + 5 * H);
  assert.deepEqual(after.sprint, top(8));
  assert.deepEqual(after.quali, top(10));
  assert.deepEqual(after.race, top(10));
  assert.equal(after.dnf, 3);
  const later = T + 6 * H;
  throws(() => mergeBet(sprintWeekend, {}, { race: [...top(9), "d1"] }, ids, later), 400); // doublon
  throws(() => mergeBet(sprintWeekend, {}, { race: top(9) }, ids, later), 400); // incomplet
  throws(() => mergeBet(sprintWeekend, {}, { fastest: "inconnu" }, ids, later), 400);
  // Les autres ne voient que les parties fermées.
  assert.deepEqual(Object.keys(visibleBet(sprintWeekend, after, T + 5 * H)).sort(), ["quali", "sprint"]);
  assert.equal(answerOf("pole", []), null);
});

test("Ouverture des qualifs le lundi qui suit le GP précédent", () => {
  const prevRace = Date.parse("2026-04-26T13:00:00Z"); // dimanche
  const monday = Date.parse("2026-04-27T00:00:00Z");
  assert.equal(mondayAfter(prevRace), monday);
  assert.equal(mondayAfter(Date.parse("2026-04-25T20:00:00Z")), monday); // course un samedi
  assert.equal(opensAt(sprintWeekend, "quali", prevRace), monday);
  assert.equal(opensAt(sprintWeekend, "joker", prevRace), monday);
  assert.equal(opensAt(sprintWeekend, "race", prevRace), T + 5 * H); // qualifs + 1 h
  assert.equal(opensAt(sprintWeekend, "quali", null), 0); // premier GP : toujours ouvert
  // Dimanche soir : trop tôt pour le GP suivant.
  const early = mergeBet(sprintWeekend, {}, { quali: top(10) }, ids, monday - H, prevRace);
  assert.equal(early.quali, undefined);
  const ok = mergeBet(sprintWeekend, {}, { quali: top(10) }, ids, monday + H, prevRace);
  assert.deepEqual(ok.quali, top(10));
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
  assert.deepEqual(scoreBet(bet, {}), {
    total: 0, quali: null, sprint: null, race: null, fastest: null, dnf: null, answer: null, joker: false,
  });
  // Joker : tout le week-end compte double.
  assert.equal(scoreBet({ ...bet, joker: true }, { Race: race }).total, s.total * 2);

  const rounds = perRound({ e1: { u1: bet }, e2: { u1: bet } }, (id) => (id === "e1" ? { Race: race } : undefined));
  assert.deepEqual(rounds, { e1: { u1: s.total } });
  assert.deepEqual(leaderboard(["u1", "u2"], rounds), [
    { id: "u1", points: s.total, weekends: 1 },
    { id: "u2", points: 0, weekends: 0 },
  ]);});

test("Question du week-end : choisie par manche, réponse tirée des résultats", () => {
  assert.equal(questionOf({ round: 0 }).id, "pole");
  assert.notEqual(questionOf({ round: 1 }).id, questionOf({ round: 2 }).id);
  const row = (driverId, position, grid, team, value = "1:30:00") => ({ driverId, position, grid, team, value });
  const race = [row("a", 1, 3, "McLaren"), row("b", 2, 12, "Ferrari", "+4.512"), row("c", 3, 1, "Mercedes", "+1:02.000"), row("d", 4, 0, "Haas")];
  assert.equal(answerOf("pole", race), false);
  assert.equal(answerOf("comeback", race), true);
  assert.equal(answerOf("gap", race), false);
  assert.equal(answerOf("gap", [race[0], { ...race[1], value: "+1:00.100" }]), true);
  assert.equal(answerOf("gap", [race[0], { ...race[1], value: "Lapped" }]), true);
  assert.equal(answerOf("podium:Ferrari", race), true);
  assert.equal(answerOf("podium:Red Bull", race), false);
  assert.equal(answerOf("pole", []), null);
});

test("Réponse et joker : chacun dans sa fenêtre", () => {
  const ev = { ...sprintWeekend, round: 4 };
  // Avant les qualifs : joker oui, question pas encore.
  const bet = mergeBet(ev, {}, { answer: true, joker: true }, ids, T - 30 * H);
  assert.equal(bet.joker, true);
  assert.equal(bet.answer, undefined);
  assert.equal(closesAt(ev, "joker"), T); // départ du sprint, première partie pariée
  // Après les qualifs : question ouverte, joker figé.
  const later = mergeBet(ev, bet, { answer: false, joker: false }, ids, T + 5 * H);
  assert.deepEqual([later.answer, later.joker], [false, true]);
  assert.equal(later.question, questionOf(ev).id);
  throws(() => mergeBet(ev, {}, { answer: "peut-être" }, ids, T + 5 * H), 400);
});

test("Historique manche par manche : points, meilleur, place au cumul", () => {
  const rounds = { e1: { a: 30, b: 50 }, e3: { a: 60, b: 20 } };
  assert.deepEqual(history(["a", "b", "c"], rounds, ["e1", "e2", "e3"], "a"), [
    { eventId: "e1", points: 30, best: { id: "b", points: 50 }, total: 30, rank: 2 },
    { eventId: "e3", points: 60, best: { id: "a", points: 60 }, total: 90, rank: 1 },
  ]);
});

test("Ligues privées : création, code, adhésion, départ", () => {
  const state = { leagues: {} };
  const [a, b] = [{ id: "a" }, { id: "b" }];
  const l = createLeague(state, a, { name: "  Les   Tifosi " });
  assert.equal(l.name, "Les Tifosi");
  assert.match(l.code, /^[A-HJ-NP-Z2-9]{6}$/);
  joinLeague(state, b, { code: l.code.toLowerCase() });
  joinLeague(state, b, { code: l.code }); // déjà membre : sans effet
  assert.deepEqual(state.leagues[l.id].members, ["a", "b"]);
  throws(() => joinLeague(state, b, { code: "XXXXXX" }), 404);
  throws(() => createLeague(state, a, { name: "" }), 400);
  leaveLeague(state, a, l.id);
  assert.deepEqual(leaguesOf(state, a), []);
  leaveLeague(state, b, l.id);
  assert.deepEqual(state.leagues, {}); // vide : supprimée
});

test("Chat de ligue : membres seulement, rythme limité, modération", () => {
  const state = { leagues: {}, users: { a: { pseudo: "Quentin" }, b: { pseudo: "Lucas" }, c: { pseudo: "Max" } } };
  const [a, b, c] = ["a", "b", "c"].map((id) => ({ id }));
  const l = createLeague(state, a, { name: "Tifosi" });
  joinLeague(state, b, { code: l.code });
  postMessage(state, b, l.id, { text: "  Hülkenberg   vainqueur ? 😂 " }, { now: 1000 });
  throws(() => postMessage(state, b, l.id, { text: "encore" }, { now: 2000 }), 429);
  throws(() => postMessage(state, c, l.id, { text: "intrus" }, { now: 5000 }), 404);
  throws(() => postMessage(state, a, l.id, { text: "x".repeat(281) }, { now: 5000 }), 400);
  postMessage(state, a, l.id, { text: "Allez Ferrari" }, { now: 5000 });
  const view = messagesOf(state, b, l.id);
  assert.deepEqual(view.messages.map((m) => [m.pseudo, m.text, m.mine]), [
    ["Lucas", "Hülkenberg vainqueur ? 😂", true],
    ["Quentin", "Allez Ferrari", false],
  ]);
  throws(() => deleteMessage(state, b, l.id, view.messages[1].id), 403); // pas son message
  deleteMessage(state, a, l.id, view.messages[0].id); // le créateur modère
  assert.equal(messagesOf(state, a, l.id).messages.length, 1);
});

test("Pronos des champions : fermeture, validation, points", () => {
  const ev = (d) => ({ sessions: [{ startsAt: `2026-${d}T10:00:00Z` }] });
  const events = ["03-01", "04-01", "05-01", "06-01", "07-01", "08-01", "09-01", "10-01"].map(ev);
  const closes = championsCloseAt(events);
  assert.equal(closes, Date.parse("2026-05-01T10:00:00Z")); // 6e GP avant la fin
  const opts = { driverIds: ["d1", "d2"], teamIds: ["t1"], closes, now: closes - 1 };
  const bet = mergeChampions({}, { driver: "d1", team: "t1" }, opts);
  throws(() => mergeChampions(bet, { driver: "inconnu" }, opts), 400);
  throws(() => mergeChampions(bet, { driver: "d2" }, { ...opts, now: closes }), 409);
  assert.equal(scoreChampions(bet, { driver: "d1", team: "t1" }), 80);
  assert.equal(scoreChampions(bet, { driver: "d2", team: "t1" }), 30);
});

test("Palmarès par saison et rotation des sauvegardes", () => {
  const rounds = { "f1-2025-24": { a: 10, b: 30 }, "f1-2026-1": { a: 50 }, "champions-2026": { b: 80 } };
  assert.deepEqual(standingsBySeason(rounds), {
    2025: [{ id: "b", points: 30 }, { id: "a", points: 10 }],
    2026: [{ id: "b", points: 80 }, { id: "a", points: 50 }],
  });
  assert.equal(backupName(new Date("2026-10-16T08:00:00Z")), "game-2026-10-16.json");
  const names = Array.from({ length: 16 }, (_, i) => `game-2026-10-${String(i + 1).padStart(2, "0")}.json`);
  assert.deepEqual(backupsToDelete([...names, "autre.txt"]), ["game-2026-10-01.json", "game-2026-10-02.json"]);
});

test("Qualifs : provisoire sur le classement, puis grille officielle (pénalités)", () => {
  const quali = ["d1", "d2", "d3", "d4"].map((driverId, i) => ({ driverId, position: i + 1 }));
  // d1 pénalisé (5e sur la grille), d3 part des stands.
  const race = [
    { driverId: "d2", position: 1, grid: 1 },
    { driverId: "d4", position: 2, grid: 2 },
    { driverId: "d1", position: 3, grid: 3 },
    { driverId: "d3", position: 4, grid: 0 },
  ];
  assert.deepEqual(qualiReference({ Qualifying: quali }), { rows: quali, grid: false });
  const ref = qualiReference({ Qualifying: quali, Race: race });
  assert.equal(ref.grid, true);
  assert.deepEqual(ref.rows.map((r) => r.driverId), ["d2", "d4", "d1", "d3"]);
  const bet = { quali: ["d1", "d2", "d3", "d4", ...Array.from({ length: 6 }, (_, i) => `x${i}`)] };
  const before = scoreBet(bet, { Qualifying: quali });
  const after = scoreBet(bet, { Qualifying: quali, Race: race });
  assert.deepEqual(before.quali.slots.slice(0, 4), [10, 10, 10, 10]);
  assert.deepEqual(after.quali.slots.slice(0, 4), [2, 5, 5, 2]); // corrigé avec la grille
});
