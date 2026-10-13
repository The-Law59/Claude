import { timedFetch } from "./jolpica.mjs";

// Actualités : flux RSS publics. On n'affiche que titre, extrait et lien
// vers l'article d'origine. Ajouter une source = une ligne ici.
export const SOURCES = [
  // Flux gratuits offerts aux visiteurs : https://fr.motorsport.com/rss/
  { name: "Motorsport.com", url: "https://fr.motorsport.com/rss/f1/news/" },
];
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const clean = (s = "") =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
      e[0] === "#"
        ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
        : ENTITIES[e.toLowerCase()] ?? m,
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function parseRss(xml, source, now = Date.now()) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)]
    .map(([item]) => {
      const raw = (tag) => item.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
      const get = (tag) => clean(raw(tag));
      // Retire le lien « Continuez de lire » que certains flux ajoutent au résumé.
      const summary = clean(raw("description")?.replace(/<a\b[^>]*class=['"]more['"][\s\S]*?<\/a>/g, ""));
      return {
        title: get("title"),
        link: get("link"),
        summary: summary.length > 320 ? `${summary.slice(0, 317)}…` : summary,
        // Date absente ou illisible : on la considère récente, donc masquée en anti-spoil.
        publishedAt: Date.parse(get("pubDate")) || now,
        source,
      };
    })
    .filter((x) => x.title && /^https:\/\//.test(x.link));
}

const hash = (s) => [...s].reduce((h, ch) => (h * 33 + ch.charCodeAt(0)) >>> 0, 5381).toString(36);
const has = (text, word) => text.toLowerCase().includes(word.toLowerCase());

// Relie un article aux favoris (noms cités) et à toutes les sessions déjà
// commencées à sa publication : il peut en révéler le résultat.
export function toArticle(item, season) {
  const text = `${item.title} ${item.summary}`;
  return {
    id: `n${hash(item.link)}`,
    title: item.title,
    summary: item.summary,
    link: item.link,
    source: item.source,
    publishedAt: item.publishedAt,
    tags: [
      ...season.drivers.filter((d) => has(text, d.name.split(" ").at(-1))),
      ...season.teams.filter((t) => has(text, t.name)),
    ].map((x) => x.id),
    sessionIds: season.events
      .flatMap((e) => e.sessions)
      .filter((s) => Date.parse(s.startsAt) <= item.publishedAt)
      .map((s) => s.id),
    rumor: /rumeur/i.test(item.title),
    important: false,
  };
}

export async function loadNews(fetchFn = fetch) {
  const feeds = await Promise.allSettled(
    SOURCES.map(async ({ name, url }) => {
      const res = await timedFetch(fetchFn, url);
      if (!res.ok) throw new Error(`${name} ${res.status}`);
      return parseRss(await res.text(), name);
    }),
  );
  const items = feeds.flatMap((f) => (f.status === "fulfilled" ? f.value : []));
  if (!items.length) throw new Error("Aucune actualité chargée");
  return [...new Map(items.map((x) => [x.link, x])).values()]
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 40);
}
