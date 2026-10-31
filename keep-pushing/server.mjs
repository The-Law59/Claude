// Serveur de Keep Pushing (version web + API pour l'app) :
// - export statique de l'app (dist/) ;
// - /api/news.json : veille actualités fusionnée, traduite en français si
//   ANTHROPIC_API_KEY est défini (les navigateurs ne peuvent pas lire les flux) ;
// - /api/… comptes, amis et paris (data/game.json).
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { copyFile, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { fetchFeeds, toArticle } from "./src/news.mjs";
import { loadRound, loadSeason } from "./src/jolpica.mjs";
import { createTranslator } from "./src/translate.mjs";
import * as accounts from "./src/accounts.mjs";
import * as account from "./src/account.mjs";
import * as bets from "./src/bets.mjs";
import * as leagues from "./src/leagues.mjs";
import * as seasons from "./src/seasons.mjs";
import * as community from "./src/community.mjs";
import * as notify from "./src/notify.mjs";
import * as admin from "./src/admin.mjs";
import * as monitor from "./src/monitor.mjs";
import { createPracticeSource, isPractice } from "./src/practice.mjs";
import * as ads from "./src/ads.mjs";
import * as mercato from "./src/mercato.mjs";
import { exactCount, highlights } from "./src/recap.mjs";

const DIST = join(import.meta.dirname, "dist");
const DATA = join(import.meta.dirname, "data");
const PORT = Number(process.env.PORT) || 3000;
const STARTED = Date.now();
// Pseudos admins (avis, modération du forum) : ADMINS=Quentin,Lucas dans .env.
const ADMINS = community.parseAdmins(process.env.ADMINS);
// Jeu Mercato : grille de cette saison-là (jouée pendant la saison précédente).
const MERCATO_YEAR = Number(process.env.MERCATO_YEAR) || 2028;
// Version de l'app : package.app.json dans l'image Docker, sinon package.json.
const readVersion = (file) =>
  readFile(join(import.meta.dirname, file), "utf8").then((t) => JSON.parse(t).version);
const VERSION = await readVersion("package.app.json")
  .catch(() => readVersion("package.json"))
  .catch(() => "?");
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
// Départ de la course du GP précédent : les paris du suivant ouvrent le lundi d'après.
const prevRace = (event) => {
  const i = season?.events.findIndex((e) => e.id === event.id) ?? -1;
  return i > 0 ? Date.parse(season.events[i - 1].sessions.at(-1).startsAt) : null;
};

// --- Comptes, amis et paris : état JSON, sauvegardé après chaque modification.
const GAME = join(DATA, "game.json");
const state = JSON.parse(
  await readFile(GAME, "utf8").catch(() => '{"users":{},"sessions":{},"bets":{}}'),
);
const failures = new Map();
let saving = Promise.resolve();
let saveError = null;
const save = () =>
  (saving = saving
    .then(() => mkdir(DATA, { recursive: true }))
    .then(() => writeFile(GAME, JSON.stringify(state)))
    .then(() => (saveError = null))
    .catch((e) => {
      saveError = e.message;
      console.warn(`Jeu non sauvegardé : ${e.message}`);
    }));
// Dernières visites (tableau de bord) : sauvegardées toutes les 10 min.
setInterval(save, 10 * 60 * 1000);

// Erreur (appli ou serveur) : enregistrée ; la première fois, les admins
// reçoivent une notification.
function reportError(details) {
  const { entry, fresh } = monitor.recordError(state, details);
  console.warn(`Erreur ${entry.source} (${entry.where || "?"}) : ${entry.message}`);
  if (fresh)
    for (const u of Object.values(state.users))
      if (community.isAdmin(u, ADMINS))
        notify.notify(state, u.id, {
          key: `error:${entry.signature}`,
          text: (n) =>
            `⚠ Nouvelle erreur ${entry.source === "app" ? "dans l'appli" : "serveur"} : ${entry.message.split("\n")[0].slice(0, 80)}`,
          link: "/admin",
        });
  save();
}
process.on("unhandledRejection", (e) =>
  reportError({
    source: "server",
    message: String(e?.message ?? e),
    stack: e?.stack,
    where: "promesse",
  }),
);
process.on("uncaughtException", async (e) => {
  reportError({ source: "server", message: e.message, stack: e.stack, where: "processus" });
  await saving;
  process.exit(1); // Docker relance le conteneur (restart: unless-stopped)
});
const allowReport = monitor.rateLimiter();

// Essais libres : fournisseur sous licence configuré dans .env (sinon null).
const practiceSource = createPracticeSource({
  provider: process.env.PRACTICE_PROVIDER,
  apiKey: process.env.PRACTICE_API_KEY,
});
const practiceCache = new Map(); // sessionId -> { rows, at }

// Clés publiques AdMob (vérification des récompenses), gardées 24 h.
let admobCache = { keys: {}, at: 0 };
async function admobKeys() {
  if (Date.now() - admobCache.at > 24 * 3600000) {
    const res = await fetch(ads.ADMOB_KEYS_URL);
    admobCache = { keys: ads.parseKeys(await res.json()), at: Date.now() };
  }
  return admobCache.keys;
}
state.final ??= {};
state.champions ??= {};

// Copie quotidienne de game.json dans data/backups/, 14 jours gardés.
const BACKUPS = join(DATA, "backups");
async function backup() {
  try {
    await saving;
    await mkdir(BACKUPS, { recursive: true });
    await copyFile(GAME, join(BACKUPS, seasons.backupName(new Date()))).catch(() => {});
    for (const old of seasons.backupsToDelete(await readdir(BACKUPS))) await rm(join(BACKUPS, old));
  } catch (e) {
    console.warn(`Sauvegarde : ${e.message}`);
  }
}
backup();
setInterval(backup, 24 * 3600 * 1000);

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
      [...bets.partsOf(event), "fastest", "dnf", "answer", "joker"].map((p) => [
        p,
        bets.closesAt(event, p),
      ]),
    ),
    opens: Object.fromEntries(
      [...bets.partsOf(event), "fastest", "dnf", "answer", "joker"].map((p) => [
        p,
        bets.opensAt(event, p, prevRace(event)),
      ]),
    ),
    question: { ...bets.questionOf(event), answer: bets.answerOf(bets.questionOf(event).id, race) },
    // GP où le joker de la saison est déjà posé (s'il y en a un autre).
    jokerOn: jokerEvent(user, event)?.name ?? null,
    mine,
    score: mine && bets.scoreBet(mine, r),
    // Classements réels (ids), pour la colonne « réel » du tableau.
    results: {
      ...Object.fromEntries(
        Object.entries(r)
          .filter(([, rows]) => rows?.length)
          .map(([t, rows]) => [t, rows.map((x) => x.driverId)]),
      ),
      // Qualifs : grille officielle (pénalités) dès la course publiée.
      ...(bets.qualiReference(r).grid && {
        Qualifying: bets.qualiReference(r).rows.map((x) => x.driverId),
      }),
      qualiGrid: bets.qualiReference(r).grid,
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

// GP où le joker gratuit de la saison est posé (les jokers gagnés par les
// pubs ne comptent pas).
const jokerEvent = (user, event) =>
  season?.events.find((e) => {
    const b = state.bets[e.id]?.[user.id];
    return e.id !== event.id && b?.joker && b.jokerSource !== "ads";
  });

const seasonId = () => season?.events[0]?.season;
const seasonDone = () => !!season && !!rounds.get(season.events.at(-1).id)?.final;
// Champions réels une fois la dernière course publiée (classements à jour).
const champions = () =>
  seasonDone() && {
    driver: [...season.drivers].sort((a, b) => b.points - a.points)[0]?.id,
    team: [...season.teams].sort((a, b) => b.points - a.points)[0]?.id,
  };

// Points de toutes les manches : week-ends en cours calculés, week-ends
// terminés figés dans state.final (anciennes saisons comprises), plus les
// pronos des champions en fin de saison.
async function allRounds() {
  await Promise.all(
    Object.keys(state.bets)
      .map(findEvent)
      .filter(Boolean)
      .map((e) => roundResults(e).catch(() => ({}))),
  );
  const live = bets.perRound(state.bets, bySession);
  let changed = false;
  for (const [id, byUser] of Object.entries(live))
    if (rounds.get(id)?.final && JSON.stringify(state.final[id]) !== JSON.stringify(byUser)) {
      state.final[id] = byUser;
      changed = true;
    }
  if (changed) save();
  const champ = champions();
  const extra = champ
    ? {
        [seasons.championsKey(seasonId())]: Object.fromEntries(
          Object.entries(state.champions[seasonId()] ?? {}).map(([uid, b]) => [
            uid,
            seasons.scoreChampions(b, champ),
          ]),
        ),
      }
    : {};
  return { ...state.final, ...live, ...extra };
}

async function rankings(user) {
  const all = await allRounds();
  const current = Object.fromEntries(
    Object.entries(all).filter(([key]) => seasons.seasonOf(key) === seasonId()),
  );
  const rank = (ids) =>
    bets
      .leaderboard(ids, current)
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
    leagues: leagues.leaguesOf(state, user).map((l) => ({
      id: l.id,
      name: l.name,
      code: l.code,
      rows: rank(l.members.filter((id) => state.users[id])),
    })),
    // Manche par manche : mes points, le meilleur du GP, ma place au général.
    history: bets
      .history(
        Object.keys(state.users),
        current,
        (season?.events ?? []).map((e) => e.id),
        user.id,
      )
      .map((h) => ({
        ...h,
        name: findEvent(h.eventId)?.name ?? h.eventId,
        best: { pseudo: state.users[h.best.id]?.pseudo ?? "—", points: h.best.points },
      })),
    palmares: palmares(user, all),
  };
}

