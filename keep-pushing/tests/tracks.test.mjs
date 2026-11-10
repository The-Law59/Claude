import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { km, raceLaps } from "../src/trackinfo.mjs";

const tracks = JSON.parse(readFileSync(new URL("../src/tracks.json", import.meta.url)));

test("Tracés : tous les circuits 2026, chemin fermé dans le repère", () => {
  const calendar2026 = [
    "albert_park",
    "shanghai",
    "suzuka",
    "miami",
    "villeneuve",
    "monaco",
    "catalunya",
    "red_bull_ring",
    "silverstone",
    "spa",
    "hungaroring",
    "zandvoort",
    "monza",
    "madring",
    "baku",
    "sepang",
    "marina_bay",
    "americas",
    "rodriguez",
    "interlagos",
    "vegas",
    "losail",
    "yas_marina",
  ];
  for (const id of calendar2026) {
    const t = tracks[id];
    assert.ok(t, id);
    assert.match(t.path, /^M\d+ \d+(L\d+ \d+)+Z$/, id);
    assert.ok(Math.max(t.w, t.h) <= 1000 && t.length > 3000, id);
  }
});

test("Fiche circuit : tours et longueur", () => {
  assert.equal(raceLaps("bahrain", 5412), 57);
  assert.equal(raceLaps("spa", 7004), 44);
  assert.equal(raceLaps("vegas", 6201), 50);
  assert.equal(raceLaps("monaco", 3337), 78);
  assert.equal(raceLaps("silverstone", 5891), 52);
  assert.equal(km(5412).replace(/\s/g, " "), "5,412 km");
});
