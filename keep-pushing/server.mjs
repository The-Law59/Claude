// Serveur de Keep Pushing (version web + API pour l'app) :
// - export statique de l'app (dist/) ;
// - /api/news.json : veille actualités fusionnée, traduite en français si
//   ANTHROPIC_API_KEY est défini (les navigateurs ne peuvent pas lire les flux) ;
// - /api/groups… : pronostics entre amis, sauvegardés dans data/.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { fetchFeeds } from "./src/news.mjs";
import { loadRound, loadSeason } from "./src/jolpica.mjs";
import { createTranslator } from "./src/translate.mjs";
import * as predictions from "./src/predictions.mjs";
import { resultsReadyAt } from "./src/model.mjs";

const DIST = join(import.meta.dirname, "dist");
const DATA = join(import.meta.dirname, "data");
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

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const translate = client && (await createTranslator({ client, cacheFile: join(DATA, "translations.json") }));
if (!client) console.warn("ANTHROPIC_API_KEY absent : actualités anglaises non traduites.");

// --- Veille actualités, rafraîchie toutes les 5 min en tâche de fond.
let news = null;
let newsRunning = false;
let newsReady;
const firstNews = new Promise((r) => (newsReady = r));
async function refreshNews() {
  if (newsRunning) return;
  newsRunning = true;
  try {
    const items = await fetchFeeds();
    if (!news) news = items; // premier démarrage : version anglaise tout de suite
    newsReady();
    news = translate ? await translate(items) : items;
  } catch (e) {
    console.warn(`Veille : ${e.message}`);
    newsReady();
  } finally {
    newsRunning = false;
  }
}
refreshNews();
setInterval(refreshNews, 5 * 60 * 1000);

// --- Saison (calendrier, pilotes) rafraîchie toutes les heures ; résultats
// d'un GP gardés en mémoire une fois publiés (ils ne changent plus).
let season = null;
const refreshSeason = () =>
  loadSeason()
    .then((s) => (season = s))
    .catch((e) => console.warn(`Saison : ${e.message}`));
await refreshSeason();
setInterval(refreshSeason, 60 * 60 * 1000);
const rounds = new Map();
async function roundResults(event) {
  if (rounds.has(event.id)) return rounds.get(event.id);
  if (Date.now() < resultsReadyAt(event)) return {};
  const results = await loadRound(event);
  if (results[`${event.id}:Race`]?.length) rounds.set(event.id, results);
  return results;
}

// --- Pronostics : état JSON, sauvegardé après chaque modification.
const PREDICTIONS = join(DATA, "predictions.json");
const state = JSON.parse(await readFile(PREDICTIONS, "utf8").catch(() => '{"groups":{}}'));
let saving = Promise.resolve();
const save = () =>
  (saving = saving
    .then(() => mkdir(DATA, { recursive: true }))
    .then(() => writeFile(PREDICTIONS, JSON.stringify(state)))
    .catch((e) => console.warn(`Pronostics non sauvegardés : ${e.message}`)));

async function groupView(groupId, memberId) {
  const events = season?.events ?? [];
  const group = state.groups[groupId];
  // Résultats nécessaires au calcul des points des GP pronostiqués.
  await Promise.all(
    Object.keys(group.predictions)
      .map((id) => events.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => roundResults(e).catch(() => ({}))),
  );
  const resultsFor = (eventId) => {
    const r = rounds.get(eventId);
    return r && { race: r[`${eventId}:Race`], qualifying: r[`${eventId}:Qualifying`] };
  };
  return predictions.view(state, groupId, memberId, { events, resultsFor });
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10000) throw new predictions.PredictionError(413, "Requête trop grosse.");
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new predictions.PredictionError(400, "JSON invalide.");
  }
}

async function api(req, path) {
  if (path === "/api/news.json") {
    if (!news) await firstNews;
    return [news ? 200 : 503, news ?? []];
  }
  if (path === "/api/groups" && req.method === "POST") {
    const session = predictions.createGroup(state, await readJson(req));
    await save();
    return [201, session];
  }
  if (path === "/api/groups/join" && req.method === "POST") {
    const session = predictions.joinGroup(state, await readJson(req));
    await save();
    return [200, session];
  }
  const m = path.match(/^\/api\/groups\/([\w-]+)(?:\/predictions\/([\w-]+))?$/);
  if (m) {
    const { member } = predictions.authenticate(state, m[1], req.headers.authorization);
    if (m[2] && req.method === "PUT") {
      predictions.setPrediction(state, {
        groupId: m[1],
        memberId: member.id,
        event: season?.events.find((e) => e.id === m[2]),
        body: await readJson(req),
        driverIds: (season?.drivers ?? []).map((d) => d.id),
      });
      await save();
    }
    return [200, await groupView(m[1], member.id)];
  }
  return [404, { error: "Route inconnue." }];
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    if (path.startsWith("/api/")) {
      const [status, body] =
        req.method === "OPTIONS"
          ? [204, ""] // pré-vol CORS
          : await api(req, path).catch((e) => {
              if (e instanceof predictions.PredictionError) return [e.status, { error: e.message }];
              console.warn(`API ${path} : ${e.message}`);
              return [502, { error: "Erreur du serveur." }];
            });
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, POST, PUT",
      });
      return res.end(status === 204 ? "" : JSON.stringify(body));
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