// Récap d'un GP terminé pour un joueur : points, meilleurs coups, place au
// général avant/après, comparaison avec ses amis.
async function recap(user, eventId) {
  const event = findEvent(eventId);
  const bet = state.bets[eventId]?.[user.id];
  if (!event || !bet) return [404, { error: "Pas de pronos sur ce Grand Prix." }];
  await roundResults(event).catch(() => ({}));
  const results = bySession(eventId);
  if (!results?.Race?.length) return [404, { error: "Récap disponible après la course." }];
  const score = bets.scoreBet(bet, results);
  const board = await rankings(user);
  const i = board.history.findIndex((h) => h.eventId === eventId);
  const short = (id) =>
    season.drivers
      .find((d) => d.id === id)
      ?.name.split(" ")
      .at(-1) ?? "?";
  const byUser = state.bets[eventId];
  const friends = accounts.friendIds(state, user).filter((f) => byUser[f]);
  const beaten = friends.filter((f) => bets.scoreBet(byUser[f], results).total < score.total);
  return [
    200,
    {
      eventId,
      event: event.name,
      points: score.total,
      joker: score.joker,
      exact: exactCount(score),
      highlights: highlights(bet, score, short),
      best: board.history[i]?.best ?? null,
      rankBefore: board.history[i - 1]?.rank ?? null,
      rankAfter: board.history[i]?.rank ?? null,
      players: board.players,
      friends: { total: friends.length, beaten: beaten.length },
    },
  ];
}

