import test from "node:test";
import assert from "node:assert/strict";
import { articles, sessions, demoSeason } from "../src/data.mjs";
const RACE = sessions.at(-1).id,
  QUALI = sessions.at(-2).id;
import {
  defaults,
  restorePreferences,
  articleVisible,
  notificationAllowed,
  setProtected,
  protectWeekend,
  reminderPlan,
  focusEvents,
  setMine,
} from "../src/model.mjs";
test("Une session protégée masque son article même dans toute la F1", () => {
  const p = setProtected(defaults(), RACE, true);
  const a = articles.find((x) => x.id === "race-battle");
  assert.equal(articleVisible(a, p, false), false);
  assert.equal(notificationAllowed({ ...a, kind: "news" }, p), false);
  assert.equal(notificationAllowed({ ...a, kind: "result" }, p), false);
});
test("Débloquer les qualifications ne débloque pas la course", () => {
  const p = setProtected(
    protectWeekend(defaults(), sessions, true),
    QUALI,
    false,
  );
  assert(!p.protectedSessions.includes(QUALI));
  assert(p.protectedSessions.includes(RACE));
  assert(
    articleVisible(
      articles.find((x) => x.id === "pole"),
      p,
      false,
    ),
  );
});
test("Un article lié à plusieurs sessions reste protégé tant qu’une session l’est", () => {
  assert.equal(
    articleVisible(
      { ...articles[0], sessionIds: [RACE, QUALI] },
      setProtected(defaults(), RACE, true),
      false,
    ),
    false,
  );
});
test("Les rappels neutres restent autorisés en anti-spoil", () => {
  const p = { ...protectWeekend(defaults(), sessions, true), reminders: true };
  assert(notificationAllowed({ kind: "reminder", sessionIds: [RACE] }, p));
  assert.equal(reminderPlan(sessions, p, 0).length, 5);
  assert.equal(reminderPlan(sessions, p, Date.parse("2027-01-01")).length, 0);
});
test("Filtres favoris, rumeurs et importance sont indépendants", () => {
  const p = defaults();
  assert(
    !articleVisible(
      articles.find((x) => x.id === "factory"),
      p,
    ),
  );
  assert(
    articleVisible(
      articles.find((x) => x.id === "factory"),
      p,
      false,
    ),
  );
  assert(
    !articleVisible(
      articles.find((x) => x.id === "rumor"),
      p,
    ),
  );
  assert(!notificationAllowed({ ...articles[0], kind: "news" }, p));
  assert(
    notificationAllowed(
      { ...articles[0], kind: "news" },
      { ...p, frequency: "all" },
    ),
  );
});
test("Préférences corrompues ou ancien format : reprise sûre", () => {
  assert.deepEqual(restorePreferences("{oops", sessions), defaults());
  assert.deepEqual(restorePreferences('{"version":99}', sessions), defaults());
  const p = restorePreferences(
    JSON.stringify({ version: 2, protectedSessions: [RACE, "race"], reminderMinutes: -10 }),
    sessions,
  );
  assert.deepEqual(p.protectedSessions, [RACE]);
  assert.equal(p.reminderMinutes, 30);
});
test("Le plan de rappel applique le délai exact et désactivation", () => {
  const p = { ...defaults(), reminders: true, reminderMinutes: 10 };
  assert.equal(
    reminderPlan(sessions, p, 0)[0].date,
    Date.parse(sessions[0].startsAt) - 600000,
  );
  assert.deepEqual(reminderPlan(sessions, defaults(), 0), []);
});
test("Les ids de session sont propres à chaque week-end", () => {
  const p = setProtected(defaults(), RACE, true);
  assert(!p.protectedSessions.includes("f1-demo-2:Race"));
  const other = [{ id: "f1-demo-2:Race" }];
  assert(protectWeekend(protectWeekend(p, other, true), other, false).protectedSessions.includes(RACE));
  assert.equal(new Set(sessions.map((x) => x.id)).size, sessions.length);
});
test("Week-end en cours et dernier week-end selon la date", () => {
  const e = (id, race) => ({ id, sessions: [{ startsAt: race }] });
  const events = [e("a", "2026-10-04T12:00:00Z"), e("b", "2026-10-18T12:00:00Z")];
  const mid = Date.parse("2026-10-10T00:00:00Z");
  assert.deepEqual(
    Object.values(focusEvents(events, mid)).map((x) => x.id),
    ["b", "a"],
  );
  const during = Date.parse("2026-10-18T13:00:00Z");
  assert.equal(focusEvents(events, during).current.id, "b");
  assert.equal(focusEvents(events, Date.parse("2027-01-01")).current.id, "b");
  assert.equal(focusEvents(demoSeason.events, 0).last.id, "f1-demo-1");
});
test("Mon pilote et mon écurie : choisis, ajoutés aux favoris, restaurés", () => {
  const p = setMine(setMine(defaults(), "myDriver", "driver-leclerc"), "myTeam", "team-ferrari");
  assert.equal(p.myDriver, "driver-leclerc");
  assert(p.favorites.includes("driver-leclerc") && p.favorites.includes("team-ferrari"));
  assert.equal(setMine(p, "myDriver", "driver-leclerc").favorites.length, p.favorites.length);
  const back = restorePreferences(JSON.stringify(p), sessions);
  assert.equal(back.myTeam, "team-ferrari");
  assert.equal(restorePreferences(JSON.stringify({ ...p, myDriver: 3 }), sessions).myDriver, "");
});

