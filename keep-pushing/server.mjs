// Serveur de la version web : sert l'export statique (dist/) et relaie les
// flux RSS, que les navigateurs bloquent (pas d'en-tête CORS côté sources).
// Seules les sources listées dans src/news.mjs sont relayées : pas de proxy ouvert.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { SOURCES } from "./src/news.mjs";

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
const cache = new Map(); // index de source -> { at, body }
const TTL = 5 * 60 * 1000;

async function news(index) {
  const source = SOURCES[index];
  if (!source) return { status: 404, body: "Source inconnue" };
  const hit = cache.get(index);
  if (hit && Date.now() - hit.at < TTL) return { status: 200, body: hit.body };
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(10000),
    headers: { "user-agent": "KeepPushing/0.3 (veille F1)" },
  });
  if (!res.ok) return { status: 502, body: `Source ${res.status}` };
  const body = await res.text();
  cache.set(index, { at: Date.now(), body });
  return { status: 200, body };
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const match = path.match(/^\/api\/news\/(\d+)$/);
    if (match) {
      const { status, body } = await news(Number(match[1]));
      res.writeHead(status, { "content-type": "application/xml; charset=utf-8" });
      return res.end(body);
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
