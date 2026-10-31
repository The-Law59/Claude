import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDriver,
  addRumor,
  cancelOfficial,
  gameOf,
  makeOfficial,
  players,
  rumorView,
  scoreOfficial,
  setPicks,
  suggestions,
  totals,
  vote,
} from "../src/mercato.mjs";

const teamIds = ["team-ferrari", "team-mclaren", "team-cadillac"];
const driverIds = [
  "driver-hamilton",
  "driver-leclerc",
  "driver-norris",
  "driver-piastri",
  "driver-bottas",
  "driver-perez",
];
const opts = (now) => ({ teamIds, driverIds, now });
const stay = {
  "team-ferrari": ["driver-hamilton", "driver-leclerc"],
  "team-mclaren": ["driver-norris", "driver-piastri"],
  "team-cadillac": ["driver-bottas", "driver-perez"],
};

test("Mercato : grille valide, un pilote dans une seule écurie", () => {
  const game = gameOf({}, 2028);
  setPicks(game, "u1", stay, opts(1));
  assert.equal(game.picks.u1["team-ferrari"][0].at, 1);
  // Changer le coéquipier ne remet pas l'heure du pilote gardé à zéro.
  setPicks(
    game,
    "u1",
    {
      ...stay,
      "team-ferrari": ["driver-hamilton", "driver-perez"],
      "team-cadillac": ["driver-bottas", "driver-leclerc"],
    },
    opts(5),
  );
  assert.equal(game.picks.u1["team-ferrari"][0].at, 1);
  assert.equal(game.picks.u1["team-ferrari"][1].at, 5);
  assert.throws(
    () => setPicks(game, "u1", { ...stay, "team-cadillac": ["driver-hamilton"] }, opts(6)),
    /une écurie/,
  );
  assert.throws(
    () => setPicks(game, "u1", { "team-ferrari": ["a", "b", "c"] }, opts(6)),
    /Deux pilotes/,
  );
  assert.throws(() => setPicks(game, "u1", { "team-ferrari": ["driver-x"] }, opts(6)), /inconnu/);
});

test("Mercato : points à l'officialisation, coup de flair pour les rares", () => {
  const game = gameOf({}, 2028);
  // 5 joueurs : seul u1 voit Hamilton chez Cadillac.
  setPicks(
    game,
    "u1",
    {
      ...stay,
      "team-ferrari": ["driver-leclerc", "driver-perez"],
      "team-cadillac": ["driver-hamilton", "driver-bottas"],
    },
    opts(1),
  );
  for (const u of ["u2", "u3", "u4", "u5"]) setPicks(game, u, stay, opts(1));
  makeOfficial(
    game,
    { driverId: "driver-hamilton", teamId: "team-cadillac", source: "" },
    opts(10),
  );
  let s = scoreOfficial(game, game.official[0]);
  assert.equal(s.share, 0.2);
  assert.deepEqual(s.winners, { u1: 15 }); // 20 % : +5
  makeOfficial(game, { driverId: "driver-norris", teamId: "team-mclaren", source: "" }, opts(11));
  assert.equal(totals(game).u2.total, 10); // tout le monde l'avait : pas de bonus
  assert.equal(totals(game).u1.total, 25);
  // Le transfert officiel est figé dans la grille du joueur.
  assert.throws(
    () =>
      setPicks(
        game,
        "u2",
        {
          ...stay,
          "team-ferrari": ["driver-leclerc"],
          "team-cadillac": ["driver-hamilton", "driver-perez"],
        },
        opts(12),
      ),
    /officiel/,
  );
  // Un joueur arrivé après l'annonce ne marque pas.
  setPicks(game, "u6", { "team-cadillac": ["driver-perez"] }, opts(12));
  assert.equal(totals(game).u6, undefined);
  assert.throws(
    () => makeOfficial(game, { driverId: "driver-hamilton", teamId: "team-ferrari" }, opts(13)),
    /déjà officialisé/,
  );
  cancelOfficial(game, "driver-norris");
  assert.equal(totals(game).u2, undefined);
});

test("Mercato : rumeurs, votes et tranchage par l'officialisation", () => {
  const game = gameOf({}, 2028);
  let n = 0;
  const rand = () => Buffer.from(`rumor${n++}`);
  const r1 = addRumor(
    game,
    { id: "admin" },
    {
      driverId: "driver-hamilton",
      teamId: "team-cadillac",
      text: "Hamilton tenté par Cadillac",
      source: "https://exemple.fr/a",
    },
    { driverIds, teamIds, now: 1, rand },
  );
  const r2 = addRumor(
    game,
    { id: "admin" },
    { driverId: "driver-hamilton", teamId: "team-mclaren", text: "", source: "" },
    { driverIds, teamIds, now: 1, rand },
  );
  assert.throws(
    () =>
      addRumor(
        game,
        { id: "admin" },
        { driverId: "driver-hamilton", teamId: "team-cadillac", source: "ftp://x" },
        { driverIds, teamIds },
      ),
    /lien/,
  );
  vote(game, "u1", r1.id, true, 2);
  vote(game, "u2", r1.id, false, 2);
  vote(game, "u3", r1.id, false, 2);
  vote(game, "u1", r2.id, false, 2);
  // Votes cachés tant qu'on n'a pas voté.
  assert.equal(rumorView(r1, "u9").credible, null);
  assert.equal(rumorView(r1, "u1").credible, 1 / 3);
  const { resolved } = makeOfficial(
    game,
    { driverId: "driver-hamilton", teamId: "team-cadillac" },
    opts(10),
  );
  assert.equal(resolved.length, 2);
  assert.equal(r1.status, "confirmed");
  assert.equal(r2.status, "denied");
  const t = totals(game);
  assert.equal(t.u1.rumors, 3 + 2 + 3); // r1 contre la majorité, r2 seul votant
  assert.equal(t.u2, undefined);
  assert.equal(rumorView(r1, "u2").points, 0);
  assert.throws(() => vote(game, "u2", r1.id, true), /tranchée/);
  assert.deepEqual(players(game).sort(), ["u1", "u2", "u3"]);
});

test("Mercato : pilotes ajoutés et suggestions d'articles", () => {
  const game = gameOf({}, 2028);
  const d = addDriver(game, "Arvid Lindblad", [{ id: "driver-hamilton", name: "Lewis Hamilton" }]);
  assert.equal(d.id, "mercato-arvid_lindblad");
  assert.throws(() => addDriver(game, "arvid lindblad", game.extraDrivers), /existe/);
  const now = 100 * 86400000;
  const articles = [
    {
      title: "Hamilton signe chez Cadillac pour 2028",
      link: "a",
      publishedAt: now - 1000,
      tags: ["driver-hamilton", "team-cadillac"],
    },
    {
      title: "Hamilton remporte le GP",
      link: "b",
      publishedAt: now - 1000,
      tags: ["driver-hamilton"],
    },
    {
      title: "Contrat prolongé pour Ferrari",
      link: "c",
      publishedAt: now - 1000,
      tags: ["team-ferrari"],
    },
    {
      title: "Norris extension de contrat",
      link: "d",
      publishedAt: now - 30 * 86400000,
      tags: ["driver-norris"],
    },
  ];
  const list = suggestions(articles, game, now);
  assert.deepEqual(
    list.map((a) => a.link),
    ["a"],
  );
  assert.deepEqual(list[0].teamIds, ["team-cadillac"]);
});
