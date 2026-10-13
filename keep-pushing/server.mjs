// Serveur de la version web : sert l'export statique (dist/) et la veille
// actualités (/api/news.json), que les navigateurs ne peuvent pas lire eux-mêmes
// (pas d'en-tête CORS côté sources). Les articles anglais sont traduits en
// français si ANTHROPIC_API_KEY est défini.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { fetchFeeds } from "./src/news.mjs";
import { createTranslator } from "./src/translate.mjs";

const DIST = join(import.meta.dirname, "dist");
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

const translate = process.env.ANTHROPIC_API_KEY
  ? await createTranslator({
      client: new Anthropic(),
      cacheFile: join(import.meta.dirname, "data", "translations.json"),
    })
  : null;
if (!translate) console.warn("ANTHROPIC_API_KEY absent : actualités anglaises non traduites.");

// Veille rafraîchie toutes les 5 min en tâche de fond : une requête ne
// patiente jamais pendant une traduction.
let latest = null;
let running = false;
let ready;
const firstLoad = new Promise((r) => (ready = r));
async function refresh() {
  if (running) return;
  running = true;
  try {
    const items = await fetchFeeds();
    // Premier démarrage : version anglaise servie tout de suite, traduite ensuite.
    if (!latest) latest = items;
    ready();
    if (translate) latest = await translate(items);
    else latest = items;
  } catch (e) {
    console.warn(`Veille : ${e.message}`);
    ready();
  } finally {
    running = false;
  }
}
refresh();
setInterval(refresh, 5 * 60 * 1000);

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    if (path === "/api/news.json") {
      if (!latest) await firstLoad;
      res.writeHead(latest ? 200 : 503, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
      });
      return res.end(JSON.stringify(latest ?? []));
    }
    // normalize + préfixe : empêche de sortir de dist/ avec « .. ».
    const file = normalize(join(DIST, path));
    // Chemin sans extension = route de l'app : on renvoie index.html.
    const target = file.startsWith(DIST) && extname(file) ? file : join(DIST, "index.html");
    const body = await readFile(target).catch(() => null);
    if (!body) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return res.end("Introuvable");
    }
    res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Erreur : ${e.message}`);
  }
}).listen(PORT, () => console.log(`Keep Pushing web sur http://0.0.0.0:${PORT}`));
