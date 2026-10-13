import { timedFetch } from "./jolpica.mjs";

// Veille actualités F1 : plusieurs flux publics, chaque article étiqueté selon
// la fiabilité de sa source. On n'affiche que titre, extrait et lien d'origine.
//
// Règle de prudence : « official » uniquement pour un domaine listé dans
// OFFICIAL_DOMAINS ; un domaine inconnu est « unofficial », jamais l'inverse.
export const KINDS = {
  official: "Officiel",
  press: "Presse",
  unofficial: "Non officiel",
};
export const OFFICIAL_DOMAINS = [
  "formula1.com",
  "fia.com",
  "ferrari.com",
  "mercedesamgf1.com",
  "redbullracing.com",
  "mclaren.com",
  "astonmartinf1.com",
  "williamsf1.com",
  "haasf1team.com",
  "visacashapprb.com",
];
export const PRESS_DOMAINS = [
  "motorsport.com",
  "autosport.com",
  "the-race.com",
  "autohebdo.fr",
  "autojournal.fr",
  "f1i.com",
  "nextgen-auto.com",
  "lequipe.fr",
  "rmcsport.bfmtv.com",
  "eurosport.fr",
  "canalplus.com",
  "lemonde.fr",
  "lefigaro.fr",
  "leparisien.fr",
  "ouest-france.fr",
  "francetvinfo.fr",
  "20minutes.fr",
  "bbc.co.uk",
  "bbc.com",
  "skysports.com",
  "reuters.com",
  "apnews.com",
  "racefans.net",
  // Rédactions identifiées relevées dans Google Actualités.
  "franceinfo.fr",
  "rtl.fr",
  "rfi.fr",
  "cnews.fr",
  "tv5monde.com",
  "ledauphine.com",
  "nicematin.com",
  "laprovence.com",
  "lejsl.com",
  "dhnet.be",
  "lapresse.ca",
  "jeuneafrique.com",
  "actu.fr",
  "sportauto.fr",
  "franceracing.fr",
];
// Domaine exact ou sous-domaine : « formula1.com.exemple.net » ne passe pas.
const matches = (host, domains) => domains.some((d) => host === d || host.endsWith(`.${d}`));
export function classify(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "unofficial";
  }
  if (matches(host, OFFICIAL_DOMAINS)) return "official";
  if (matches(host, PRESS_DOMAINS)) return "press";
  return "unofficial";
}

// kind "auto" : agrégateur, chaque article est classé selon son propre site.
export const SOURCES = [
  // Flux gratuits offerts aux visiteurs : https://fr.motorsport.com/rss/
  { name: "Motorsport.com", url: "https://fr.motorsport.com/rss/f1/news/", kind: "press" },
  { name: "Formula1.com", url: "https://www.formula1.com/en/latest/all.xml", kind: "official", lang: "EN" },
  // Communiqués FIA toutes disciplines : on ne garde que la F1.
  { name: "FIA", url: "https://www.fia.com/rss/press-release", kind: "official", lang: "EN", only: /formula 1|formula one|\bf1\b/i },
  { name: "RMC Sport", url: "https://rmcsport.bfmtv.com/rss/auto-moto/f1/", kind: "press" },
  { name: "Auto Journal F1", url: "https://f1i.autojournal.fr/feed/", kind: "press" },
  { name: "Google Actualités", url: "https://news.google.com/rss/search?q=%22Formule+1%22+OR+F1+when:2d&hl=fr&gl=FR&ceid=FR:fr", kind: "auto" },
  { name: "Reddit r/formula1", url: "https://www.reddit.com/r/formula1/top/.rss?t=day", kind: "unofficial", lang: "EN" },
];
const PER_SOURCE = 25;
const RANK = { official: 0, press: 1, unofficial: 2 };

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
    e[0] === "#"
      ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      : ENTITIES[e.toLowerCase()] ?? m,
  );
// Certains flux (Reddit) encodent leur HTML deux fois : on décode jusqu'à stabilité.
const clean = (s = "") => {
  let t = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let i = 0; i < 3; i++) t = decode(t).replace(/<[^>]*>/g, " ");
  return t
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ ?submitted by \/u\/\S+ \[link\]( \[comments\])?$/, ""); // pied de message Reddit
};

