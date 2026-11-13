import { test } from "node:test";
import assert from "node:assert/strict";
import * as accounts from "../src/accounts.mjs";
import { changePassword, changePseudo, deleteAccount, exportData } from "../src/account.mjs";
import { createLeague, joinLeague, postMessage } from "../src/leagues.mjs";
import { createTopic, reply } from "../src/community.mjs";
import { notifyReply } from "../src/notify.mjs";

const rejects = (p, status) => assert.rejects(p, (e) => e.status === status);

async function world() {
  const state = { users: {}, sessions: {}, bets: {}, final: {}, champions: {} };
  const reg = async (pseudo) => {
    const { token } = await accounts.register(state, { pseudo, password: "motdepasse" });
    return { token, user: accounts.authenticate(state, `Bearer ${token}`) };
  };
  return { state, a: await reg("Quentin"), b: await reg("Lucas") };
}

test("Changer de mot de passe : l'ancien est exigé, les autres appareils déconnectés", async () => {
  const { state, a } = await world();
  const other = await accounts.login(state, { pseudo: "Quentin", password: "motdepasse" }, { failures: new Map() });
  await rejects(changePassword(state, a.user, { current: "faux", next: "nouveau123" }, `Bearer ${a.token}`), 403);
  await rejects(changePassword(state, a.user, { current: "motdepasse", next: "court" }, `Bearer ${a.token}`), 400);
  await changePassword(state, a.user, { current: "motdepasse", next: "nouveau123" }, `Bearer ${a.token}`);
  assert.equal(accounts.authenticate(state, `Bearer ${a.token}`).id, a.user.id); // cet appareil reste
  assert.throws(() => accounts.authenticate(state, `Bearer ${other.token}`), (e) => e.status === 401);
  await accounts.login(state, { pseudo: "Quentin", password: "nouveau123" }, { failures: new Map() });
});

test("Changer de pseudo : règles, unicité, mot de passe", async () => {
  const { state, a } = await world();
  await rejects(changePseudo(state, a.user, { pseudo: "lucas", password: "motdepasse" }), 409);
  await rejects(changePseudo(state, a.user, { pseudo: "Q", password: "motdepasse" }), 400);
  await rejects(changePseudo(state, a.user, { pseudo: "Quentin59", password: "faux" }), 403);
  assert.deepEqual(await changePseudo(state, a.user, { pseudo: "Quentin59", password: "motdepasse" }), { id: a.user.id, pseudo: "Quentin59" });
  await changePseudo(state, a.user, { pseudo: "quentin59", password: "motdepasse" }); // casse : soi-même
});

test("Export puis suppression : plus aucune trace, ligue transmise, avis anonymisé", async () => {
  const { state, a, b } = await world();
  accounts.addFriend(state, a.user, "Lucas");
  accounts.addFriend(state, b.user, "Quentin");
  state.bets["f1-2026-18"] = { [a.user.id]: { quali: ["d1"] }, [b.user.id]: { quali: ["d2"] } };
  state.final["f1-2026-17"] = { [a.user.id]: 120, [b.user.id]: 80 };
  state.champions["2026"] = { [a.user.id]: { driver: "d1" } };
  const league = createLeague(state, a.user, { name: "Tifosi" });
  joinLeague(state, b.user, { code: league.code });
  postMessage(state, a.user, league.id, { text: "Salut" }, { now: 1 });
  const mineTopic = createTopic(state, a.user, { category: "divers", title: "Mon sujet", text: "x" }, { now: 0 });
  const other = createTopic(state, b.user, { category: "divers", title: "Sujet de Lucas", text: "y" }, { now: 0 });
  reply(state, a.user, other.id, { text: "Ma réponse" }, { now: 100000 });
  notifyReply(state, state.forum.topics[other.id], a.user);
  state.feedback = [{ id: "f", userId: a.user.id, rating: 5, likes: [], improve: "", ideas: "", at: 0 }];

  const data = exportData(state, a.user);
  assert.deepEqual(data.friends, ["Lucas"]);
  assert.deepEqual(Object.keys(data.bets), ["f1-2026-18"]);
  assert.equal(data.leagues[0].messages.length, 1);
  assert.deepEqual(data.forum.map((p) => p.text), ["x", "Ma réponse"]);

  await rejects(deleteAccount(state, a.user, { password: "faux" }), 403);
  await deleteAccount(state, a.user, { password: "motdepasse" });
  const id = a.user.id;
  assert.ok(!JSON.stringify({ ...state, feedback: [] }).includes(id)); // plus aucune trace
  assert.equal(state.leagues[league.id].owner, b.user.id);
  assert.deepEqual(state.leagues[league.id].messages, []);
  assert.equal(state.forum.topics[mineTopic.id], undefined);
  assert.equal(state.forum.topics[other.id].posts.length, 1);
  assert.equal(state.feedback[0].userId, null);
  assert.equal(state.feedback[0].rating, 5);
  assert.throws(() => accounts.authenticate(state, `Bearer ${a.token}`), (e) => e.status === 401);
});
