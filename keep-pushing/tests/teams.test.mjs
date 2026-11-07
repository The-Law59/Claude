import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ACCENT, TEAM_COLORS, accentFor, contrast, contrastWithWhite, mix, readableOn, tint } from "../src/teams.mjs";

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

test("Mode sombre : couleurs d'écurie et textes lisibles (4,5:1)", () => {
  const card = "#181c22";
  for (const color of [...Object.values(TEAM_COLORS), DEFAULT_ACCENT]) {
    assert.ok(contrast(readableOn(color, "#262c35"), card) >= 4.5, color);
    const soft = mix(color, card, 0.75);
    assert.ok(contrast(readableOn(color, soft), soft) >= 4.5, color);
  }
  assert.ok(contrast("#a1abb8", card) >= 4.5); // texte secondaire
  assert.ok(contrast("#e9ecf0", "#0e1115") >= 4.5);
});

test("Thème sombre : teinte vive de chaque écurie lisible sur les cartes, initiales définies", async () => {
  const { TEAM_GLOW, glowFor, DEFAULT_GLOW, initialsFor } = await import("../src/teams.mjs");
  const card = "#141920";
  for (const id of Object.keys(TEAM_COLORS)) {
    assert.ok(TEAM_GLOW[id], id);
    // Texte en couleur vive (étiquettes, onglet actif) : au moins 4,5:1 une fois ajusté.
    assert.ok(contrast(readableOn(glowFor(id), card), card) >= 4.5, id);
    assert.ok(initialsFor(id).length >= 2, id);
  }
  assert.equal(glowFor("team-inconnue"), DEFAULT_GLOW);
  assert.equal(initialsFor("team-new", "Nouvelle Écurie Racing"), "NÉR");
});
