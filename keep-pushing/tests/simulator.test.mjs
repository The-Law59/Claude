import test from "node:test";
import assert from "node:assert/strict";
import {
  contenders,
  simulated,
  defaultPicks,
  maxLeft,
  remaining,
  setPlace,
  simulate,
} from "../src/simulator.mjs";

const at = (d) => `2026-${d}T14:00:00Z`;
const events = [
  { name: "GP A", sessions: [{ id: "a:Race", type: "Race", startsAt: at("10-01") }] },
  {
    name: "GP B",
    sessions: [
      { id: "b:Sprint", type: "Sprint", startsAt: at("10-20") },
      { id: "b:Race", type: "Race", startsAt: at("10-21") },
    ],
  },
  { name: "GP C", sessions: [{ id: "c:Race", type: "Race", startsAt: at("11-01") }] },
];
const drivers = [
  { id: "x", points: 300 },
  { id: "y", points: 270 },
  { id: "z", points: 220 },
];

test("Points restants et pilotes encore en lice", () => {
  const rem = remaining(events, Date.parse(at("10-10")));
  assert.deepEqual(
    rem.map((s) => s.id),
    ["b:Sprint", "b:Race", "c:Race"],
  );
  assert.equal(maxLeft(rem), 8 + 25 + 25);
  // z : 220 + 58 < 300, éliminé.
  assert.deepEqual(
    contenders(drivers, rem).map((d) => d.id),
    ["x", "y"],
  );
});

test("Simulation : places choisies, échange quand une place est prise", () => {
  const rem = remaining(events, Date.parse(at("10-10")));
  let picks = defaultPicks(rem, ["x", "y"]);
  assert.equal(simulate(drivers, rem, picks)[0].total, 300 + 8 + 25 + 25);
  // y gagne tout : x passe 2e partout.
  for (const s of rem) picks = setPlace(picks, s.id, "y", 1);
  assert.deepEqual(picks["c:Race"], { x: 2, y: 1 });
  const final = simulate(drivers, rem, picks);
  assert.deepEqual(
    final.slice(0, 2).map((d) => [d.id, d.total]),
    [
      ["x", 300 + 7 + 18 + 18],
      ["y", 270 + 58],
    ],
  );
  // Hors points : 11e.
  picks = setPlace(picks, "c:Race", "x", 11);
  assert.equal(simulate(drivers, rem, picks).find((d) => d.id === "x").gained, 7 + 18);
});

test("Simulateur : mon pilote favori ajouté s'il n'est plus en lice", () => {
  const drivers = [
    { id: "x", points: 100 },
    { id: "y", points: 90 },
    { id: "z", points: 10 },
  ];
  const rem = [{ id: "r1", type: "Race" }];
  assert.deepEqual(
    simulated(drivers, rem, "z").map((d) => d.id),
    ["x", "y", "z"],
  );
  assert.deepEqual(
    simulated(drivers, rem, "y").map((d) => d.id),
    ["x", "y"],
  );
  assert.deepEqual(
    simulated(drivers, rem, "").map((d) => d.id),
    ["x", "y"],
  );
});
