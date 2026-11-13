import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClean, isClean } from "../src/moderation.mjs";

test("Filtre : insultes refusées, y compris déguisées", () => {
  for (const bad of [
    "Quel connard ce pilote",
    "SALOPE",
    "t'es qu'un enculé",
    "s4lope",
    "c.o.n.n.a.r.d",
    "fils  de  pute",
    "you whore",
  ])
    assert.equal(isClean(bad), false, bad);
  assert.throws(() => assertClean("connasse", "Pseudo"), /Pseudo refusé/);
});

test("Filtre : pas de faux positif sur le vocabulaire F1", () => {
  for (const ok of [
    "Gros retard de Hamilton dans le premier secteur",
    "Une dispute en piste entre Norris et Piastri",
    "Putain quelle course !",
    "Il a computé la stratégie",
    "La livrée sale noire de Haas",
    "Le PDG de l'écurie",
    "Raton laveur sur la piste au Canada",
  ])
    assert.equal(isClean(ok), true, ok);
});
