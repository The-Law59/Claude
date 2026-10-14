import { test } from "node:test";
import assert from "node:assert/strict";
import { loginLink, memberKey, parseMemberKey } from "../src/api.mjs";

test("Clé de profil : aller-retour par la clé seule ou le lien complet", () => {
  const g = { groupId: "g-1_A", memberId: "m_2-B", token: "s3cr-et_X", name: "Les Tifosi", code: "Q562KW" };
  const key = memberKey(g);
  const expected = { groupId: g.groupId, memberId: g.memberId, token: g.token };
  assert.deepEqual(parseMemberKey(key), expected);
  assert.deepEqual(parseMemberKey(`  ${loginLink(key)}  `), expected);
  assert.deepEqual(parseMemberKey(`Mon lien : https://kp.example/pronos?cle=${key}&x=1`), expected);
  for (const bad of ["", "abc", "a.b", "a.b.c.d", "a.b.c<script>", "https://kp.example/pronos"])
    assert.equal(parseMemberKey(bad), null, bad);
});
