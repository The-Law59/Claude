import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ACCENT, TEAM_COLORS, accentFor, contrastWithWhite, tint } from "../src/teams.mjs";

test("Chaque couleur d'écurie reste lisible avec du texte blanc (≥ 4,5:1)", () => {
  for (const [team, color] of Object.entries({ ...TEAM_COLORS, default: DEFAULT_ACCENT }))
    assert(contrastWithWhite(color) >= 4.5, `${team} ${color} : ${contrastWithWhite(color).toFixed(2)}`);
});

test("Accent par défaut sans écurie connue, teinte pâle dérivée", () => {
  assert.equal(accentFor(""), DEFAULT_ACCENT);
  assert.equal(accentFor("team-ferrari"), "#c8001e");
  assert.equal(tint("#000000", 0.1), "#e6e6e6");
  assert.equal(tint("#ffffff"), "#ffffff");
});
