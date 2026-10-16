export const defaults = () => ({
  version: 2,
  favorites: ["driver-max_verstappen", "team-red_bull"],
  myDriver: "",
  myTeam: "",
  protectedSessions: [],
  revealed: [], // sessions marquées « vues » : l'anti-spoil auto ne les reprotège pas
  autoProtect: "off", // "off" | "race" | "weekend"
  account: null, // compte joueur : { token, id, pseudo }
  welcomed: false, // portail de connexion déjà vu
  syncedAt: 0, // date des réglages reçus du compte
  betReminders: false, // rappel 1 h avant la fermeture des paris
  theme: "auto", // "auto" | "light" | "dark"
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
      account:
        p.account && ["token", "id", "pseudo"].every((k) => typeof p.account[k] === "string")
          ? p.account
          : null,
      welcomed: p.welcomed === true,
      syncedAt: Number.isFinite(p.syncedAt) ? p.syncedAt : 0,
      betReminders: p.betReminders === true,
      theme: ["light", "dark"].includes(p.theme) ? p.theme : "auto",
      myDriver: typeof p.myDriver === "string" ? p.myDriver : "",
      myTeam: typeof p.myTeam === "string" ? p.myTeam : "",
      frequency: p.frequency === "all" ? "all" : "important",
      rumors: p.rumors === true,
      reminders: p.reminders === true,
      results: p.results !== false,
      reminderMinutes: [10, 30, 60].includes(p.reminderMinutes) ? p.reminderMinutes : 30,
    };
  } catch {
    return d;
  }
}
export function articleVisible(article, prefs, personal = true) {
  if (article.sessionIds.some((id) => prefs.protectedSessions.includes(id))) return false;
  if (article.rumor && !prefs.rumors) return false;
  return !personal || article.tags.some((tag) => prefs.favorites.includes(tag));
}
export function notificationAllowed(event, prefs) {
  if (event.kind === "reminder") return prefs.reminders;
  if (event.sessionIds.some((id) => prefs.protectedSessions.includes(id))) return false;
  if (event.kind === "result") return prefs.results;
  return articleVisible(event, prefs, true) && (prefs.frequency === "all" || event.important);
}
// Débloquer une session la marque « vue » ; la reprotéger efface cette marque.
function protectIds(prefs, ids, value) {
  const without = (list) => list.filter((x) => !ids.includes(x));
  return {
    ...prefs,
    protectedSessions: value
      ? [...new Set([...prefs.protectedSessions, ...ids])]
      : without(prefs.protectedSessions),
    revealed: value
      ? without(prefs.revealed ?? [])
      : [...new Set([...(prefs.revealed ?? []), ...ids])],
  };
}
export const setProtected = (prefs, id, value) => protectIds(prefs, [id], value);
// N'ajoute ou ne retire que les sessions de ce week-end.
export const protectWeekend = (prefs, sessions, value) =>
  protectIds(
    prefs,
    sessions.map((s) => s.id),
    value,
  );

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
// Paris : rappel 1 h avant la fermeture de chaque partie (qualifs, sprint, course).
const BET_SESSIONS = {
  Qualifying: "top 10 des qualifs",
  Sprint: "top 8 du sprint",
  Race: "top 10 de la course",
};
export function betReminderPlan(sessions, prefs, now = Date.now(), name = "") {
  if (!prefs.betReminders || !prefs.account) return [];
  return sessions
    .filter((s) => BET_SESSIONS[s.type])
    .map((s) => ({
      id: `bet-${s.id}`,
      title: "Paris : fermeture dans 1 h",
      body: `${name} · vérifiez votre ${BET_SESSIONS[s.type]}`,
      date: Date.parse(s.startsAt) - 3600000,
    }))
    .filter((x) => x.date > now);
}
// Réglages partagés entre les appareils d'un compte (pas les rappels, propres
// à chaque téléphone).
export const SYNCED = [
  "favorites",
  "myDriver",
  "myTeam",
  "protectedSessions",
  "revealed",
  "autoProtect",
  "frequency",
  "rumors",
  "results",
  "theme",
];
export const syncedPart = (prefs) => Object.fromEntries(SYNCED.map((k) => [k, prefs[k]]));
// Applique des réglages reçus du serveur, validés comme une restauration.
export function applySynced(prefs, data, at, sessions) {
  const clean = restorePreferences(
    JSON.stringify({ ...prefs, ...syncedPart({ ...prefs, ...data }) }),
    sessions,
  );
  return { ...prefs, ...syncedPart(clean), syncedAt: at };
}
// Week-end en cours ou à venir, et dernier week-end dont la course a démarré.
export function focusEvents(events, now = Date.now()) {
  const raceStart = (e) => Date.parse(e.sessions.at(-1).startsAt);
  const current = events.find((e) => raceStart(e) + 4 * 3600000 > now) ?? events.at(-1);
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
// Coéquipier : même écurie, celui qui a le plus de points (changements de baquet).
export const teammateOf = (drivers, driverId) => {
  const me = drivers.find((d) => d.id === driverId);
  return drivers
    .filter((d) => d.id !== driverId && me && d.teamId === me.teamId)
    .sort((a, b) => b.points - a.points)[0];
};

// Duel : face-à-face GP par GP sur les week-ends courus par les deux ;
// meilleur résultat sur toute la saison de chacun (points : classement officiel).
export function duel(mine, mate) {
  const byRound = new Map(mate.map((r) => [r.round, r]));
  const rounds = mine
    .filter((r) => byRound.has(r.round))
    .map((r) => ({ round: r.round, name: r.name, me: r, mate: byRound.get(r.round) }));
  const ahead = (key) => {
    const both = rounds.filter((r) => r.me[key] && r.mate[key]);
    return [
      both.filter((r) => r.me[key] < r.mate[key]).length,
      both.filter((r) => r.mate[key] < r.me[key]).length,
    ];
  };
  const best = (list) => Math.min(...list.filter((r) => r.race && !r.dnf).map((r) => r.race));
  return {
    rounds,
    race: ahead("race"),
    quali: ahead("quali"),
    best: [best(mine), best(mate)],
  };
}
// Duel d'écuries, GP par GP (saisons de loadTeamSeason) : qui a marqué le
// plus, podiums, meilleure place ; GP où l'une des deux manque ignorés.
export function teamDuel(a, b) {
  const other = Object.fromEntries(b.map((r) => [r.round, r]));
  const rounds = a
    .filter((r) => other[r.round])
    .map((r) => ({ round: r.round, name: r.name, a: r, b: other[r.round] }));
  const count = (f) => [
    rounds.filter((r) => f(r.a, r.b)).length,
    rounds.filter((r) => f(r.b, r.a)).length,
  ];
  const best = (list) => Math.min(...list.map((r) => r.best ?? Infinity));
  return {
    rounds,
    ahead: count((x, y) => x.points > y.points),
    podiums: [a, b].map((list) => list.filter((r) => r.best && r.best <= 3).length),
    best: [best(a), best(b)],
  };
}
