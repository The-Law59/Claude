import { test } from "node:test";
import assert from "node:assert/strict";
import {
  submitFeedback, feedbackSummary, createTopic, reply, deletePost, report, block,
  listTopics, topicView, reported, isAdmin, parseAdmins,
} from "../src/community.mjs";

const throws = (fn, status) => assert.throws(fn, (e) => e.status === status);
const H = 3600000;
const users = () => ({ a: { id: "a", pseudo: "Quentin" }, b: { id: "b", pseudo: "Lucas" }, c: { id: "c", pseudo: "Max" } });

test("Admins : pseudos de la variable ADMINS, sans casse", () => {
  const admins = parseAdmins(" Quentin, , lucas ");
  assert.deepEqual(admins, ["quentin", "lucas"]);
  assert.equal(isAdmin({ pseudo: "QUENTIN" }, admins), true);
  assert.equal(isAdmin({ pseudo: "Max" }, admins), false);
});

test("Avis : validation, un par jour, synthèse", () => {
  const state = { users: users() };
  const { a, b } = state.users;
  submitFeedback(state, a, { rating: 5, likes: ["pronos", "duel", "inconnu", "pronos"], improve: " Plus de stats " }, { now: 0 });
  throws(() => submitFeedback(state, a, { rating: 4 }, { now: H }), 429);
  throws(() => submitFeedback(state, b, { rating: 6 }, { now: H }), 400);
  submitFeedback(state, b, { rating: 3, likes: ["pronos"], ideas: "Un mode sombre plus noir" }, { now: H });
  submitFeedback(state, a, { rating: 4 }, { now: 25 * H });
  const sum = feedbackSummary(state);
  assert.equal(sum.count, 3);
  assert.equal(sum.average, 4);
  assert.deepEqual(sum.likes.slice(0, 2).map((l) => [l.key, l.count]), [["pronos", 2], ["duel", 1]]);
  assert.equal(sum.latest[0].pseudo, "Quentin");
  assert.equal(sum.latest.at(-1).improve, "Plus de stats");
});

test("Forum : sujets, réponses, rythme, rattachement au GP", () => {
  const state = { users: users() };
  const { a, b } = state.users;
  throws(() => createTopic(state, a, { category: "x", title: "Titre", text: "t" }), 400);
  throws(() => createTopic(state, a, { category: "divers", title: "ab", text: "t" }), 400);
  const t = createTopic(state, a, { category: "weekend", title: "Austin : stratégie à 1 arrêt ?", text: "Vos avis ?", eventId: "f1-2026-18" }, { now: 0, eventIds: ["f1-2026-18"] });
  assert.equal(t.eventId, "f1-2026-18");
  const r = createTopic(state, b, { category: "reglementation", title: "Moteurs 2026", text: "Trop d'électrique ?", eventId: "f1-2026-18" }, { now: 0, eventIds: ["f1-2026-18"] });
  assert.equal(r.eventId, null); // seulement pour les week-ends
  throws(() => createTopic(state, a, { category: "divers", title: "Encore", text: "x" }, { now: 30000 }), 429);
  reply(state, b, t.id, { text: "Deux arrêts, la dégradation sera forte." }, { now: 20000 });
  throws(() => reply(state, b, t.id, { text: "spam" }, { now: 25000 }), 429);
  const list = listTopics(state, a);
  assert.deepEqual(list.map((x) => [x.title, x.replies]), [["Austin : stratégie à 1 arrêt ?", 1], ["Moteurs 2026", 0]]);
  assert.deepEqual(listTopics(state, a, "reglementation").map((x) => x.pseudo), ["Lucas"]);
});

test("Modération : signalement, effacement, blocage", () => {
  const state = { users: users() };
  const { a, b, c } = state.users;
  const t = createTopic(state, a, { category: "divers", title: "Pronos Austin", text: "Je dis Norris" }, { now: 0 });
  reply(state, b, t.id, { text: "message déplacé" }, { now: 1 });
  const post = topicView(state, a, t.id).posts[1];
  report(state, a, t.id, post.id);
  report(state, c, t.id, post.id);
  report(state, c, t.id, post.id); // une fois par joueur
  assert.deepEqual(reported(state).map((r) => [r.pseudo, r.reports]), [["Lucas", 2]]);
  assert.equal(topicView(state, a, t.id).posts[1].reported, true);
  assert.equal(topicView(state, c, t.id, true).posts[1].reports, 2);
  throws(() => deletePost(state, c, t.id, post.id), 403);
  block(c, "b");
  assert.equal(topicView(state, c, t.id).posts.length, 1); // Lucas masqué pour Max
  deletePost(state, c, t.id, post.id, true); // un admin efface
  assert.equal(topicView(state, a, t.id).posts.length, 1);
  deletePost(state, a, t.id, topicView(state, a, t.id).posts[0].id); // premier message : sujet supprimé
  assert.deepEqual(listTopics(state, a), []);
});
