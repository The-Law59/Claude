// Serveur de Keep Pushing (version web + API pour l'app) :
// - export statique de l'app (dist/) ;
// - /api/news.json : veille actualités fusionnée, traduite en français si
//   ANTHROPIC_API_KEY est défini (les navigateurs ne peuvent pas lire les flux) ;
// - /api/… comptes, amis et paris (data/game.json).
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { fetchFeeds } from "./src/news.mjs";
import { loadRound, loadSeason } from "./src/jolpica.mjs";
import { createTranslator } from "./src/translate.mjs";
import * as accounts from "./src/accounts.mjs";
import * as bets from "./src/bets.mjs";

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
const translate =
  client && (await createTranslator({ client, cacheFile: join(DATA, "translations.json") }));
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

// Résultats d'un week-end : gardés pour de bon une fois la course publiée,
// sinon redemandés au plus toutes les 10 min. Une requête Jolpica à la fois
// (l'API limite les rafales).
const rounds = new Map();
const inflight = new Map();
let queue = Promise.resolve();
async function roundResults(event) {
  const cached = rounds.get(event.id);
  if (cached && (cached.final || Date.now() - cached.at < 10 * 60 * 1000)) return cached.results;
  const first = Math.min(...bets.partsOf(event).map((p) => bets.closesAt(event, p)));
  if (Date.now() < first) return {};
  if (!inflight.has(event.id)) {
    const next = queue
      .then(() => loadRound(event))
      .then((results) => {
        rounds.set(event.id, {
          results,
          at: Date.now(),
          final: !!results[`${event.id}:Race`]?.length,
        });
        return results;
      })
      .finally(() => inflight.delete(event.id));
    inflight.set(event.id, next);
    queue = next.catch(() => {});
  }
  return inflight.get(event.id);
}
const bySession = (eventId) => {
  const r = rounds.get(eventId)?.results;
  return (
    r && Object.fromEntries(["Qualifying", "Sprint", "Race"].map((t) => [t, r[`${eventId}:${t}`]]))
  );
};
const findEvent = (id) => season?.events.find((e) => e.id === id);

// --- Comptes, amis et paris : état JSON, sauvegardé après chaque modification.
const GAME = join(DATA, "game.json");
const state = JSON.parse(
  await readFile(GAME, "utf8").catch(() => '{"users":{},"sessions":{},"bets":{}}'),
);
const failures = new Map();
let saving = Promise.resolve();
const save = () =>
  (saving = saving
    .then(() => mkdir(DATA, { recursive: true }))
    .then(() => writeFile(GAME, JSON.stringify(state)))
    .catch((e) => console.warn(`Jeu non sauvegardé : ${e.message}`)));

async function betView(event, user) {
  const results = await roundResults(event).catch(() => ({}));
  const r = bySession(event.id) ?? {};
  const byUser = state.bets[event.id] ?? {};
  const mine = byUser[user.id] ?? null;
  const race = results[`${event.id}:Race`];
  return {
    eventId: event.id,
    parts: bets.partsOf(event),
    closes: Object.fromEntries(
      [...bets.partsOf(event), "fastest", "dnf"].map((p) => [p, bets.closesAt(event, p)]),
    ),
    mine,
    score: mine && bets.scoreBet(mine, r),
    // Classements réels (ids), pour la colonne « réel » du tableau.
    results: {
      ...Object.fromEntries(
        Object.entries(r)
          .filter(([, rows]) => rows?.length)
          .map(([t, rows]) => [t, rows.map((x) => x.driverId)]),
      ),
      fastest: race?.find((x) => x.fastestLap)?.driverId ?? null,
      dnf: race?.length ? bets.dnfCount(race) : null,
    },
    friends: accounts
      .friendIds(state, user)
      .filter((id) => byUser[id])
      .map((id) => ({
        pseudo: state.users[id].pseudo,
        bet: bets.visibleBet(event, byUser[id]),
        score: bets.scoreBet(bets.visibleBet(event, byUser[id]), r).total,
      })),
  };
}

async function rankings(user) {
  await Promise.all(
    Object.keys(state.bets)
      .map(findEvent)
      .filter(Boolean)
      .map((e) => roundResults(e).catch(() => ({}))),
  );
  const rank = (ids) =>
    bets
      .leaderboard(ids, state.bets, bySession)
      .sort(
        (a, b) =>
          b.points - a.points || state.users[a.id].pseudo.localeCompare(state.users[b.id].pseudo),
      )
      .map((row, i) => ({
        rank: i + 1,
        pseudo: state.users[row.id].pseudo,
        points: row.points,
        weekends: row.weekends,
        me: row.id === user.id,
      }));
  const general = rank(Object.keys(state.users));
  return {
    // Les 100 premiers, plus sa propre ligne si on est plus loin.
    general: general.filter((r, i) => i < 100 || r.me),
    players: general.length,
    friends: rank([user.id, ...accounts.friendIds(state, user)]),
  };
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10000) throw new accounts.GameError(413, "Requête trop grosse.");
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new accounts.GameError(400, "JSON invalide.");
  }
}

async function api(req, path) {
  if (path === "/api/news.json") {
    if (!news) await firstNews;
    return [news ? 200 : 503, news ?? []];
  }
  const auth = () => accounts.authenticate(state, req.headers.authorization);
  const changed = async (result) => (await save(), result);
  if (path === "/api/register" && req.method === "POST")
    return [201, await changed(await accounts.register(state, await readJson(req)))];
  if (path === "/api/login" && req.method === "POST")
    return [200, await changed(await accounts.login(state, await readJson(req), { failures }))];
  if (path === "/api/logout" && req.method === "POST") {
    accounts.logout(state, req.headers.authorization);
    return [200, await changed({})];
  }
  if (path === "/api/me") return [200, accounts.friendsView(state, auth())];
  if (path === "/api/friends" && req.method === "POST") {
    const user = auth();
    accounts.addFriend(state, user, (await readJson(req)).pseudo);
    return [200, await changed(accounts.friendsView(state, user))];
  }
  const friend = path.match(/^\/api\/friends\/([\w-]+)$/);
  if (friend && req.method === "DELETE") {
    const user = auth();
    accounts.removeFriend(state, user, friend[1]);
    return [200, await changed(accounts.friendsView(state, user))];
  }
  if (path === "/api/leaderboard") return [200, await rankings(auth())];
  const bet = path.match(/^\/api\/bets\/([\w-]+)$/);
  if (bet) {
    const user = auth();
    const event = findEvent(bet[1]);
    if (!event) return [404, { error: "Grand Prix inconnu." }];
    if (req.method === "PUT") {
      state.bets[event.id] ??= {};
      state.bets[event.id][user.id] = bets.mergeBet(
        event,
        state.bets[event.id][user.id],
        await readJson(req),
        (season?.drivers ?? []).map((d) => d.id),
      );
      await save();
    }
    return [200, await betView(event, user)];
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
              if (e instanceof accounts.GameError) return [e.status, { error: e.message }];
              console.warn(`API ${path} : ${e.message}`);
              return [502, { error: "Erreur du serveur." }];
            });
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, POST, PUT, DELETE",
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
