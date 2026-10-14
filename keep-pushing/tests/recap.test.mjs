import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecapper, recapReady } from "../src/recap.mjs";

const event = {
  id: "f1-2026-17",
  name: "Singapore Grand Prix",
  circuit: "Marina Bay",
  sessions: [{ id: "f1-2026-17:Race", type: "Race", startsAt: "2026-10-11T12:00:00Z" }],
};
const results = {
  "f1-2026-17:Race": [{ position: 1, name: "Max Verstappen", team: "Red Bull", value: "1:42:00.785" }],
};
function fakeClient(reply = "ok") {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        create: async (req) => {
          calls.push(req);
          await new Promise((r) => setTimeout(r, 10));
          if (reply === "refusal") return { stop_reason: "refusal", content: [] };
          const text = JSON.stringify({ headline: "Verstappen s'impose", summary: "Résumé.", keyFacts: ["a", "b", "c"] });
          return { stop_reason: "end_turn", content: [{ type: "text", text }] };
        },
      },
    },
  };
}
const file = async () => join(await mkdtemp(join(tmpdir(), "kp-")), "data", "recaps.json");

test("Récap généré une fois par GP, depuis les seuls faits fournis, puis gardé sur disque", async () => {
  const client = fakeClient();
  const cacheFile = await file();
  const recap = await createRecapper({ client, cacheFile });
  const load = async () => results;
  // Deux demandes simultanées : une seule génération.
  const [a, b] = await Promise.all([recap(event, load, ["Titre 1"]), recap(event, load, ["Titre 1"])]);
  assert.equal(client.calls.length, 1);
  assert.equal(a.headline, "Verstappen s'impose");
  assert.equal(b.eventId, "f1-2026-17");
  const facts = JSON.parse(client.calls[0].messages[0].content);
  assert.deepEqual(facts.course, ["1. Max Verstappen (Red Bull) 1:42:00.785"]);
  assert.deepEqual(facts.titresActualites, ["Titre 1"]);
  assert.equal(client.calls[0].model, "claude-opus-5-5");
  assert.equal(client.calls[0].fallbacks, "default");
  // Après redémarrage : lu depuis le disque, aucun nouvel appel.
  assert(JSON.parse(await readFile(cacheFile, "utf8"))["f1-2026-17"]);
  const again = fakeClient();
  await (await createRecapper({ client: again, cacheFile }))(event, load, []);
  assert.equal(again.calls.length, 0);
});

test("Pas de récap avant la fin de course, sans résultats, ou en cas de refus", async () => {
  const future = { ...event, id: "f1-2026-30", sessions: [{ ...event.sessions[0], startsAt: "2099-01-01T00:00:00Z" }] };
  assert.equal(recapReady(future), false);
  const client = fakeClient();
  const recap = await createRecapper({ client, cacheFile: await file() });
  assert.equal(await recap(future, async () => results, []), null);
  assert.equal(await recap(event, async () => ({}), []), null);
  assert.equal(client.calls.length, 0);
  const refusing = await createRecapper({ client: fakeClient("refusal"), cacheFile: await file(), log: () => {} });
  assert.equal(await refusing(event, async () => results, []), null);
});
