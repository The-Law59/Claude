import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPenalties, checkPenalties, penaltyLabel } from "../src/penalties.mjs";
import { qualiReference } from "../src/bets.mjs";

const order = ["a", "b", "c", "d", "e", "f"];

test("Pénalités : places, fond de grille, départ des stands", () => {
  assert.deepEqual(applyPenalties(order, []), order);
  // b (2e) +3 places -> 5e.
  assert.deepEqual(applyPenalties(order, [{ driverId: "b", kind: "places", places: 3 }]), [
    "a",
    "c",
    "d",
    "e",
    "b",
    "f",
  ]);
  // +10 avec 6 voitures : dernier des non relégués.
  assert.deepEqual(applyPenalties(order, [{ driverId: "a", kind: "places", places: 10 }]), [
    "b",
    "c",
    "d",
    "e",
    "f",
    "a",
  ]);
  // Fond de grille puis stands, dans l'ordre des qualifs.
  assert.deepEqual(
    applyPenalties(order, [
      { driverId: "a", kind: "pitlane" },
      { driverId: "c", kind: "back" },
      { driverId: "b", kind: "back" },
    ]),
    ["d", "e", "f", "b", "c", "a"],
  );
  assert.equal(
    penaltyLabel({ kind: "places", places: 10, reason: "engine" }),
    "+10 places · Moteur",
  );
  assert.equal(penaltyLabel({ kind: "pitlane", reason: "x" }), "Départ des stands · Autre");
});

test("Pénalités : saisie vérifiée", () => {
  const ids = ["a", "b"];
  assert.deepEqual(
    checkPenalties([{ driverId: "a", kind: "places", places: "5", reason: "gearbox" }], ids),
    [{ driverId: "a", kind: "places", places: 5, reason: "gearbox" }],
  );
  assert.throws(() => checkPenalties([{ driverId: "z", kind: "back" }], ids), /inconnu/);
  assert.throws(
    () => checkPenalties([{ driverId: "a", kind: "places", places: 0 }], ids),
    /entre 1 et 30/,
  );
  assert.throws(
    () =>
      checkPenalties(
        [
          { driverId: "a", kind: "back" },
          { driverId: "a", kind: "pitlane" },
        ],
        ids,
      ),
    /Une seule/,
  );
});

test("Pronos qualifs : grille provisoire avec pénalités, puis grille officielle", () => {
  const Qualifying = order.map((driverId, i) => ({ driverId, position: i + 1 }));
  const penalties = [{ driverId: "a", kind: "places", places: 2 }];
  let ref = qualiReference({ Qualifying, penalties });
  assert.equal(ref.provisional, true);
  assert.deepEqual(
    ref.rows.map((r) => r.driverId),
    ["b", "c", "a", "d", "e", "f"],
  );
  // Sans pénalité : classement des qualifs.
  ref = qualiReference({ Qualifying });
  assert.equal(ref.grid, false);
  // Grille officielle publiée avec la course : elle prime.
  const Race = order.map((driverId, i) => ({ driverId, position: i + 1, grid: i === 0 ? 6 : i }));
  ref = qualiReference({ Qualifying, Race, penalties });
  assert.equal(ref.grid, true);
  assert.equal(ref.rows.at(-1).driverId, "a");
});
