import test from "node:test";
import assert from "node:assert/strict";
import { demoSeason } from "../src/data.mjs";
import { loadNews, parseRss, toArticle } from "../src/news.mjs";

// Flux RSS d'exemple, écrit pour le test.
const xml = `<?xml version="1.0"?><rss><channel><title>Test</title>
<item><title><![CDATA[Verstappen et Red Bull &amp; la «&#160;pole&#160;»]]></title>
<link>https://example.com/a</link><pubDate>Sat, 17 Oct 2026 15:00:00 GMT</pubDate>
<description><![CDATA[<p>Un <b>résumé</b> &#x2014; avec HTML.</p><a class='more' href='https://example.com/a'>Continuez de lire</a>]]></description></item>
<item><title>Sans date, rumeur sur Ferrari</title><link>https://example.com/b</link></item>
<item><title>Lien non sécurisé</title><link>http://example.com/c</link></item>
</channel></rss>`;

test("Le flux RSS est nettoyé : CDATA, entités, HTML, liens https seulement", () => {
  const items = parseRss(xml, "Test", 42);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Verstappen et Red Bull & la « pole »");
  assert.equal(items[0].summary, "Un résumé — avec HTML.");
  assert.equal(items[0].publishedAt, Date.parse("2026-10-17T15:00:00Z"));
  assert.equal(items[1].publishedAt, 42);
});

test("Un article est relié aux favoris cités et aux sessions déjà commencées", () => {
  const [a, b] = parseRss(xml, "Test", Date.parse("2030-01-01")).map((x) =>
    toArticle(x, demoSeason),
  );
  assert.deepEqual(a.tags, ["driver-max_verstappen", "team-red_bull"]);
  // Publié samedi 15 h : après EL1, EL2, EL3 et les qualifications, avant la course.
  assert.deepEqual(
    a.sessionIds,
    demoSeason.events[0].sessions.slice(0, 4).map((s) => s.id),
  );
  assert.equal(a.rumor, false);
  assert(b.rumor);
  assert.equal(b.sessionIds.length, 5);
  assert.notEqual(a.id, b.id);
});

test("Chargement : doublons retirés, tri récent d'abord, échec signalé", async () => {
  const ok = async () => ({ ok: true, text: async () => xml + xml });
  const items = await loadNews(ok);
  assert.equal(items.length, 2);
  assert(items[0].publishedAt >= items[1].publishedAt);
  await assert.rejects(loadNews(async () => ({ ok: false, status: 500 })), /Aucune actualité/);
});
