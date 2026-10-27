import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  ADS_PER_JOKER,
  adsWatched,
  jokerSource,
  parseKeys,
  recordReward,
  verifySsv,
} from "../src/ads.mjs";

test("Pubs : signature AdMob (SSV) vérifiée, falsification refusée", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pem = publicKey.export({ type: "spki", format: "pem" });
  const keys = parseKeys({ keys: [{ keyId: 42, pem }] });
  const message =
    "ad_network=5450213213286189855&ad_unit=123&custom_data=2026-monaco&reward_amount=1" +
    "&reward_item=joker&timestamp=1761000000000&transaction_id=tx1&user_id=u1";
  const signature = sign("sha256", Buffer.from(message), privateKey).toString("base64url");
  const query = `${message}&signature=${signature}&key_id=42`;
  assert.deepEqual(verifySsv(query, keys), {
    userId: "u1",
    eventId: "2026-monaco",
    transactionId: "tx1",
  });
  assert.equal(verifySsv(query.replace("user_id=u1", "user_id=u2"), keys), null);
  assert.equal(verifySsv(query.replace("key_id=42", "key_id=7"), keys), null);
  assert.equal(verifySsv(message, keys), null);
});

test("Pubs : une récompense par transaction, comptée par GP", () => {
  const state = {};
  recordReward(state, { userId: "u1", eventId: "gp1", transactionId: "a" });
  recordReward(state, { userId: "u1", eventId: "gp1", transactionId: "a" });
  recordReward(state, { userId: "u1", eventId: "gp1", transactionId: "b" });
  recordReward(state, { userId: "u1", eventId: "gp2", transactionId: "c" });
  assert.equal(adsWatched(state, "u1", "gp1"), 2);
  assert.equal(adsWatched(state, "u1", "gp2"), 1);
  assert.equal(adsWatched(state, "u2", "gp1"), 0);
});

test("Pubs : joker gratuit d'abord, puis 3 pubs par week-end", () => {
  const state = {};
  assert.equal(jokerSource(state, "u1", "gp2", null), "free");
  assert.equal(jokerSource(state, "u1", "gp2", { name: "GP 1" }), null);
  for (let i = 0; i < ADS_PER_JOKER; i++)
    recordReward(state, { userId: "u1", eventId: "gp2", transactionId: `t${i}` });
  assert.equal(jokerSource(state, "u1", "gp2", { name: "GP 1" }), "ads");
  // Les pubs d'un week-end ne valent pas pour le suivant.
  assert.equal(jokerSource(state, "u1", "gp3", { name: "GP 1" }), null);
});
