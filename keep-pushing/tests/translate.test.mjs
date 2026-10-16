import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTranslator } from "../src/translate.mjs";

// Faux client : enregistre les requêtes et « traduit » en préfixant FR:.
function fakeClient(behaviour = "ok") {
  const calls = [];
  return {
    calls,
    messages: {
      create: async (req) => {
        calls.push(req);
        if (behaviour === "error") throw new Error("API indisponible");
        if (behaviour === "refusal")
          return {
            stop_reason: "refusal",
            stop_details: { category: "cyber" },
            content: [],
          };
        const input = JSON.parse(req.messages[0].content);
        const translations = input.map((x) => ({
          id: x.id,
          title: `FR:${x.title}`,
          summary: x.summary && `FR:${x.summary}`,
        }));
        return {
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify({ translations }) }],
        };
      },
    },
  };
}
const item = (n, lang = "EN") => ({
  link: `https://x.example/${n}`,
  title: `T${n}`,
  summary: `S${n}`,
  lang,
});
const cacheFile = async () =>
  join(await mkdtemp(join(tmpdir(), "kp-")), "data", "tr.json");

test("Seuls les articles anglais sont traduits, par lots de 20, avec la bonne requête", async () => {
  const client = fakeClient();
  const translate = await createTranslator({
    client,
    cacheFile: await cacheFile(),
  });
  const out = await translate([
    ...Array.from({ length: 25 }, (_, i) => item(i)),
    item("fr", "FR"),
  ]);
  assert.equal(client.calls.length, 2); // 20 + 5
  assert.equal(out[0].title, "FR:T0");
  assert.equal(out[0].lang, "FR");
  assert.equal(out[0].translatedFrom, "EN");
  assert.equal(out[0].originalTitle, "T0");
  assert.equal(out.at(-1).title, "Tfr"); // article déjà en français : intact
  const req = client.calls[0];
  assert.equal(req.model, "claude-haiku-5-5");
  assert.equal(req.output_config.effort, "low");
  assert.equal(req.output_config.format.type, "json_schema");
});

test("Cache : un article n'est traduit qu'une fois, même après redémarrage", async () => {
  const file = await cacheFile();
  const client = fakeClient();
  await (
    await createTranslator({ client, cacheFile: file })
  )([item(1)]);
  assert(JSON.parse(await readFile(file, "utf8"))["https://x.example/1"]);
  const again = fakeClient();
  const out = await (
    await createTranslator({ client: again, cacheFile: file })
  )([item(1)]);
  assert.equal(again.calls.length, 0);
  assert.equal(out[0].title, "FR:T1");
});

test("Refus ou panne de l'API : l'article reste en anglais, sans planter", async () => {
  for (const behaviour of ["refusal", "error"]) {
    const logs = [];
    const translate = await createTranslator({
      client: fakeClient(behaviour),
      cacheFile: await cacheFile(),
      log: (m) => logs.push(m),
    });
    const [x] = await translate([item(1)]);
    assert.equal(x.title, "T1");
    assert.equal(x.lang, "EN");
    assert.equal(logs.length, 1);
  }
});