// Palmarès : podium de chaque saison (en cours = provisoire), ma place, et
// le leader de chacune de mes ligues.
function palmares(user, all) {
  const pseudo = (id) => state.users[id]?.pseudo ?? "Ancien joueur";
  const mine = leagues.leaguesOf(state, user);
  return Object.entries(seasons.standingsBySeason(all))
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([s, rows]) => {
      const inLeague = (l) => rows.filter((r) => l.members.includes(r.id));
      return {
        season: s,
        done: s !== seasonId() || seasonDone(),
        left:
          s === seasonId()
            ? season.events.filter((e) => Date.parse(e.sessions.at(-1).startsAt) > Date.now())
                .length
            : 0,
        podium: rows
          .slice(0, 3)
          .map((r) => ({ pseudo: pseudo(r.id), points: r.points, me: r.id === user.id })),
        myRank: rows.findIndex((r) => r.id === user.id) + 1 || null,
        players: rows.length,
        leagues: mine
          .map((l) => ({ name: l.name, leader: inLeague(l)[0] }))
          .filter((l) => l.leader)
          .map((l) => ({ name: l.name, pseudo: pseudo(l.leader.id), points: l.leader.points })),
      };
    });
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

// --- Jeu Mercato.
async function mercatoApi(req, path, auth, adminOnly) {
  if (!season) return [503, { error: "Saison indisponible." }];
  const game = mercato.gameOf(state, MERCATO_YEAR);
  const pool = mercato.poolOf(game, season.drivers);
  const ids = { driverIds: pool.map((d) => d.id), teamIds: season.teams.map((t) => t.id) };
  const name = (id) => pool.find((d) => d.id === id)?.name ?? id;
  const teamName = (id) => season.teams.find((t) => t.id === id)?.name ?? id;
  // Prévient les joueurs concernés par une officialisation et les rumeurs tranchées.
  const announce = (official, resolved) => {
    const score = official && mercato.scoreOfficial(game, official);
    if (official)
      for (const uid of mercato.players(game)) {
        const pts = score.winners[uid];
        notify.notifyMercato(state, uid, {
          key: official.driverId,
          text: `Officiel : ${name(official.driverId)} chez ${teamName(official.teamId)} en ${MERCATO_YEAR}${pts ? ` · +${pts} pts 🎯` : ""}`,
        });
      }
    for (const r of resolved)
      for (const [uid, pts] of Object.entries(mercato.scoreRumor(r)))
        notify.notifyMercato(state, uid, {
          key: `rumor:${r.id}`,
          text: `Rumeur ${r.status === "confirmed" ? "confirmée" : "démentie"} : ${name(r.driverId)} → ${teamName(r.teamId)} · +${pts} pts`,
        });
  };
  const view = (user) => {
    const t = mercato.totals(game);
    return {
      year: MERCATO_YEAR,
      teams: season.teams.map((team) => ({
        id: team.id,
        name: team.name,
        today: season.drivers.filter((d) => d.teamId === team.id).map((d) => d.id),
      })),
      drivers: pool,
      mine: Object.fromEntries(
        Object.entries(game.picks[user.id] ?? {}).map(([teamId, l]) => [
          teamId,
          l.map((p) => p.driverId),
        ]),
      ),
      official: game.official.map((o) => {
        const sc = mercato.scoreOfficial(game, o);
        return { ...o, share: sc.share, points: sc.winners[user.id] ?? 0 };
      }),
      rumors: Object.values(game.rumors)
        .sort((a, b) => b.at - a.at)
        .map((r) => mercato.rumorView(r, user.id)),
      score: t[user.id] ?? { seats: 0, rumors: 0, total: 0, exact: 0 },
      admin: community.isAdmin(user, ADMINS),
    };
  };
  if (path === "/api/mercato") return [200, view(auth())];
  if (path === "/api/mercato/picks" && req.method === "PUT") {
    const user = auth();
    mercato.setPicks(game, user.id, await readJson(req), ids);
    await save();
    return [200, view(user)];
  }
  const voteRoute = path.match(/^\/api\/mercato\/rumors\/([\w-]+)\/vote$/);
  if (voteRoute && req.method === "POST") {
    const user = auth();
    mercato.vote(game, user.id, voteRoute[1], (await readJson(req))?.credible);
    await save();
    return [200, view(user)];
  }
  if (path === "/api/mercato/leaderboard") {
    const user = auth();
    const t = mercato.totals(game);
    const rank = (list) =>
      list
        .filter((id) => state.users[id])
        .map((id) => ({ id, ...(t[id] ?? { seats: 0, rumors: 0, total: 0, exact: 0 }) }))
        .sort(
          (a, b) =>
            b.total - a.total || state.users[a.id].pseudo.localeCompare(state.users[b.id].pseudo),
        )
        .map((row, i) => ({
          rank: i + 1,
          pseudo: state.users[row.id].pseudo,
          points: row.total,
          exact: row.exact,
          rumors: row.rumors,
          me: row.id === user.id,
        }));
    const general = rank(mercato.players(game));
    return [
      200,
      {
        general: general.filter((r, i) => i < 100 || r.me),
        players: general.length,
        friends: rank([...new Set([user.id, ...accounts.friendIds(state, user)])]),
      },
    ];
  }
  // --- Admins.
  if (path === "/api/mercato/suggestions") {
    adminOnly();
    const articles = (news ?? []).map((item) => toArticle(item, season));
    return [200, mercato.suggestions(articles, game)];
  }
  if (path === "/api/mercato/rumors" && req.method === "POST") {
    const user = adminOnly();
    mercato.addRumor(game, user, await readJson(req), ids);
    await save();
    return [201, view(user)];
  }
  const rumor = path.match(/^\/api\/mercato\/rumors\/([\w-]+)(\/resolve)?$/);
  if (rumor) {
    const user = adminOnly();
    if (req.method === "DELETE" && !rumor[2]) {
      if (!game.rumors[rumor[1]]) return [404, { error: "Rumeur introuvable." }];
      delete game.rumors[rumor[1]];
    } else if (req.method === "POST" && rumor[2]) {
      const r = mercato.resolveRumor(game, rumor[1], (await readJson(req))?.status);
      if (r.status !== "open") announce(null, [r]);
    } else return [405, { error: "Méthode non permise." }];
    await save();
    return [200, view(user)];
  }
  if (path === "/api/mercato/official" && req.method === "POST") {
    const user = adminOnly();
    const { official, resolved } = mercato.makeOfficial(game, await readJson(req), ids);
    announce(official, resolved);
    await save();
    return [201, view(user)];
  }
  const cancel = path.match(/^\/api\/mercato\/official\/([\w-]+)$/);
  if (cancel && req.method === "DELETE") {
    const user = adminOnly();
    mercato.cancelOfficial(game, cancel[1]);
    await save();
    return [200, view(user)];
  }
  if (path === "/api/mercato/drivers" && req.method === "POST") {
    const user = adminOnly();
    mercato.addDriver(game, (await readJson(req))?.name, pool);
    await save();
    return [201, view(user)];
  }
  return [404, { error: "Route inconnue." }];
}

