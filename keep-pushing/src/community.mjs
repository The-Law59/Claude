// Communauté : avis sur l'appli et forum. Fonctions sur l'état JSON du jeu
// (state.feedback, state.forum) ; server.mjs gère HTTP et sauvegarde.
// Admins (pseudos de la variable ADMINS) : lisent les avis, modèrent le forum.
import { randomBytes } from "node:crypto";
import { fail } from "./errors.mjs";
import { CATEGORIES, FEATURES } from "./community.labels.mjs";

export { CATEGORIES, FEATURES };

const LIMITS = { feedback: 2000, topics: 1000, posts: 500, title: 80, text: 2000, note: 1000 };
const GAP = { feedback: 24 * 3600 * 1000, topic: 60 * 1000, post: 10 * 1000 };

const id = (rand) => rand(6).toString("base64url");
const clean = (v, max, what, min = 1) => {
  const t = typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ") : "";
  if (t.length < min || t.length > max) fail(400, `${what} : ${min} à ${max} caractères.`);
  return t;
};
export const isAdmin = (user, admins) => admins.includes(user.pseudo.toLowerCase());
export const parseAdmins = (env = "") =>
  env
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

// --- Avis : note, ce qu'on aime, ce qu'on améliorerait. Un par jour et par joueur.
export function submitFeedback(state, user, body, { now = Date.now(), rand = randomBytes } = {}) {
  state.feedback ??= [];
  const rating = body?.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, "Note : de 1 à 5 étoiles.");
  const likes = Array.isArray(body?.likes) ? body.likes.filter((k) => k in FEATURES) : [];
  const optional = (v, what) => (v ? clean(v, LIMITS.note, what, 0) : "");
  const entry = {
    id: id(rand),
    userId: user.id,
    rating,
    likes: [...new Set(likes)],
    improve: optional(body?.improve, "Points à améliorer"),
    ideas: optional(body?.ideas, "Idées"),
    at: now,
  };
  const last = state.feedback.findLast((f) => f.userId === user.id);
  if (last && now - last.at < GAP.feedback) fail(429, "Merci ! Un avis par jour suffit.");
  state.feedback = [...state.feedback, entry].slice(-LIMITS.feedback);
  return entry;
}

// Synthèse pour les admins : moyenne, fonctionnalités préférées, derniers avis.
export function feedbackSummary(state) {
  const all = state.feedback ?? [];
  const likes = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, 0]));
  for (const f of all) for (const k of f.likes) likes[k] += 1;
  return {
    count: all.length,
    average: all.length
      ? Math.round((all.reduce((a, f) => a + f.rating, 0) / all.length) * 10) / 10
      : null,
    likes: Object.entries(likes)
      .map(([key, count]) => ({ key, label: FEATURES[key], count }))
      .sort((a, b) => b.count - a.count),
    latest: all
      .slice(-100)
      .reverse()
      .map((f) => ({ ...f, pseudo: state.users?.[f.userId]?.pseudo ?? "Ancien joueur" })),
  };
}

// --- Forum : sujets par catégorie, réponses, signalements, blocage.
const forum = (state) => (state.forum ??= { topics: {} });
const lastBy = (state, user) =>
  Math.max(
    -Infinity, // jamais posté
    ...Object.values(forum(state).topics).flatMap((t) =>
      t.posts.filter((p) => p.userId === user.id).map((p) => p.at),
    ),
  );

export function createTopic(
  state,
  user,
  body,
  { now = Date.now(), rand = randomBytes, eventIds = [] } = {},
) {
  const category = body?.category;
  if (!(category in CATEGORIES)) fail(400, "Catégorie inconnue.");
  const title = clean(body?.title, LIMITS.title, "Titre", 3);
  const text = clean(body?.text, LIMITS.text, "Message");
  // Sujet de week-end : rattaché à un GP pour être masqué par l'anti-spoil.
  const eventId = category === "weekend" && eventIds.includes(body?.eventId) ? body.eventId : null;
  const mine = Object.values(forum(state).topics).filter((t) => t.posts[0]?.userId === user.id);
  if (mine.some((t) => now - t.at < GAP.topic))
    fail(429, "Un nouveau sujet par minute au maximum.");
  const topic = {
    id: id(rand),
    category,
    title,
    eventId,
    at: now,
    lastAt: now,
    posts: [{ id: id(rand), userId: user.id, text, at: now, reports: [] }],
  };
  const topics = forum(state).topics;
  topics[topic.id] = topic;
  // Au-delà de la limite, les sujets les plus anciens disparaissent.
  Object.values(topics)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(LIMITS.topics)
    .forEach((t) => delete topics[t.id]);
  return topic;
}