import { autoProtect } from "../src/model.mjs";

test("Anti-spoil automatique : courses protégées 5 min avant, jamais une session déjà vue", () => {
  const raceStart = Date.parse(sessions.at(-1).startsAt);
  const quali = sessions.at(-2);
  const on = { ...defaults(), autoProtect: "race" };
  const events = demoSeason.events;
  // Trop tôt : rien ; 4 min avant : la course est protégée, pas les qualifs.
  assert.equal(autoProtect(on, events, raceStart - 10 * 60000), on);
  const p = autoProtect(on, events, raceStart - 4 * 60000);
  assert.deepEqual(p.protectedSessions, [RACE]);
  // Débloquée par l'utilisateur : reste visible, même au rafraîchissement suivant.
  const seen = setProtected(p, RACE, false);
  assert.deepEqual(autoProtect(seen, events, raceStart + 3600000).protectedSessions, []);
  // Plus de 48 h après : on ne protège plus.
  assert.deepEqual(autoProtect(on, events, raceStart + 49 * 3600000).protectedSessions, []);
  // Mode week-end : les qualifications aussi.
  const all = autoProtect({ ...on, autoProtect: "weekend" }, events, Date.parse(quali.startsAt));
  assert(all.protectedSessions.includes(QUALI));
  const off = defaults(); // désactivé par défaut : préférences inchangées
  assert.equal(autoProtect(off, events, raceStart), off);
});

test("Reprotéger une session efface sa marque « vue »", () => {
  const seen = setProtected(defaults(), RACE, false);
  assert.deepEqual(seen.revealed, [RACE]);
  assert.deepEqual(setProtected(seen, RACE, true).revealed, []);
  const back = restorePreferences(JSON.stringify({ ...seen, autoProtect: "weekend" }), sessions);
  assert.deepEqual(back.revealed, [RACE]);
  assert.equal(back.autoProtect, "weekend");
  assert.equal(restorePreferences(JSON.stringify({ ...seen, autoProtect: "x" }), sessions).autoProtect, "off");
});

import { duel, teammateOf } from "../src/model.mjs";
import { parseDriverSeason } from "../src/jolpica.mjs";

test("Duel coéquipiers : course, qualifs, meilleur résultat, points", () => {
  const drivers = [
    { id: "driver-a", teamId: "team-x", points: 200 },
    { id: "driver-b", teamId: "team-x", points: 180 },
    { id: "driver-c", teamId: "team-x", points: 4 }, // remplaçant ponctuel
    { id: "driver-d", teamId: "team-y", points: 250 },
  ];
  assert.equal(teammateOf(drivers, "driver-a").id, "driver-b");
  assert.equal(teammateOf(drivers, "driver-b").id, "driver-a");
  assert.equal(teammateOf(drivers, "inconnu"), undefined);
  const r = (round, race, quali, points, dnf = false) => ({ round, name: `GP${round}`, race, quali, points, dnf });
  const d = duel(
    [r(1, 1, 2, 25), r(2, 15, 1, 0, true), r(3, 3, 3, 15)],
    [r(1, 2, 1, 18), r(2, 4, 5, 12), r(4, 1, 1, 25)], // GP4 sans moi : ignoré
  );
  assert.deepEqual(d.race, [1, 1]); // GP1 devant, GP2 abandon
  assert.deepEqual(d.quali, [1, 1]);
  // Meilleur résultat : sur toute la saison de chacun ; un abandon ne compte pas.
  assert.deepEqual(d.best, [1, 1]);
  assert.deepEqual(duel([r(1, 9, 9, 2, true)], [r(1, 3, 3, 15)]).best, [Infinity, 3]);
  assert.equal(d.rounds.length, 2);
});

test("Saison d'un pilote au format Jolpica, abandon repéré", () => {
  const races = (key, rows) => ({ RaceTable: { Races: rows.map(([round, x]) => ({ round, raceName: `GP${round}`, [key]: [x] })) } });
  const season = parseDriverSeason(
    races("Results", [["1", { position: "3", positionText: "3", points: "15" }], ["2", { position: "18", positionText: "R", points: "0" }]]),
    races("QualifyingResults", [["1", { position: "4" }], ["2", { position: "2" }]]),
  );
  assert.deepEqual(season[0], { round: 1, name: "GP1", race: 3, dnf: false, points: 15, quali: 4 });
  assert.equal(season[1].dnf, true);
});