async function api(req, path) {
  if (path === "/api/news.json") {
    if (!news) await firstNews;
    return [news ? 200 : 503, news ?? []];
  }
  const auth = () => {
    const user = accounts.authenticate(state, req.headers.authorization);
    user.lastSeen = Date.now();
    return user;
  };
  const adminOnly = () => {
    const user = auth();
    if (!community.isAdmin(user, ADMINS)) throw new accounts.GameError(403, "Réservé aux admins.");
    return user;
  };
  // --- Santé et erreurs (sans compte : l'appli peut planter avant connexion).
  if (path === "/api/health") {
    const h = monitor.health({ startedAt: STARTED, version: VERSION, season, news, saveError });
    return [h.ok ? 200 : 503, h];
  }
  if (path === "/api/errors" && req.method === "POST") {
    if (!allowReport(req.socket.remoteAddress)) return [429, { error: "Trop de rapports." }];
    const body = await readJson(req);
    reportError({ ...body, source: "app" });
    return [201, { ok: true }];
  }
  const practice = path.match(/^\/api\/practice\/([\w-]+):(\w+)$/);
  if (practice) {
    const [, eventId, type] = practice;
    const event = findEvent(eventId);
    if (!event || !isPractice(type)) return [404, { error: "Session inconnue." }];
    if (!practiceSource) return [200, { available: false, rows: [] }];
    const key = `${eventId}:${type}`;
    const hit = practiceCache.get(key);
    // Résultats gardés 6 h (ils ne bougent plus après la séance).
    if (!hit || Date.now() - hit.at > 6 * 3600000)
      practiceCache.set(key, {
        rows: await practiceSource(event, type, season.drivers),
        at: Date.now(),
      });
    return [200, { available: true, rows: practiceCache.get(key).rows }];
  }
  if (path.startsWith("/api/mercato")) return mercatoApi(req, path, auth, adminOnly);
  // --- Pubs récompensées (désactivées tant que ADS_ENABLED n'est pas à 1).
  if (path.startsWith("/api/ads/")) {
    if (process.env.ADS_ENABLED !== "1") return [404, { error: "Pubs désactivées." }];
    if (path === "/api/ads/admob-ssv") {
      // Appel de Google : signature vérifiée avec ses clés publiques.
      const query = new URL(req.url, "http://x").search.slice(1);
      const reward = ads.verifySsv(query, await admobKeys());
      if (!reward || !state.users[reward.userId] || !findEvent(reward.eventId))
        return [400, { error: "Récompense invalide." }];
      ads.recordReward(state, reward);
      await save();
      return [200, { ok: true }];
    }
    if (path === "/api/ads/status") {
      const user = auth();
      const event = findEvent(new URL(req.url, "http://x").searchParams.get("event"));
      if (!event) return [404, { error: "Grand Prix inconnu." }];
      const watched = ads.adsWatched(state, user.id, event.id);
      return [
        200,
        {
          freeJokerUsedOn: jokerEvent(user, event)?.name ?? null,
          watched,
          needed: ads.ADS_PER_JOKER,
          unlocked: watched >= ads.ADS_PER_JOKER,
        },
      ];
    }
  }
  // --- Tableau de bord des admins.
  if (path === "/api/admin/stats") {
    adminOnly();
    return [
      200,
      {
        ...admin.stats(state, { events: season?.events ?? [] }),
        health: monitor.health({ startedAt: STARTED, version: VERSION, season, news, saveError }),
        latestErrors: (state.errors ?? []).slice(0, 20),
      },
    ];
  }
  // Points de la saison en cours, par joueur.
  const seasonTotals = async () => {
    const all = await allRounds();
    const current = Object.fromEntries(
      Object.entries(all).filter(([key]) => seasons.seasonOf(key) === seasonId()),
    );
    return Object.fromEntries(
      bets.leaderboard(Object.keys(state.users), current).map((r) => [r.id, r.points]),
    );
  };
  if (path === "/api/admin/players") {
    adminOnly();
    const totals = await seasonTotals();
    return [
      200,
      admin.players(state, {
        points: (id) => totals[id] ?? 0,
        isAdmin: (u) => community.isAdmin(u, ADMINS),
      }),
    ];
  }
  const player = path.match(/^\/api\/admin\/players\/([\w-]+)(\/password)?$/);
  if (player) {
    const me = adminOnly();
    const target = state.users[player[1]];
    if (!target) return [404, { error: "Joueur introuvable." }];
    if (player[2] && req.method === "POST") {
      // Nouveau mot de passe à transmettre au joueur ; ses appareils sont déconnectés.
      const password = randomBytes(6).toString("base64url");
      await accounts.resetPassword(state, target.pseudo, password);
      await save();
      return [200, { pseudo: target.pseudo, password }];
    }
    if (!player[2] && req.method === "DELETE") {
      if (target.id === me.id)
        return [400, { error: "Utilisez « Mon compte » pour votre compte." }];
      if (community.isAdmin(target, ADMINS))
        return [403, { error: "Retirez-le d’abord de ADMINS pour supprimer un admin." }];
      account.removeUser(state, target.id);
      await save();
      return [200, { ok: true }];
    }
    return [405, { error: "Méthode non permise." }];
  }
  const adminBets = path.match(/^\/api\/admin\/bets\/([\w-]+)(?:\/([\w-]+))?$/);
  if (adminBets) {
    const me = adminOnly();
    const event = findEvent(adminBets[1]);
    if (!event) return [404, { error: "Grand Prix inconnu." }];
    if (adminBets[2] && req.method === "PUT") {
      const body = await readJson(req);
      admin.setBetFor(
        state,
        { eventId: event.id, userId: adminBets[2], part: body?.part, ids: body?.ids, by: me.id },
        { driverIds: season.drivers.map((d) => d.id) },
      );
      await save();
    }
    return [200, { parts: bets.partsOf(event), rows: admin.betsOf(state, event.id) }];
  }
  if (path === "/api/admin/errors/resolve" && req.method === "POST") {
    adminOnly();
    const body = await readJson(req);
    admin.resolveErrors(state, body?.all ? null : String(body?.signature ?? "-"));
    await save();
    return [200, { errors: (state.errors ?? []).slice(0, 20), total: (state.errors ?? []).length }];
  }
  const exportRoute = path.match(/^\/api\/admin\/export\/(\w+)$/);
  if (exportRoute) {
    adminOnly();
    const totals = await seasonTotals();
    const csv = admin.exportCsv(state, exportRoute[1], { points: (id) => totals[id] ?? 0 });
    if (csv === null) return [404, { error: "Export inconnu." }];
    const day = new Date().toISOString().slice(0, 10);
    return [200, { filename: `keep-pushing-${exportRoute[1]}-${day}.csv`, csv }];
  }
  const changed = async (result) => (await save(), result);
  if (path === "/api/register" && req.method === "POST")
    return [201, await changed(await accounts.register(state, await readJson(req)))];
  if (path === "/api/login" && req.method === "POST")
    return [200, await changed(await accounts.login(state, await readJson(req), { failures }))];
  if (path === "/api/logout" && req.method === "POST") {
    accounts.logout(state, req.headers.authorization);
    return [200, await changed({})];
  }
  // --- Mon compte : mot de passe, pseudo, export, suppression.
  if (path === "/api/account/password" && req.method === "POST") {
    await account.changePassword(state, auth(), await readJson(req), req.headers.authorization);
    return [200, await changed({ ok: true })];
  }
  if (path === "/api/account/pseudo" && req.method === "POST")
    return [200, await changed(await account.changePseudo(state, auth(), await readJson(req)))];
  if (path === "/api/account/export") return [200, account.exportData(state, auth())];
  if (path === "/api/account/delete" && req.method === "POST") {
    await account.deleteAccount(state, auth(), await readJson(req));
    return [200, await changed({ deleted: true })];
  }
  if (path === "/api/me") {
    const user = auth();
    return [200, { ...accounts.friendsView(state, user), admin: community.isAdmin(user, ADMINS) }];
  }
  // --- Avis et forum.
  if (path === "/api/feedback") {
    const user = auth();
    if (req.method === "POST") {
      community.submitFeedback(state, user, await readJson(req));
      await save();
      return [201, { ok: true }];
    }
    if (!community.isAdmin(user, ADMINS)) return [403, { error: "Réservé aux admins." }];
    return [200, community.feedbackSummary(state)];
  }
  if (path === "/api/forum") {
    const user = auth();
    if (req.method === "POST") {
      const t = community.createTopic(state, user, await readJson(req), {
        eventIds: (season?.events ?? []).map((e) => e.id),
      });
      await save();
      return [201, { id: t.id }];
    }
    const category = new URL(req.url, "http://x").searchParams.get("category");
    return [
      200,
      {
        topics: community.listTopics(state, user, category),
        admin: community.isAdmin(user, ADMINS),
        reported: community.isAdmin(user, ADMINS) ? community.reported(state) : [],
      },
    ];
  }
  if (path === "/api/forum/block" && req.method === "POST") {
    const user = auth();
    community.block(user, (await readJson(req)).userId);
    return [200, await changed({ ok: true })];
  }
  const topic = path.match(/^\/api\/forum\/([\w-]+)(?:\/([\w-]+)(\/report)?)?$/);
  if (topic) {
    const user = auth();
    const admin = community.isAdmin(user, ADMINS);
    const [, topicId, postId, isReport] = topic;
    if (req.method === "POST" && !postId) {
      community.reply(state, user, topicId, await readJson(req));
      notify.notifyReply(state, state.forum.topics[topicId], user);
    }
    if (req.method === "POST" && isReport) community.report(state, user, topicId, postId);
    if (req.method === "DELETE" && postId) {
      community.deletePost(state, user, topicId, postId, admin);
      await save();
      if (!state.forum.topics[topicId]) return [200, { deleted: true }];
    }
    if (req.method === "POST") await save();
    return [200, community.topicView(state, user, topicId, admin)];
  }
  if (path === "/api/friends" && req.method === "POST") {
    const user = auth();
    const { pseudo } = await readJson(req);
    const already = new Set(user.friends);
    accounts.addFriend(state, user, pseudo);
    const added = user.friends.find((id) => !already.has(id));
    if (added) notify.notifyFriend(state, user, state.users[added]);
    return [200, await changed(accounts.friendsView(state, user))];
  }
  const friend = path.match(/^\/api\/friends\/([\w-]+)$/);
  if (friend && req.method === "DELETE") {
    const user = auth();
    accounts.removeFriend(state, user, friend[1]);
    return [200, await changed(accounts.friendsView(state, user))];
  }
  if (path === "/api/leaderboard") return [200, await rankings(auth())];
  if (path === "/api/notifications") {
    const user = auth();
    if (req.method === "POST") {
      const { ids, link } = await readJson(req);
      notify.markRead(
        state,
        user.id,
        Array.isArray(ids) ? ids : undefined,
        typeof link === "string" ? link : undefined,
      );
      await save();
    }
    return [200, notify.inbox(state, user.id)];
  }
  const recapRoute = path.match(/^\/api\/recap\/([\w-]+)$/);
  if (recapRoute) return recap(auth(), recapRoute[1]);
  if (path === "/api/leagues" && req.method === "POST") {
    const user = auth();
    leagues.createLeague(state, user, await readJson(req));
    return [201, await changed(await rankings(user))];
  }
  if (path === "/api/leagues/join" && req.method === "POST") {
    const user = auth();
    leagues.joinLeague(state, user, await readJson(req));
    return [200, await changed(await rankings(user))];
  }
  const chat = path.match(/^\/api\/leagues\/([\w-]+)\/messages(?:\/([\w-]+))?$/);
  if (chat) {
    const user = auth();
    if (req.method === "POST") {
      leagues.postMessage(state, user, chat[1], await readJson(req));
      notify.notifyLeague(state, state.leagues[chat[1]], user);
    }
    if (req.method === "DELETE" && chat[2]) leagues.deleteMessage(state, user, chat[1], chat[2]);
    if (req.method !== "GET") await save();
    return [200, leagues.messagesOf(state, user, chat[1])];
  }
  if (path === "/api/champions") {
    const user = auth();
    const id = seasonId();
    if (!id) return [503, { error: "Saison indisponible." }];
    const closes = seasons.championsCloseAt(season.events);
    state.champions[id] ??= {};
    if (req.method === "PUT") {
      state.champions[id][user.id] = seasons.mergeChampions(
        state.champions[id][user.id],
        await readJson(req),
        {
          driverIds: season.drivers.map((d) => d.id),
          teamIds: season.teams.map((t) => t.id),
          closes,
        },
      );
      await save();
    }
    const mine = state.champions[id][user.id] ?? null;
    const champ = champions();
    return [
      200,
      {
        season: id,
        closes,
        mine,
        champions: champ || null,
        points: champ && mine ? seasons.scoreChampions(mine, champ) : null,
        // Paris des amis visibles une fois fermés.
        friends:
          Date.now() >= closes
            ? accounts
                .friendIds(state, user)
                .filter((f) => state.champions[id][f])
                .map((f) => ({ pseudo: state.users[f].pseudo, ...state.champions[id][f] }))
            : [],
      },
    ];
  }
  const league = path.match(/^\/api\/leagues\/([\w-]+)$/);
  if (league && req.method === "DELETE") {
    const user = auth();
    leagues.leaveLeague(state, user, league[1]);
    return [200, await changed(await rankings(user))];
  }
  // Réglages synchronisés entre appareils (favoris, anti-spoil…) : stockés
  // tels quels pour le joueur, validés par l'app à la lecture.
  if (path === "/api/settings") {
    const user = auth();
    if (req.method === "PUT") {
      const { data } = await readJson(req);
      if (!data || typeof data !== "object" || Array.isArray(data))
        return [400, { error: "Réglages invalides." }];
      user.settings = { data, at: Date.now() };
      await save();
    }
    return [200, user.settings ?? { data: null, at: 0 }];
  }
  const bet = path.match(/^\/api\/bets\/([\w-]+)$/);
  if (bet) {
    const user = auth();
    const event = findEvent(bet[1]);
    if (!event) return [404, { error: "Grand Prix inconnu." }];
    if (req.method === "PUT") {
      const body = await readJson(req);
      // Joker : le gratuit, sinon celui débloqué par 3 pubs sur ce GP.
      const source =
        body?.joker === true
          ? ads.jokerSource(state, user.id, event.id, jokerEvent(user, event))
          : null;
      if (body?.joker === true && !source)
        return [409, { error: `Joker déjà posé sur ${jokerEvent(user, event).name}.` }];
      state.bets[event.id] ??= {};
      state.bets[event.id][user.id] = bets.mergeBet(
        event,
        state.bets[event.id][user.id],
        body,
        (season?.drivers ?? []).map((d) => d.id),
        Date.now(),
        prevRace(event),
      );
      const saved = state.bets[event.id][user.id];
      if (saved.joker && source) saved.jokerSource = source;
      if (!saved.joker) delete saved.jokerSource;
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
              reportError({ source: "server", message: e.message, stack: e.stack, where: path });
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