const topicOf = (state, topicId) => {
  const t = forum(state).topics[topicId];
  if (!t) fail(404, "Sujet introuvable.");
  return t;
};

export function reply(state, user, topicId, body, { now = Date.now(), rand = randomBytes } = {}) {
  const t = topicOf(state, topicId);
  const text = clean(body?.text, LIMITS.text, "Message");
  if (now - lastBy(state, user) < GAP.post)
    fail(429, "Doucement : un message toutes les 10 secondes.");
  if (t.posts.length >= LIMITS.posts) fail(409, "Sujet complet : ouvrez-en un nouveau.");
  t.posts.push({ id: id(rand), userId: user.id, text, at: now, reports: [] });
  t.lastAt = now;
}

// Effacer : l'auteur ou un admin ; effacer le premier message supprime le sujet.
export function deletePost(state, user, topicId, postId, admin = false) {
  const t = topicOf(state, topicId);
  const i = t.posts.findIndex((p) => p.id === postId);
  if (i === -1) fail(404, "Message introuvable.");
  if (t.posts[i].userId !== user.id && !admin) fail(403, "Seul l'auteur ou un admin peut effacer.");
  if (i === 0) delete forum(state).topics[topicId];
  else t.posts.splice(i, 1);
}

export function report(state, user, topicId, postId) {
  const p = topicOf(state, topicId).posts.find((x) => x.id === postId);
  if (!p) fail(404, "Message introuvable.");
  if (!p.reports.includes(user.id)) p.reports.push(user.id);
}

// Ne plus voir les messages d'un joueur (et inversement pour lui).
export function block(user, otherId) {
  if (otherId === user.id) fail(400, "C'est vous !");
  user.blocked = [...new Set([...(user.blocked ?? []), otherId])];
}
const hidden = (user, p) => (user.blocked ?? []).includes(p.userId);
const pseudo = (state, uid) => state.users?.[uid]?.pseudo ?? "Ancien joueur";

export function listTopics(state, user, category) {
  return Object.values(forum(state).topics)
    .filter((t) => !category || t.category === category)
    .filter((t) => !hidden(user, t.posts[0]))
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, 100)
    .map((t) => ({
      id: t.id,
      category: t.category,
      title: t.title,
      eventId: t.eventId,
      pseudo: pseudo(state, t.posts[0].userId),
      text: t.posts[0].text.slice(0, 500),
      replies: t.posts.length - 1,
      lastAt: t.lastAt,
    }));
}

export function topicView(state, user, topicId, admin = false) {
  const t = topicOf(state, topicId);
  return {
    id: t.id,
    category: t.category,
    title: t.title,
    eventId: t.eventId,
    admin,
    posts: t.posts
      .filter((p) => !hidden(user, p))
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        pseudo: pseudo(state, p.userId),
        mine: p.userId === user.id,
        text: p.text,
        at: p.at,
        reported: p.reports.includes(user.id),
        ...(admin && { reports: p.reports.length }),
      })),
  };
}

// File de modération des admins : messages signalés, du plus signalé au moins.
export const reported = (state) =>
  Object.values(forum(state).topics)
    .flatMap((t) =>
      t.posts
        .filter((p) => p.reports.length)
        .map((p) => ({
          topicId: t.id,
          title: t.title,
          postId: p.id,
          pseudo: pseudo(state, p.userId),
          text: p.text,
          reports: p.reports.length,
        })),
    )
    .sort((a, b) => b.reports - a.reports);
