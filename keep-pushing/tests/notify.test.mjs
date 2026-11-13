import { test } from "node:test";
import assert from "node:assert/strict";
import { inbox, markRead, notify, notifyLeague, notifyReply } from "../src/notify.mjs";
import { exactCount, highlights, shareText } from "../src/recap.mjs";
import { scoreBet } from "../src/bets.mjs";

const users = () => ({
  a: { id: "a", pseudo: "Quentin" },
  b: { id: "b", pseudo: "Lucas" },
  c: { id: "c", pseudo: "Max", blocked: ["b"] },
});

test("Réponses au forum : participants prévenus, regroupées par sujet", () => {
  const state = { users: users() };
  const topic = { id: "t1", title: "Moteurs 2026", eventId: null, posts: [{ userId: "a" }, { userId: "c" }, { userId: "b" }] };
  notifyReply(state, topic, state.users.b, { now: 1 });
  assert.equal(inbox(state, "a").items[0].text, "Lucas a répondu à « Moteurs 2026 »");
  assert.equal(inbox(state, "b").unread, 0); // pas soi-même
  assert.equal(inbox(state, "c").unread, 0); // Max a masqué Lucas
  notifyReply(state, topic, state.users.b, { now: 2 });
  const box = inbox(state, "a");
  assert.equal(box.items.length, 1);
  assert.equal(box.items[0].text, "2 nouvelles réponses à « Moteurs 2026 »");
  assert.equal(box.items[0].link, "/forum/t1");
  markRead(state, "a");
  assert.equal(inbox(state, "a").unread, 0);
  notifyReply(state, topic, state.users.b, { now: 3 }); // nouvelle ligne après lecture
  assert.deepEqual([inbox(state, "a").unread, inbox(state, "a").items.length], [1, 2]);
});

test("Messages de ligue et limite de 50 notifications", () => {
  const state = { users: users() };
  notifyLeague(state, { id: "l1", name: "Tifosi", members: ["a", "b"] }, state.users.b, { now: 1 });
  assert.equal(inbox(state, "a").items[0].link, "/pronos?league=l1");
  assert.equal(inbox(state, "b").unread, 0);
  markRead(state, "a", undefined, "/forum/autre"); // autre lien : rien ne change
  assert.equal(inbox(state, "a").unread, 1);
  markRead(state, "a", undefined, "/pronos?league=l1"); // ligue ouverte : lue
  assert.equal(inbox(state, "a").unread, 0);
  for (let i = 0; i < 60; i++) notify(state, "a", { key: `k${i}`, text: () => `n${i}`, link: "/" }, { now: 10 + i });
  const box = inbox(state, "a");
  assert.equal(box.items.length, 50);
  assert.equal(box.items[0].text, "n59");
  markRead(state, "a", [box.items[0].id]);
  assert.equal(inbox(state, "a").unread, 49);
});

test("Récap : meilleurs coups et texte à partager", () => {
  const ids = Array.from({ length: 22 }, (_, i) => `d${i + 1}`);
  const race = ids.map((driverId, i) => ({ driverId, position: i + 1, positionText: String(i + 1), fastestLap: i === 2 }));
  const bet = { race: ["d1", "d3", "d2", ...ids.slice(3, 10)], fastest: "d3", joker: true };
  const score = scoreBet(bet, { Race: race });
  assert.equal(exactCount(score), 8);
  const name = (id) => id.toUpperCase();
  assert.deepEqual(highlights(bet, score, name), ["D1 pile en P1 (course)", "meilleur tour : D3 ✓"]);
  const text = shareText(
    { event: "Singapore Grand Prix", points: score.total, joker: true, exact: 8, highlights: highlights(bet, score, name), best: null, rankBefore: 3, rankAfter: 1, players: 4 },
    "https://kp.example",
  );
  assert.match(text, /Singapore Grand Prix/);
  assert.match(text, /joker ×2/);
  assert.match(text, /📈 3e → 1er au général/);
  assert.match(text, /https:\/\/kp\.example/);
});

test("Demandes d'amis : notification de demande puis d'acceptation", async () => {
  const { notifyFriend } = await import("../src/notify.mjs");
  const a = { id: "a", pseudo: "Quentin", friends: ["b"] };
  const b = { id: "b", pseudo: "Lucas", friends: [] };
  const state = { users: { a, b } };
  notifyFriend(state, a, b);
  assert.equal(inbox(state, "b").items[0].text, "Quentin veut être votre ami");
  assert.equal(inbox(state, "b").items[0].link, "/friends");
  b.friends.push("a");
  notifyFriend(state, b, a);
  assert.equal(inbox(state, "a").items[0].text, "Lucas a accepté votre demande d'ami");
});
