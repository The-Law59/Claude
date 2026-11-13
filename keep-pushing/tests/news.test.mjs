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

import { classify, merge } from "../src/news.mjs";

test("Classement des sources : officiel seulement sur liste, inconnu = non officiel", () => {
  assert.equal(classify("https://www.formula1.com/en/latest/article/x"), "official");
  assert.equal(classify("https://www.fia.com/news/x"), "official");
  assert.equal(classify("https://fr.motorsport.com/f1/news/x"), "press");
  assert.equal(classify("https://www.lequipe.fr/Formule-1/x"), "press");
  // Imitations et domaines inconnus : jamais « officiel ».
  assert.equal(classify("https://formula1.com.actu-f1.net/x"), "unofficial");
  assert.equal(classify("https://myformula1.com/x"), "unofficial");
  assert.equal(classify("https://blog-f1-rumeurs.fr/x"), "unofficial");
  assert.equal(classify("pas une url"), "unofficial");
});

const google = `<rss><channel>
<item><title>Leclerc prolonge chez Ferrari - L'Équipe</title><link>https://news.google.com/rss/articles/abc</link>
<pubDate>Tue, 13 Oct 2026 10:00:00 GMT</pubDate><description>&lt;a href="x"&gt;lien&lt;/a&gt;</description>
<source url="https://www.lequipe.fr">L'Équipe</source></item>
<item><title>Rumeur folle sur Red Bull - BlogF1</title><link>https://news.google.com/rss/articles/def</link>
<source url="https://blogf1.example">BlogF1</source></item>
</channel></rss>`;

test("Agrégateur : chaque article prend le nom et la fiabilité de son vrai site", () => {
  const [a, b] = parseRss(google, { name: "Google Actualités", kind: "auto" });
  assert.equal(a.title, "Leclerc prolonge chez Ferrari");
  assert.equal(a.source, "L'Équipe");
  assert.equal(a.via, "Google Actualités");
  assert.equal(a.kind, "press");
  assert.equal(a.summary, "");
  assert.equal(b.kind, "unofficial");
});

test("Atom (Reddit) et filtre F1 des communiqués FIA", () => {
  const atom = `<feed><entry><title>Race thread</title><link href="https://www.reddit.com/r/formula1/x"/>
<updated>2026-10-12T20:00:00+00:00</updated><content type="html">&lt;p&gt;Discussion&lt;/p&gt;</content></entry></feed>`;
  const [r] = parseRss(atom, { name: "Reddit", kind: "unofficial", lang: "EN" });
  assert.equal(r.link, "https://www.reddit.com/r/formula1/x");
  assert.equal(r.summary, "Discussion");
  assert.equal(r.kind, "unofficial");
  const fia = `<rss><channel><item><title>WRC: rally news</title><link>https://www.fia.com/a</link></item>
<item><title>Formula 1: decision</title><link>https://www.fia.com/b</link></item></channel></rss>`;
  assert.deepEqual(
    parseRss(fia, { name: "FIA", kind: "official", only: /formula 1/i }).map((x) => x.link),
    ["https://www.fia.com/b"],
  );
});

test("Même info dans plusieurs flux : la source la plus fiable gagne", () => {
  const base = { title: "Leclerc prolonge chez Ferrari", summary: "", publishedAt: 1 };
  const out = merge([
    { ...base, link: "https://blog.example/a", kind: "unofficial", source: "Blog" },
    { ...base, title: "Leclerc prolonge chez Ferrari !", link: "https://www.ferrari.com/a", kind: "official", source: "Ferrari" },
    { ...base, title: "Autre info", link: "https://x.example/b", kind: "press", source: "X", publishedAt: 2 },
  ]);
  assert.deepEqual(out.map((x) => x.source), ["X", "Ferrari"]);
});

test("Cas réels : Reddit doublement encodé, Formula1.com sans date", () => {
  const reddit = `<feed><entry><title>Race thread</title><link href="https://www.reddit.com/r/formula1/y"/>
<content type="html">&lt;div&gt;Great race&amp;amp;#32;today&lt;/div&gt; &amp;#32; submitted by &amp;#32; &lt;a href="u"&gt; /u/someone &lt;/a&gt; &lt;span&gt;[link]&lt;/span&gt;</content></entry></feed>`;
  assert.equal(parseRss(reddit, { name: "Reddit", kind: "unofficial" })[0].summary, "Great race today");
  const f1 = `<rss><channel><item><title>News</title><description>Texte</description>
<link>https://www.formula1.com/en/latest/article/x</link></item></channel></rss>`;
  const [x] = parseRss(f1, { name: "Formula1.com", kind: "official" }, 42);
  assert.equal(x.dated, false);
  assert.equal(x.publishedAt, 42); // considéré récent : masqué si une session est protégée
});

test("Un article traduit garde la trace de sa langue et de son titre d'origine", () => {
  const a = toArticle(
    { title: "Titre FR", summary: "", link: "https://x.example/t", publishedAt: 1, kind: "official", lang: "FR", translatedFrom: "EN", originalTitle: "EN title" },
    demoSeason,
  );
  assert.equal(a.translatedFrom, "EN");
  assert.equal(a.originalTitle, "EN title");
});
