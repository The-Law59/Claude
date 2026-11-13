import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOverride, withOverrides } from "../src/results.mjs";

const row = (driverId, position, positionText = String(position)) => ({
  driverId,
  position,
  positionText,
});

test("Classement corrigé : pilotes saisis devant, les autres dans l'ordre de Jolpica", () => {
  const rows = ["ver", "ham", "pia", "col", "law", "gas", "bor", "dnf"].map((d, i) =>
    row(d, i + 1, d === "dnf" ? "R" : String(i + 1)),
  );
  const out = withOverrides(
    { "gp:Race": rows, "gp:Qualifying": rows },
    { "gp:Race": { ids: ["ver", "ham", "law", "bor"] } },
  );
  assert.deepEqual(
    out["gp:Race"].map((r) => [r.driverId, r.position, r.positionText]),
    [
      ["ver", 1, "1"],
      ["ham", 2, "2"],
      ["law", 3, "3"],
      ["bor", 4, "4"],
      ["pia", 5, "5"],
      ["col", 6, "6"],
      ["gas", 7, "7"],
      ["dnf", 8, "R"],
    ],
  );
  assert.equal(out["gp:Race"][0].corrected, true);
  assert.equal(out["gp:Qualifying"], rows); // pas de correction : inchangé
  assert.equal(withOverrides(undefined, {}), undefined);
});

test("Classement corrigé : taille minimale, pilotes connus, sans doublon", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `d${i}`);
  assert.match(checkOverride("gp:Race", ids.slice(0, 9), ids), /au moins 10/);
  assert.match(checkOverride("gp:Sprint", ids.slice(0, 7), ids), /au moins 8/);
  assert.equal(checkOverride("gp:Sprint", ids.slice(0, 8), ids), null);
  assert.equal(checkOverride("gp:Race", ids.slice(0, 12), ids), null);
  assert.match(checkOverride("gp:Race", [...ids.slice(0, 9), "d0"], ids), /double/);
  assert.match(checkOverride("gp:Race", [...ids.slice(0, 9), "x"], ids), /inconnu/);
  assert.match(checkOverride("gp:FirstPractice", ids, ids), /Seuls/);
});
