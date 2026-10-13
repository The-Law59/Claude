import test from "node:test";
import assert from "node:assert/strict";
import { articles, sessions } from "../src/data.mjs";
import {
  defaults,
  restorePreferences,
  articleVisible,
  notificationAllowed,
  setProtected,
  protectWeekend,
  reminderPlan,
} from "../src/model.mjs";
test("Une session protégée masque son article même dans toute la F1", () => {
  const p = setProtected(defaults(), "race", true);
  const a = articles.find((x) => x.id === "race-battle");
  assert.equal(articleVisible(a, p, false), false);
  assert.equal(notificationAllowed({ ...a, kind: "news" }, p), false);
  assert.equal(notificationAllowed({ ...a, kind: "result" }, p), false);
});
test("Débloquer les qualifications ne débloque pas la course", () => {
  const p = setProtected(
    protectWeekend(defaults(), sessions, true),
    "qualifying",
    false,
  );
  assert(!p.protectedSessions.includes("qualifying"));
  assert(p.protectedSessions.includes("race"));
  assert(
    articleVisible(
      articles.find((x) => x.id === "pole"),
      p,
      false,
    ),
  );
});
test("Un article lié à plusieurs sessions reste protégé tant qu’une session l’est", () => {
  assert.equal(
    articleVisible(
      { ...articles[0], sessionIds: ["race", "qualifying"] },
      setProtected(defaults(), "race", true),
      false,
    ),
    false,
  );
});
test("Les rappels neutres restent autorisés en anti-spoil", () => {
  const p = { ...protectWeekend(defaults(), sessions, true), reminders: true };
  assert(notificationAllowed({ kind: "reminder", sessionIds: ["race"] }, p));
  assert.equal(reminderPlan(sessions, p, 0).length, 5);
  assert.equal(reminderPlan(sessions, p, Date.parse("2027-01-01")).length, 0);
});
test("Filtres favoris, rumeurs et importance sont indépendants", () => {
  const p = defaults();
  assert(
    !articleVisible(
      articles.find((x) => x.id === "factory"),
      p,
    ),
  );
  assert(
    articleVisible(
      articles.find((x) => x.id === "factory"),
      p,
      false,
    ),
  );
  assert(
    !articleVisible(
      articles.find((x) => x.id === "rumor"),
      p,
    ),
  );
  assert(!notificationAllowed({ ...articles[0], kind: "news" }, p));
  assert(
    notificationAllowed(
      { ...articles[0], kind: "news" },
      { ...p, frequency: "all" },
    ),
  );
});
test("Préférences corrompues ou ancien format : reprise sûre", () => {
  assert.deepEqual(restorePreferences("{oops", sessions), defaults());
  assert.deepEqual(restorePreferences('{"version":99}', sessions), defaults());
  const p = restorePreferences(
    '{"version":1,"protectedSessions":["race","unknown"],"reminderMinutes":-10}',
    sessions,
  );
  assert.deepEqual(p.protectedSessions, ["race"]);
  assert.equal(p.reminderMinutes, 30);
});
test("Le plan de rappel applique le délai exact et désactivation", () => {
  const p = { ...defaults(), reminders: true, reminderMinutes: 10 };
  assert.equal(
    reminderPlan(sessions, p, 0)[0].date,
    Date.parse(sessions[0].startsAt) - 600000,
  );
  assert.deepEqual(reminderPlan(sessions, defaults(), 0), []);
});
