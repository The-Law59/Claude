import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  QuotaError,
  createHypraceClient,
  createRoundLoader,
  gridRows,
  nextFetchIn,
  parseSeason,
  peopleOf,
  practiceRows,
  qualiRows,
  raceRows,
  teamOf,
} from "../src/hyprace.mjs";

const fx = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/hyprace/${name}.json`, import.meta.url)));
const gps = fx("gp2026").items;
const teams = fx("teams").items;
const people = peopleOf(teams);
const teamNames = new Map(teams.map((t) => [t.id, teamOf(t)]));
const brazilGp = gps.find((g) => g.round === 20);
const circuits = { [brazilGp.circuitId]: fx("circuit") };

test("Hyprace : saison au format de l'appli, mêmes identifiants que Jolpica", () => {
  const season = parseSeason({ grandsPrix: gps, teams, circuits });
  assert.equal(season.source, "hyprace");
  assert.equal(season.events.length, 23);
  const brazil = season.events.find((e) => e.id === "f1-2026-20");
  assert.equal(brazil.circuitId, "interlagos");
  assert.equal(brazil.circuit, "Autódromo José Carlos Pace");
  assert.deepEqual(brazil.location, {
    lat: -23.7036,
    long: -46.6997,
    locality: "São Paulo",
    country: "Brazil",
  });
  assert.deepEqual(
    brazil.sessions.map((s) => s.id),
    ["FirstPractice", "SecondPractice", "ThirdPractice", "Qualifying", "Race"].map(
      (t) => `f1-2026-20:${t}`,
    ),
  );
  assert.equal(brazil.winner.driverId, "driver-norris");
  const singapore = season.events.find((e) => e.round === 17);
  assert.ok(singapore.sessions.some((s) => s.type === "Sprint"));
  assert.ok(singapore.sessions.some((s) => s.type === "SprintQualifying"));
  // Classements.
  assert.deepEqual(season.drivers[0], {
    id: "driver-antonelli",
    name: "Andrea Kimi Antonelli",
    team: "Mercedes",
    teamId: "team-mercedes",
    points: 390,
  });
  const camara = season.drivers.find((d) => d.id === "driver-rafael_camara");
  assert.equal(camara.teamId, "team-haas");
  assert.ok(season.drivers.some((d) => d.id === "driver-hirakawa"));
  assert.ok(!season.drivers.some((d) => d.id === "driver-frederik_vesti")); // n'a pas couru
  assert.deepEqual(season.teams[0], { id: "team-mercedes", name: "Mercedes", points: 652 });
  assert.equal(season.teams.length, 11);
});

test("Hyprace : identifiants des 36 pilotes identiques à ceux de Jolpica", () => {
  const jolpica =
    "albon alonso antonelli paul_aron bearman dino_beganovic bortoleto bottas luke_browning rafael_camara colapinto jak_crawford leonardo_fornaroli gasly hadjar hamilton colton_herta hirakawa hulkenberg ayumu_iwasa lawson leclerc arvid_lindblad gabriele_mini norris ocon piastri perez russell sainz freddie_slater stroll nikola_tsolov tsunoda max_verstappen frederik_vesti"
      .split(" ")
      .map((id) => `driver-${id}`)
      .sort();
  assert.deepEqual([...new Set([...people.values()].map((p) => p.id))].sort(), jolpica);
});

test("Hyprace : résultats de course, sprint, qualifs, essais et grille", () => {
  const race = raceRows(fx("race"), people, teamNames);
  assert.equal(race.length, 22);
  assert.deepEqual(race[0], {
    position: 1,
    driverId: "driver-norris",
    name: "Lando Norris",
    team: "McLaren",
    value: "1:35:23.504",
    positionText: "1",
    grid: 1,
  });
  assert.match(race[1].value, /^\+/);
  assert.deepEqual(
    race
      .filter((r) => !/^\d+$/.test(r.positionText))
      .map((r) => r.positionText)
      .sort(),
    ["R", "W"],
  );
  assert.equal(race.filter((r) => r.fastestLap).length, 1);
  const sprint = raceRows(fx("sprint"), people, teamNames);
  assert.equal(sprint[1].value, "+2.591");
  const quali = qualiRows(fx("quali"), people, teamNames);
  assert.deepEqual([quali[0].driverId, quali[0].value], ["driver-norris", "1:27.470"]);
  const fp1 = practiceRows(fx("fp1"), people, teamNames);
  assert.deepEqual([fp1[0].value, fp1[1].value], ["1:11.717", "+0.082"]);
  const grid = gridRows(fx("grid"), people, teamNames);
  assert.deepEqual(
    grid.slice(0, 2).map((r) => r.driverId),
    ["driver-norris", "driver-antonelli"],
  );
});

test("Hyprace : relectures espacées, séances définitives jamais relues", () => {
  const H = 3600000;
  const start = "2026-11-08T17:00:00Z";
  const end = Date.parse(start) + 2 * H;
  assert.equal(nextFetchIn("Race", start, undefined, end - H), Infinity);
  assert.equal(nextFetchIn("Race", start, undefined, end + 6 * 60000), 0);
  assert.equal(nextFetchIn("Race", start, { rows: [1] }, end + H), 30 * 60000);
  assert.equal(nextFetchIn("Race", start, { rows: [1] }, end + 2 * 24 * H), 6 * H);
  assert.equal(nextFetchIn("Race", start, { rows: [1] }, end + 8 * 24 * H), null);
  assert.equal(nextFetchIn("FirstPractice", start, { rows: [1] }, end + 2 * 24 * H), null);
});

test("Hyprace : chargeur avec cache et lots limités", async () => {
  const season = parseSeason({ grandsPrix: gps, teams, circuits });
  const brazil = season.events.find((e) => e.id === "f1-2026-20");
  const calls = [];
  const client = {
    get: async (path) => {
      calls.push(path);
      if (path.includes("/practices/")) return fx("fp1");
      if (path.includes("/qualifying/")) return fx("quali");
      return fx("race");
    },
  };
  let now = Date.parse("2026-11-10T12:00:00Z");
  const cache = {};
  const loader = createRoundLoader(client, () => ({ people, teamNames }), cache, {
    now: () => now,
  });
  // Pronos : qualifs + course seulement.
  let out = await loader.load(brazil);
  assert.deepEqual(Object.keys(out).sort(), ["f1-2026-20:Qualifying", "f1-2026-20:Race"]);
  assert.equal(calls.length, 2);
  await loader.load(brazil);
  assert.equal(calls.length, 2); // rien de dû
  // Affichage : les essais en plus, au plus 2 lectures par passage.
  out = await loader.load(brazil, { all: true, max: 2 });
  assert.equal(calls.length, 4);
  assert.equal(Object.keys(out).filter((k) => k.includes("Practice")).length, 2);
  // 8 jours plus tard : tout devient définitif, plus aucune lecture.
  now += 8 * 24 * 3600000;
  await loader.load(brazil, { all: true, max: 10 });
  const before = calls.length;
  assert.equal(loader.settled(brazil), true);
  now += 24 * 3600000;
  await loader.load(brazil, { all: true, max: 10 });
  assert.equal(calls.length, before);
});

test("Hyprace : réserve de quota, plus d'appel quand il reste trop peu", async () => {
  let remaining = 17;
  const fetchFn = async () => ({
    ok: true,
    headers: new Map([
      ["x-ratelimit-requests-remaining", String((remaining -= 1))],
      ["x-ratelimit-requests-per-month-remaining", "3900"],
    ]),
    json: async () => ({ items: [] }),
  });
  const client = createHypraceClient({ apiKey: "k", fetchFn, reserve: 15 });
  await client.get("/drivers");
  assert.equal(client.usage.remainingDay, 16);
  await client.get("/drivers");
  assert.equal(client.usage.remainingDay, 15);
  await assert.rejects(client.get("/drivers"), QuotaError);
  assert.equal(client.usage.calls, 2);
  assert.equal(client.usage.remainingMonth, 3900);
});