export function parseRss(xml, feed, now = Date.now()) {
  const { name, kind = "unofficial", lang = "FR", only } = typeof feed === "string" ? { name: feed } : feed;
  // RSS (<item>) ou Atom (<entry>, utilisé par Reddit).
  return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/g)]
    .map(([item]) => {
      const raw = (tag) => item.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
      const get = (tag) => clean(raw(tag));
      const link = get("link") || item.match(/<link\b[^>]*href="([^"]+)"/)?.[1] || "";
      // Agrégateur : site d'origine dans <source url="…">Nom</source>.
      const origin = item.match(/<source\b[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
      const outlet = origin ? clean(origin[2]) : name;
      const date = Date.parse(get("pubDate") || get("published") || get("updated"));
      let title = get("title");
      if (origin && title.endsWith(` - ${outlet}`)) title = title.slice(0, -outlet.length - 3);
      // Retire le lien « Continuez de lire » que certains flux ajoutent au résumé.
      const summary = origin
        ? "" // le résumé Google ne contient que des liens
        : clean((raw("description") ?? raw("summary") ?? raw("content"))?.replace(/<a\b[^>]*class=['"]more['"][\s\S]*?<\/a>/g, ""));
      return {
        title,
        link,
        summary: summary.length > 320 ? `${summary.slice(0, 317)}…` : summary,
        // Date absente ou illisible : on la considère récente, donc masquée en anti-spoil.
        publishedAt: date || now,
        dated: !!date,
        source: outlet,
        via: origin ? name : undefined,
        kind: kind === "auto" ? classify(origin?.[1] ?? link) : kind,
        lang,
      };
    })
    .filter((x) => x.title && /^https:\/\//.test(x.link) && (!only || only.test(`${x.title} ${x.summary}`)))
    .slice(0, PER_SOURCE);
}

const hash = (s) => [...s].reduce((h, ch) => (h * 33 + ch.charCodeAt(0)) >>> 0, 5381).toString(36);
const has = (text, word) => text.toLowerCase().includes(word.toLowerCase());
const sameStory = (title) => title.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");

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
    via: item.via,
    kind: item.kind,
    lang: item.lang,
    publishedAt: item.publishedAt,
    dated: item.dated,
    tags: [
      ...season.drivers.filter((d) => has(text, d.name.split(" ").at(-1))),
      ...season.teams.filter((t) => has(text, t.name)),
    ].map((x) => x.id),
    sessionIds: season.events
      .flatMap((e) => e.sessions)
      .filter((s) => Date.parse(s.startsAt) <= item.publishedAt)
      .map((s) => s.id),
    rumor: /rumeur|rumour|rumor/i.test(item.title),
    important: item.kind === "official",
  };
}

// Même info vue par plusieurs flux : on garde la version la plus fiable.
export function merge(items) {
  const best = new Map();
  for (const x of [...items].sort((a, b) => RANK[a.kind] - RANK[b.kind])) {
    const key = sameStory(x.title);
    if (!best.has(key) && ![...best.values()].some((y) => y.link === x.link)) best.set(key, x);
  }
  return [...best.values()].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 80);
}

export async function loadNews(fetchFn = fetch) {
  const feeds = await Promise.allSettled(
    SOURCES.map(async (feed, i) => {
      // Dans un navigateur, le flux passe par server.mjs (les sources bloquent le CORS).
      const url = typeof document === "undefined" ? feed.url : `/api/news/${i}`;
      const res = await timedFetch(fetchFn, url, 10000, { headers: { "user-agent": "KeepPushing/0.3 (veille F1)" } });
      if (!res.ok) throw new Error(`${feed.name} ${res.status}`);
      return parseRss(await res.text(), feed);
    }),
  );
  const items = feeds.flatMap((f) => (f.status === "fulfilled" ? f.value : []));
  if (!items.length) throw new Error("Aucune actualité chargée");
  return merge(items);
}
