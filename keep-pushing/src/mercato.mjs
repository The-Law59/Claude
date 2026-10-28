// Jeu Mercato : deviner la grille de la saison suivante (2028, joué pendant
// la saison 2027) au fil des rumeurs.
// - Ma grille : deux pilotes par écurie, modifiable tant que le transfert
//   n'est pas officiel. Un admin officialise chaque pilote (communiqué).
// - Points : 10 par pilote bien placé avant l'annonce ; « coup de flair »
//   +10 si moins de 20 % des joueurs l'avaient vu, +5 sous 40 %.
// - Rumeurs : publiées par un admin (souvent depuis la veille actus), chacun
//   vote « crédible » ou « bidon » ; 3 pts si on a vu juste, +2 contre la majorité.
import { randomBytes } from "node:crypto";
import { fail } from "./errors.mjs";

export const MERCATO_POINTS = { seat: 10, flair: 10, hunch: 5, vote: 3, against: 2 };
export const SEATS = 2;

// Partie du jeu dans l'état du serveur.
export function gameOf(state, year) {
  state.mercato ??= {};
  return (state.mercato[year] ??= {
    picks: {},
    official: [],
    rumors: {},
    extraDrivers: [],
  });
}

// Pilotes jouables : ceux de la saison + ceux ajoutés par les admins (F2, réservistes…).
export const poolOf = (game, drivers) => [
  ...drivers.map((d) => ({ id: d.id, name: d.name })),
  ...game.extraDrivers,
];

const officialOf = (game, driverId) => game.official.find((o) => o.driverId === driverId);

// Enregistre la grille d'un joueur. body : { teamId: [driverId, driverId] }.
// Un pilote officialisé ne bouge plus : il reste là où le joueur l'avait mis
// (bien ou mal), et on ne peut plus l'ajouter ailleurs.
export function setPicks(game, userId, body, { teamIds, driverIds, now = Date.now() }) {
  if (!body || typeof body !== "object") fail(400, "Grille invalide.");
  const prev = game.picks[userId] ?? {};
  const next = {};
  const seen = new Set();
  for (const teamId of teamIds) {
    const list = body[teamId] ?? [];
    if (!Array.isArray(list) || list.length > SEATS) fail(400, "Deux pilotes par écurie.");
    const before = prev[teamId] ?? [];
    next[teamId] = [];
    for (const id of list) {
      if (!id) continue;
      if (!driverIds.includes(id)) fail(400, "Pilote inconnu.");
      if (seen.has(id)) fail(400, "Un pilote ne peut être que dans une écurie.");
      seen.add(id);
      const kept = before.find((p) => p.driverId === id);
      next[teamId].push(kept ?? { driverId: id, at: now });
    }
  }
  // Pilotes officialisés : leur place dans la grille du joueur est figée.
  for (const o of game.official) {
    const had = Object.entries(prev).find(([, l]) => l.some((p) => p.driverId === o.driverId));
    const has = Object.entries(next).find(([, l]) => l.some((p) => p.driverId === o.driverId));
    if ((had?.[0] ?? null) !== (has?.[0] ?? null))
      fail(409, "Ce transfert est déjà officiel : il ne se modifie plus.");
  }
  game.picks[userId] = next;
  return next;
}

// Joueurs qui avaient ce pilote dans cette écurie avant l'annonce.
function foresaw(game, o) {
  return Object.entries(game.picks)
    .filter(([, grid]) =>
      (grid[o.teamId] ?? []).some((p) => p.driverId === o.driverId && p.at < o.at),
    )
    .map(([userId]) => userId);
}
// Joueurs ayant une grille avant l'annonce (base du pourcentage).
const playersAt = (game, at) =>
  Object.values(game.picks).filter((grid) =>
    Object.values(grid).some((l) => l.some((p) => p.at < at)),
  ).length;

// Points de chaque officialisation : { driverId, teamId, share, winners: {userId: pts} }.
export function scoreOfficial(game, o) {
  const winners = foresaw(game, o);
  const share = winners.length / Math.max(1, playersAt(game, o.at));
  const bonus = share < 0.2 ? MERCATO_POINTS.flair : share < 0.4 ? MERCATO_POINTS.hunch : 0;
  return {
    driverId: o.driverId,
    teamId: o.teamId,
    share,
    points: MERCATO_POINTS.seat + bonus,
    winners: Object.fromEntries(winners.map((u) => [u, MERCATO_POINTS.seat + bonus])),
  };
}

// Points d'une rumeur tranchée : { userId: pts }.
export function scoreRumor(r) {
  if (r.status === "open") return {};
  const truth = r.status === "confirmed";
  const votes = Object.entries(r.votes);
  const yes = votes.filter(([, v]) => v.credible).length;
  const majority = yes * 2 === votes.length ? null : yes * 2 > votes.length;
  return Object.fromEntries(
    votes
      .filter(([, v]) => v.credible === truth && v.at < r.resolvedAt)
      .map(([u]) => [
        u,
        MERCATO_POINTS.vote +
          (majority !== null && majority !== truth ? MERCATO_POINTS.against : 0),
      ]),
  );
}

// Total par joueur : { userId: { seats, rumors, total, exact } }.
export function totals(game) {
  const out = {};
  const add = (u, key, pts) => {
    out[u] ??= { seats: 0, rumors: 0, total: 0, exact: 0 };
    out[u][key] += pts;
    out[u].total += pts;
    if (key === "seats") out[u].exact += 1;
  };
  for (const o of game.official)
    for (const [u, pts] of Object.entries(scoreOfficial(game, o).winners)) add(u, "seats", pts);
  for (const r of Object.values(game.rumors))
    for (const [u, pts] of Object.entries(scoreRumor(r))) add(u, "rumors", pts);
  return out;
}

