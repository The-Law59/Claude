import test from "node:test";
import assert from "node:assert/strict";
import {
  loadRound,
  loadSeason,
  parseRound,
  parseSeason,
  parseTeamSeason,
} from "../src/jolpica.mjs";

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
const result = (position, extra) => ({
  position,
  Driver: driver,
  Constructor: constructor,
  ...extra,
});
const table = (Races) => ({ RaceTable: { Races } });
const MRData = {
  schedule: table([race, { ...race, round: "20", date: "2026-11-01" }]),
  winners: table([{ ...race, Results: [result("1", { Time: { time: "1:35:12.345" } })] }]),
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

test("Calendrier complet : sessions triées et uniques, vainqueur des GP courus", () => {
  const season = parseSeason(MRData);
  const [event, next] = season.events;
  assert.equal(event.id, "f1-2026-19");
  assert.equal(event.round, 19);
  assert.deepEqual(
    event.sessions.map((s) => s.id),
    ["FirstPractice", "SprintQualifying", "Sprint", "Qualifying", "Race"].map(
      (t) => `f1-2026-19:${t}`,
    ),
  );
  assert.equal(event.winner.name, "Test Pilote");
  assert.equal(next.winner, null);
  assert.deepEqual(season.results, {});
  assert.deepEqual(season.drivers[0], {
    id: "driver-test_driver",
    name: "Test Pilote",
    team: "Test Team",
    teamId: "team-test_team",
    points: 321,
  });
  assert.equal(season.teams[0].id, "team-test_team");
});

test("Résultats d'un GP : course, sprint et qualifications par session", () => {
  const [event] = parseSeason(MRData).events;
  const out = parseRound(event, {
    race: table([
      {
        ...race,
        Results: [
          result("1", { Time: { time: "1:35:12.345" } }),
          result("2", { status: "Lapped" }),
        ],
      },
    ]),
    sprint: table([{ ...race, SprintResults: [result("1", { Time: { time: "30:01.1" } })] }]),
    qualifying: table([
      { ...race, QualifyingResults: [result("1", { Q1: "1:33.1", Q2: "1:32.9" })] },
    ]),
  });
  assert.deepEqual(
    out["f1-2026-19:Race"].map((r) => r.value),
    ["1:35:12.345", "Lapped"],
  );
  assert.equal(out["f1-2026-19:Race"][0].driverId, "driver-test_driver");
  assert.equal(out["f1-2026-19:Sprint"][0].value, "30:01.1");
  assert.equal(out["f1-2026-19:Qualifying"][0].value, "1:32.9");
  assert.deepEqual(parseRound(event, { race: table([]), qualifying: table([]), sprint: null }), {});
});

test("Chargement : saison, GP à la demande, erreurs", async () => {
  const urls = [];
  const fake = (byPath) => async (url) => {
    urls.push(url);
    const key = Object.keys(byPath).find((k) => url.includes(k));
    return { ok: true, json: async () => ({ MRData: byPath[key] }) };
  };
  const season = await loadSeason(
    fake({
      "/current.json": MRData.schedule,
      "/results/1.json": MRData.winners,
      driverStandings: MRData.drivers,
      constructorStandings: MRData.teams,
    }),
  );
  assert.equal(season.events.length, 2);
  urls.length = 0;
  const empty = table([]);
  await loadRound(season.events[0], fake({ "/2026/19/": empty }));
  assert.equal(urls.length, 3); // week-end sprint : course, qualifications, sprint
  await assert.rejects(
    loadSeason(async () => ({ ok: false, status: 503 })),
    /503/,
  );
  await assert.rejects(
    loadSeason(
      fake({
        "/current.json": empty,
        "/results/1.json": empty,
        driverStandings: MRData.drivers,
        constructorStandings: MRData.teams,
      }),
    ),
    /Calendrier vide/,
  );
});

test("Saison d'une écurie : points course + sprint, meilleure place", () => {
  const races = (key, rows) => ({
    RaceTable: {
      Races: rows.map(([round, list]) => ({ round, raceName: `GP${round}`, [key]: list })),
    },
  });
  const season = parseTeamSeason(
    races("Results", [
      [
        "1",
        [
          { position: "2", points: "18" },
          { position: "5", points: "10" },
        ],
      ],
      [
        "2",
        [
          { position: "11", points: "0" },
          { position: "14", points: "0" },
        ],
      ],
    ]),
    races("SprintResults", [
      [
        "2",
        [
          { position: "1", points: "8" },
          { position: "9", points: "0" },
        ],
      ],
    ]),
  );
  assert.deepEqual(season, [
    { round: 1, name: "GP1", points: 28, best: 2 },
    { round: 2, name: "GP2", points: 8, best: 11 },
  ]);
});

test("Remplaçant annoncé : pariable avant sa première course, même id ensuite", () => {
  const drivers = parseSeason(MRData).drivers;
  const added = drivers.find((d) => d.id === "driver-hirakawa");
  assert.equal(added.name, "Ryo Hirakawa");
  assert.equal(added.teamId, "team-haas");
  assert.equal(added.points, 0);
  assert.equal(drivers.at(0).id, "driver-test_driver"); // le titulaire reste listé
  // Une fois dans les classements, même sous un autre id Jolpica : une seule entrée, notre id.
  const hirakawa = { driverId: "ryo_hirakawa", givenName: "Ryo", familyName: "Hirakawa" };
  const haas = { constructorId: "haas", name: "Haas F1 Team" };
  const withHim = {
    ...MRData,
    drivers: {
      StandingsTable: {
        StandingsLists: [
          {
            DriverStandings: [
              { points: "321", Driver: driver, Constructors: [constructor] },
              { points: "2", Driver: hirakawa, Constructors: [haas] },
            ],
          },
        ],
      },
    },
  };
  const list = parseSeason(withHim).drivers.filter((d) => /Hirakawa/.test(d.name));
  assert.deepEqual(
    list.map((d) => [d.id, d.points]),
    [["driver-hirakawa", 2]],
  );
  const [event] = parseSeason(MRData).events;
  const out = parseRound(event, {
    race: table([{ ...race, Results: [{ position: "9", Driver: hirakawa, Constructor: haas }] }]),
    qualifying: table([]),
    sprint: null,
  });
  assert.equal(out[`${event.id}:Race`][0].driverId, "driver-hirakawa");
});
