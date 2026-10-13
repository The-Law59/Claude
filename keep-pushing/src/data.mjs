// Fixtures uniquement : aucun résultat ou calendrier officiel.
export const favorites = [
  { id: "driver-max", name: "Max Verstappen", kind: "Pilote" },
  { id: "driver-charles", name: "Charles Leclerc", kind: "Pilote" },
  { id: "driver-lando", name: "Lando Norris", kind: "Pilote" },
  { id: "driver-oscar", name: "Oscar Piastri", kind: "Pilote" },
  { id: "driver-george", name: "George Russell", kind: "Pilote" },
  { id: "team-redbull", name: "Red Bull", kind: "Écurie" },
  { id: "team-ferrari", name: "Ferrari", kind: "Écurie" },
  { id: "team-mclaren", name: "McLaren", kind: "Écurie" },
  { id: "team-mercedes", name: "Mercedes", kind: "Écurie" },
];
export const sessions = [
  { id: "fp1", label: "Essais libres 1", startsAt: "2026-10-16T11:30:00Z" },
  { id: "fp2", label: "Essais libres 2", startsAt: "2026-10-16T15:00:00Z" },
  { id: "fp3", label: "Essais libres 3", startsAt: "2026-10-17T10:30:00Z" },
  {
    id: "qualifying",
    label: "Qualifications",
    startsAt: "2026-10-17T14:00:00Z",
  },
  { id: "race", label: "Course", startsAt: "2026-10-18T13:00:00Z" },
];
export const articles = [
  {
    id: "preparation",
    title: "Dans les coulisses de la préparation des mécaniciens",
    summary:
      "Avant chaque session, les mécaniciens vérifient le matériel et répètent les procédures. Ce texte fictif illustre le futur résumé en français.",
    tags: ["team-redbull", "driver-max"],
    sessionIds: [],
    rumor: false,
    important: false,
  },
  {
    id: "race-battle",
    title: "Une bataille serrée en tête à mi-course",
    summary:
      "Dans cette course fictive, Norris et Verstappen sont séparés par quelques secondes. Ce contenu disparaît lorsque la course est protégée.",
    tags: ["team-mclaren", "driver-lando", "driver-max", "team-redbull"],
    sessionIds: ["race"],
    rumor: false,
    important: true,
  },
  {
    id: "pole",
    title: "Leclerc signe la pole dans notre session de démonstration",
    summary:
      "Résultat fictif : Leclerc termine devant Norris en qualifications. Cet article est lié aux qualifications et masqué tant qu’elles sont protégées.",
    tags: ["driver-charles", "team-ferrari", "driver-lando"],
    sessionIds: ["qualifying"],
    rumor: false,
    important: true,
  },
  {
    id: "rumor",
    title: "Une évolution technique évoquée dans le paddock",
    summary:
      "Rumeur fictive, non confirmée. Les rumeurs sont identifiées et ne sont affichées que si vous les activez.",
    tags: ["team-redbull"],
    sessionIds: [],
    rumor: true,
    important: false,
  },
  {
    id: "factory",
    title: "Comment une équipe organise le travail à l’usine",
    summary:
      "Article fictif sur la coordination des ingénieurs et des équipes de production.",
    tags: ["team-mercedes", "driver-george"],
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
    (s.id === "race"
      ? race
      : [race[(i + 2) % 5], ...race.filter((_, j) => j !== (i + 2) % 5)]
    ).map((r, j) => ({
      position: j + 1,
      name: r[0],
      team: r[1],
      value: s.id === "race" ? r[2] : `1:2${j}.45${i}`,
    })),
  ]),
);
export const championship = [
  ["Lando Norris", 250],
  ["Max Verstappen", 238],
  ["Charles Leclerc", 210],
  ["Oscar Piastri", 205],
  ["George Russell", 180],
];
export const constructors = [
  ["McLaren", 455],
  ["Red Bull", 330],
  ["Ferrari", 310],
  ["Mercedes", 280],
];
export const demoProvider = {
  mode: "demo",
  getArticles: () => articles,
  getSessions: () => sessions,
  getResults: (id) => results[id] ?? [],
  getLive: () => results.race,
};