// Joueurs du jeu : une grille ou au moins un vote.
export function players(game) {
  const ids = new Set(Object.keys(game.picks));
  for (const r of Object.values(game.rumors)) for (const u of Object.keys(r.votes)) ids.add(u);
  return [...ids];
}

// --- Rumeurs.
const clean = (t, max) =>
  String(t ?? "")
    .trim()
    .slice(0, max);

export function addRumor(
  game,
  user,
  body,
  { driverIds, teamIds, now = Date.now(), rand = randomBytes },
) {
  if (!driverIds.includes(body?.driverId)) fail(400, "Pilote inconnu.");
  if (!teamIds.includes(body?.teamId)) fail(400, "Écurie inconnue.");
  const source = clean(body.source, 500);
  if (source && !/^https?:\/\//.test(source)) fail(400, "La source doit être un lien.");
  const r = {
    id: rand(6).toString("base64url"),
    driverId: body.driverId,
    teamId: body.teamId,
    text: clean(body.text, 280),
    source,
    at: now,
    by: user.id,
    status: "open",
    votes: {},
    resolvedAt: null,
  };
  game.rumors[r.id] = r;
  return r;
}

export function vote(game, userId, rumorId, credible, now = Date.now()) {
  const r = game.rumors[rumorId];
  if (!r) fail(404, "Rumeur introuvable.");
  if (r.status !== "open") fail(409, "Rumeur déjà tranchée.");
  if (typeof credible !== "boolean") fail(400, "Vote invalide.");
  r.votes[userId] = { credible, at: now };
  return r;
}

export function resolveRumor(game, rumorId, status, now = Date.now()) {
  const r = game.rumors[rumorId];
  if (!r) fail(404, "Rumeur introuvable.");
  if (!["confirmed", "denied", "open"].includes(status)) fail(400, "Statut invalide.");
  r.status = status;
  r.resolvedAt = status === "open" ? null : now;
  return r;
}

// --- Officialisations (admins). Tranche aussi les rumeurs sur ce pilote.
export function makeOfficial(game, body, { driverIds, teamIds, now = Date.now() }) {
  if (!driverIds.includes(body?.driverId)) fail(400, "Pilote inconnu.");
  if (!teamIds.includes(body?.teamId)) fail(400, "Écurie inconnue.");
  if (officialOf(game, body.driverId)) fail(409, "Ce pilote est déjà officialisé.");
  if (game.official.filter((o) => o.teamId === body.teamId).length >= SEATS)
    fail(409, "Les deux baquets de cette écurie sont déjà officiels.");
  const source = clean(body.source, 500);
  const o = { driverId: body.driverId, teamId: body.teamId, source, at: now };
  game.official.push(o);
  const resolved = [];
  for (const r of Object.values(game.rumors))
    if (r.status === "open" && r.driverId === o.driverId) {
      resolveRumor(game, r.id, r.teamId === o.teamId ? "confirmed" : "denied", now);
      resolved.push(r);
    }
  return { official: o, resolved };
}

export function cancelOfficial(game, driverId) {
  const before = game.official.length;
  game.official = game.official.filter((o) => o.driverId !== driverId);
  if (game.official.length === before) fail(404, "Pas d'officialisation pour ce pilote.");
}

export function addDriver(game, name, existing) {
  const n = clean(name, 40);
  if (n.length < 3) fail(400, "Nom trop court.");
  const slug = n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  const id = `mercato-${slug}`;
  if (existing.some((d) => d.id === id || d.name.toLowerCase() === n.toLowerCase()))
    fail(409, "Ce pilote existe déjà.");
  const d = { id, name: n };
  game.extraDrivers.push(d);
  return d;
}

// Articles de la veille actus qui parlent de transferts : proposés aux admins.
const MERCATO_WORDS =
  /transf[eè]r|mercato|contrat|contract|sign[eé]e? (chez|avec|pour)|signs? (with|for)|rejoin|prolong|extension|baquet|\bseat\b|remplac|replace|quitter|quitte|leave|leaving|move to|rumeur|rumou?r|futur|future|2028/i;
export function suggestions(articles, game, now = Date.now()) {
  const used = new Set(Object.values(game.rumors).map((r) => r.source));
  return articles
    .filter(
      (a) =>
        now - a.publishedAt < 14 * 86400000 &&
        !used.has(a.link) &&
        a.tags.some((t) => t.startsWith("driver-")) &&
        MERCATO_WORDS.test(a.title),
    )
    .slice(0, 30)
    .map((a) => ({
      title: a.title,
      link: a.link,
      source: a.source,
      publishedAt: a.publishedAt,
      driverIds: a.tags.filter((t) => t.startsWith("driver-")),
      teamIds: a.tags.filter((t) => t.startsWith("team-")),
    }));
}

// Vue d'une rumeur pour un joueur : votes visibles après avoir voté ou une fois tranchée.
export function rumorView(r, userId) {
  const votes = Object.values(r.votes);
  const mine = r.votes[userId]?.credible ?? null;
  const reveal = mine !== null || r.status !== "open";
  return {
    id: r.id,
    driverId: r.driverId,
    teamId: r.teamId,
    text: r.text,
    source: r.source,
    at: r.at,
    status: r.status,
    mine,
    votes: votes.length,
    credible: reveal && votes.length ? votes.filter((v) => v.credible).length / votes.length : null,
    points: scoreRumor(r)[userId] ?? (r.status === "open" || mine === null ? null : 0),
  };
}

// Données d'un joueur supprimé.
export function forget(state, userId) {
  for (const game of Object.values(state.mercato ?? {})) {
    delete game.picks[userId];
    for (const r of Object.values(game.rumors)) delete r.votes[userId];
  }
}
