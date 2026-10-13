// Fixtures uniquement : aucun résultat ou calendrier officiel.
// Modèle : compétition → week-end (event) → sessions. Les ids de session
// sont préfixés par l'event pour qu'un « race » ne protège pas tous les GP.
const EVENT = "f1-demo-1";
const sid = (type) => `${EVENT}:${type}`;
export const sessions = [
  ["FirstPractice", "Essais libres 1", "2026-10-16T11:30:00Z"],
  ["SecondPractice", "Essais libres 2", "2026-10-16T15:00:00Z"],
  ["ThirdPractice", "Essais libres 3", "2026-10-17T10:30:00Z"],
  ["Qualifying", "Qualifications", "2026-10-17T14:00:00Z"],
  ["Race", "Course", "2026-10-18T13:00:00Z"],
].map(([type, label, startsAt]) => ({ id: sid(type), type, label, startsAt }));
export const events = [
  {
    id: EVENT,
    competition: "f1",
    name: "Grand Prix d’Italie",
    circuit: "Circuit de démonstration",
    sessions,
  },
];
export const drivers = [
  ["lando_norris", "Lando Norris", "McLaren", 250],
  ["max_verstappen", "Max Verstappen", "Red Bull", 238],
  ["leclerc", "Charles Leclerc", "Ferrari", 210],
  ["piastri", "Oscar Piastri", "McLaren", 205],
  ["russell", "George Russell", "Mercedes", 180],
].map(([id, name, team, points]) => ({ id: `driver-${id}`, name, team, points }));
export const teams = [
  ["mclaren", "McLaren", 455],
  ["red_bull", "Red Bull", 330],
  ["ferrari", "Ferrari", 310],
  ["mercedes", "Mercedes", 280],
].map(([id, name, points]) => ({ id: `team-${id}`, name, points }));
export const articles = [
  {
    id: "preparation",
    title: "Dans les coulisses de la préparation des mécaniciens",
    summary:
      "Avant chaque session, les mécaniciens vérifient le matériel et répètent les procédures. Ce texte fictif illustre le futur résumé en français.",
    tags: ["team-red_bull", "driver-max_verstappen"],
    sessionIds: [],
    rumor: false,
    important: false,
  },
  {
    id: "race-battle",
    title: "Une bataille serrée en tête à mi-course",
    summary:
      "Dans cette course fictive, Norris et Verstappen sont séparés par quelques secondes. Ce contenu disparaît lorsque la course est protégée.",
    tags: ["team-mclaren", "driver-lando_norris", "driver-max_verstappen", "team-red_bull"],
    sessionIds: [sid("Race")],
    rumor: false,
    important: true,
  },
  {
    id: "pole",
    title: "Leclerc signe la pole dans notre session de démonstration",
    summary:
      "Résultat fictif : Leclerc termine devant Norris en qualifications. Cet article est lié aux qualifications et masqué tant qu’elles sont protégées.",
    tags: ["driver-leclerc", "team-ferrari", "driver-lando_norris"],
    sessionIds: [sid("Qualifying")],
    rumor: false,
    important: true,
  },
  {
    id: "rumor",
    title: "Une évolution technique évoquée dans le paddock",
    summary:
      "Rumeur fictive, non confirmée. Les rumeurs sont identifiées et ne sont affichées que si vous les activez.",
    tags: ["team-red_bull"],
    sessionIds: [],
    rumor: true,
    important: false,
  },
  {
    id: "factory",
    title: "Comment une équipe organise le travail à l’usine",
    summary:
      "Article fictif sur la coordination des ingénieurs et des équipes de production.",
    tags: ["team-mercedes", "driver-russell"],
    sessionIds: [],
    rumor: false,
    important: false,
  },
];
const race = [
  ["Lando Norris", "McLaren", "Leader"],
  ["Max Verstappen", "Red Bull", "+ 2,481 s"],
  ["Charles Leclerc", "Ferrari", "+ 5,203 s"],
  ["Oscar Piastri", "McLaren", "+ 7,815 s"],
  ["George Russell", "Mercedes", "+ 10,422 s"],
];
export const results = Object.fromEntries(
  sessions.map((s, i) => [
    s.id,
    (s.type === "Race"
      ? race
      : [race[(i + 2) % 5], ...race.filter((_, j) => j !== (i + 2) % 5)]
    ).map((r, j) => ({
      position: j + 1,
      name: r[0],
      team: r[1],
      value: s.type === "Race" ? r[2] : `1:2${j}.45${i}`,
    })),
  ]),
);
// Même forme que la saison renvoyée par src/jolpica.mjs.
export const demoSeason = {
  mode: "demo",
  events,
  results,
  drivers,
  teams,
  articles,
};
