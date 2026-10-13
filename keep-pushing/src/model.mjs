export const defaults = () => ({
  version: 2,
  favorites: ["driver-max_verstappen", "team-red_bull"],
  protectedSessions: [],
  frequency: "important",
  rumors: false,
  reminders: false,
  reminderMinutes: 30,
  results: true,
});
export function restorePreferences(raw, sessions) {
  const d = defaults();
  try {
    const p = JSON.parse(raw);
    if (p?.version !== 2) return d;
    return {
      ...d,
      favorites: Array.isArray(p.favorites)
        ? p.favorites.filter((x) => typeof x === "string")
        : d.favorites,
      protectedSessions: Array.isArray(p.protectedSessions)
        ? p.protectedSessions.filter((x) => sessions.some((s) => s.id === x))
        : [],
      frequency: p.frequency === "all" ? "all" : "important",
      rumors: p.rumors === true,
      reminders: p.reminders === true,
      results: p.results !== false,
      reminderMinutes: [10, 30, 60].includes(p.reminderMinutes)
        ? p.reminderMinutes
        : 30,
    };
  } catch {
    return d;
  }
}
export function articleVisible(article, prefs, personal = true) {
  if (article.sessionIds.some((id) => prefs.protectedSessions.includes(id)))
    return false;
  if (article.rumor && !prefs.rumors) return false;
  return !personal || article.tags.some((tag) => prefs.favorites.includes(tag));
}
export function notificationAllowed(event, prefs) {
  if (event.kind === "reminder") return prefs.reminders;
  if (event.sessionIds.some((id) => prefs.protectedSessions.includes(id)))
    return false;
  if (event.kind === "result") return prefs.results;
  return (
    articleVisible(event, prefs, true) &&
    (prefs.frequency === "all" || event.important)
  );
}
export function setProtected(prefs, id, value) {
  return {
    ...prefs,
    protectedSessions: value
      ? [...new Set([...prefs.protectedSessions, id])]
      : prefs.protectedSessions.filter((x) => x !== id),
  };
}
// N'ajoute ou ne retire que les sessions de ce week-end.
export function protectWeekend(prefs, sessions, value) {
  const ids = sessions.map((s) => s.id);
  return {
    ...prefs,
    protectedSessions: value
      ? [...new Set([...prefs.protectedSessions, ...ids])]
      : prefs.protectedSessions.filter((x) => !ids.includes(x)),
  };
}
export function reminderPlan(sessions, prefs, now = Date.now(), name = "") {
  if (!prefs.reminders) return [];
  return sessions
    .map((s) => ({
      id: s.id,
      title: `${s.label} dans ${prefs.reminderMinutes} minutes`,
      body: `Keep Pushing · ${name}`,
      date: new Date(s.startsAt).getTime() - prefs.reminderMinutes * 60000,
    }))
    .filter((x) => x.date > now);
}
// Week-end en cours ou à venir, et dernier week-end dont la course a démarré.
export function focusEvents(events, now = Date.now()) {
  const raceStart = (e) => Date.parse(e.sessions.at(-1).startsAt);
  const current =
    events.find((e) => raceStart(e) + 4 * 3600000 > now) ?? events.at(-1);
  const last = events.filter((e) => raceStart(e) <= now).at(-1) ?? current;
  return { current, last };
}
