import { test } from "node:test";
import assert from "node:assert/strict";
import { createPracticeSource, isPractice, matchDriver } from "../src/practice.mjs";

const drivers = [
  { id: "driver-max_verstappen", name: "Max Verstappen", team: "Red Bull" },
  { id: "driver-hulkenberg", name: "Nico Hülkenberg", team: "Audi" },
  { id: "driver-norris", name: "Lando Norris", team: "McLaren" },
];

test("Essais : types concernés et rattachement des noms de pilotes", () => {
  assert.equal(isPractice("FirstPractice"), true);
  assert.equal(isPractice("Qualifying"), false);
  assert.equal(matchDriver("Max Verstappen", drivers).id, "driver-max_verstappen");
  assert.equal(matchDriver("HULKENBERG", drivers).id, "driver-hulkenberg");
  assert.equal(matchDriver("L. Norris", drivers).id, "driver-norris");
  assert.equal(matchDriver("Inconnu", drivers), null);
});

test("Essais : sans fournisseur configuré, pas de source ; avec, lignes rattachées", async () => {
  assert.equal(createPracticeSource({ provider: undefined, apiKey: "k" }), null);
  assert.equal(createPracticeSource({ provider: "hyprace", apiKey: "k" }), null); // adaptateur pas encore écrit
  const fake = {
    fetchSession: async ({ type, apiKey }) => {
      assert.equal(apiKey, "secret");
      assert.equal(type, "FirstPractice");
      return [
        { position: 1, name: "Lando Norris", value: "1:32.101" },
        { position: 2, name: "Hulkenberg", team: "Audi", value: "+0.215" },
      ];
    },
  };
  const source = createPracticeSource({ provider: "fake", apiKey: "secret", providers: { fake } });
  const rows = await source({ id: "e" }, "FirstPractice", drivers);
  assert.deepEqual(rows[0], { position: 1, driverId: "driver-norris", name: "Lando Norris", team: "McLaren", value: "1:32.101" });
  assert.equal(rows[1].driverId, "driver-hulkenberg");
});
