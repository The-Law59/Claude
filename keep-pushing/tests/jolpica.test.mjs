import test from "node:test";
import assert from "node:assert/strict";
import { loadSeason, parseSeason } from "../src/jolpica.mjs";

// Réponses au format Jolpica/Ergast, réduites au strict nécessaire pour le test.
const driver = { driverId: "test_driver", givenName: "Test", familyName: "Pilote" };
const constructor = { constructorId: "test_team", name: "Test Team" };
const race = {
  season: "2026",
  round: "19",
  raceName: "Test Grand Prix",
  Circuit: { circuitName: "Test Circuit" },
  date: "2026-10-25",
  time: "19:00:00Z",
  FirstPractice: { date: "2026-10-23", time: "17:30:00Z" },
  SprintQualifying: { date: "2026-10-23", time: "21:30:00Z" },
  Sprint: { date: "2026-10-24", time: "17:00:00Z" },
  Qualifying: { date: "2026-10-24", time: "21:00:00Z" },
};
const MRData = {
  schedule: { RaceTable: { Races: [race] } },
  results: {
    RaceTable: {
      Races: [
        {
          ...race,
          Results: [
            { position: "1", Driver: driver, Constructor: constructor, Time: { time: "1:35:12.345" } },
            { position: "2", Driver: driver, Constructor: constructor, status: "Lapped" },
          ],
        },
      ],
    },
  },
  qualifying: {
    RaceTable: {
      Races: [
        {
          ...race,
          QualifyingResults: [
            { position: "1", Driver: driver, Constructor: constructor, Q1: "1:33.1", Q2: "1:32.9" },
          ],
        },
      ],
    },
  },
  drivers: {
    StandingsTable: {
      StandingsLists: [
        { DriverStandings: [{ points: "321", Driver: driver, Constructors: [constructor] }] },
      ],
    },
  },
  teams: {
    StandingsTable: {
      StandingsLists: [{ ConstructorStandings: [{ points: "500", Constructor: constructor }] }],
    },
  },
};

test("Le calendrier Jolpica devient des week-ends aux sessions triées et uniques", () => {
  const season = parseSeason(MRData);
  const [event] = season.events;
  assert.equal(event.id, "f1-2026-19");
  assert.deepEqual(
    event.sessions.map((s) => s.id),
    ["FirstPractice", "SprintQualifying", "Sprint", "Qualifying", "Race"].map(
      (t) => `f1-2026-19:${t}`,
    ),
  );
  assert.equal(event.sessions.at(-1).startsAt, "2026-10-25T19:00:00Z");
});

test("Résultats, qualifications et classements sont rattachés à leur session", () => {
  const season = parseSeason(MRData);
  assert.deepEqual(season.results["f1-2026-19:Race"].map((r) => r.value), [
    "1:35:12.345",
    "Lapped",
  ]);
  assert.equal(season.results["f1-2026-19:Qualifying"][0].value, "1:32.9");
  assert.deepEqual(season.drivers[0], {
    id: "driver-test_driver",
    name: "Test Pilote",
    team: "Test Team",
    points: 321,
  });
  assert.equal(season.teams[0].id, "team-test_team");
  assert.deepEqual(season.articles, []);
});

test("Saison vide et erreur HTTP", async () => {
  const empty = {
    schedule: { RaceTable: { Races: [race] } },
    results: { RaceTable: { Races: [] } },
    qualifying: { RaceTable: { Races: [] } },
    drivers: { StandingsTable: { StandingsLists: [] } },
    teams: { StandingsTable: { StandingsLists: [] } },
  };
  assert.deepEqual(parseSeason(empty).results, {});
  const keys = ["schedule", "results", "qualifying", "drivers", "teams"];
  let i = 0;
  const ok = async () => ({ ok: true, json: async () => ({ MRData: empty[keys[i++]] }) });
  assert.equal((await loadSeason(ok)).events.length, 1);
  await assert.rejects(loadSeason(async () => ({ ok: false, status: 503 })), /503/);
  i = 0;
  empty.schedule = { RaceTable: { Races: [] } };
  await assert.rejects(loadSeason(ok), /Calendrier vide/);
});
