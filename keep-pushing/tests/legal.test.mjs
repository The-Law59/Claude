import { test } from "node:test";
import assert from "node:assert/strict";
import { legalPage } from "../src/legal.mjs";

test("Pages légales : confidentialité, conditions, assistance", () => {
  const privacy = legalPage("confidentialite", {
    publisher: "Équipe RaceIQ",
    contact: "contact@exemple.fr",
  });
  assert.match(privacy, /<title>Politique de confidentialité · RaceIQ<\/title>/);
  assert.match(privacy, /mailto:contact@exemple\.fr/);
  assert.match(privacy, /Supprimer votre compte/);
  assert.match(legalPage("conditions", {}), /tolérance zéro/);
  assert.match(legalPage("conditions", {}), /PUBLISHER_NAME/); // à compléter si absent
  assert.match(legalPage("assistance", { contact: "a@b.fr" }), /a@b\.fr/);
  assert.equal(legalPage("autre", {}), null);
  // Pas d'injection HTML par le .env.
  assert.doesNotMatch(legalPage("assistance", { contact: "<script>x</script>" }), /<script>x/);
});
