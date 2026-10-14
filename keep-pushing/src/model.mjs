export const defaults = () => ({
  version: 2,
  favorites: ["driver-max_verstappen", "team-red_bull"],
  myDriver: "",
  myTeam: "",
  protectedSessions: [],
  revealed: [], // sessions marquées « vues » : l'anti-spoil auto ne les reprotège pas
  autoProtect: "off", // "off" | "race" | "weekend"
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
      revealed: Array.isArray(p.revealed)
        ? p.revealed.filter((x) => sessions.some((s) => s.id === x))
        : [],
      autoProtect: ["race", "weekend"].includes(p.autoProtect) ? p.autoProtect : "off",
      myDriver: typeof p.myDriver === "string" ? p.myDriver : "",
      myTeam: typeof p.myTeam === "string" ? p.myTeam : "",
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
// Débloquer une session la marque « vue » ; la reprotéger efface cette marque.
function protectIds(prefs, ids, value) {
  const without = (list) => list.filter((x) => !ids.includes(x));
  return {
    ...prefs,
    protectedSessions: value
      ? [...new Set([...prefs.protectedSessions, ...ids])]
      : without(prefs.protectedSessions),
    revealed: value ? without(prefs.revealed ?? []) : [...new Set([...(prefs.revealed ?? []), ...ids])],
  };
}
export const setProtected = (prefs, id, value) => protectIds(prefs, [id], value);
// N'ajoute ou ne retire que les sessions de ce week-end.
export const protectWeekend = (prefs, sessions, value) =>
  protectIds(prefs, sessions.map((s) => s.id), value);

// Anti-spoil automatique : protège les sessions choisies dès 5 min avant leur
// départ et jusqu'à 48 h après, sauf celles déjà marquées « vues ».
const AUTO_TYPES = { race: ["Race", "Sprint"] };
export function autoProtect(prefs, events, now = Date.now()) {
  if (prefs.autoProtect === "off" || !prefs.autoProtect) return prefs;
  const ids = events
    .flatMap((e) => e.sessions)
    .filter((s) => prefs.autoProtect === "weekend" || AUTO_TYPES.race.includes(s.type))
    .filter((s) => {
      const start = Date.parse(s.startsAt);
      return now >= start - 5 * 60000 && now <= start + 48 * 3600000;
    })
    .map((s) => s.id)
    .filter((id) => !prefs.protectedSessions.includes(id) && !(prefs.revealed ?? []).includes(id));
  return ids.length ? { ...prefs, protectedSessions: [...prefs.protectedSessions, ...ids] } : prefs;
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
// Mon pilote / mon écurie : aussi ajoutés aux favoris, qui filtrent les actualités.
export function setMine(prefs, key, id) {
  return {
    ...prefs,
    [key]: id,
    favorites: id && !prefs.favorites.includes(id) ? [...prefs.favorites, id] : prefs.favorites,
  };
}
