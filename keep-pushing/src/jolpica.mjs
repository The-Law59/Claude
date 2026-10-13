// Calendrier, résultats et classements F1 via l'API publique Jolpica
// (successeur d'Ergast, sans clé).
const API = "https://api.jolpi.ca/ergast/f1";
const LABELS = {
  FirstPractice: "Essais libres 1",
  SecondPractice: "Essais libres 2",
  ThirdPractice: "Essais libres 3",
  SprintQualifying: "Qualifications sprint",
  Sprint: "Sprint",
  Qualifying: "Qualifications",
};
const at = (x) => `${x.date}T${x.time ?? "00:00:00Z"}`;
const eventId = (race) => `f1-${race.season}-${race.round}`;
const person = (d) => `${d.givenName} ${d.familyName}`;

function rows(race, pick) {
  return (race?.Results ?? race?.SprintResults ?? race?.QualifyingResults ?? []).map((x) => ({
    position: Number(x.position),
    driverId: `driver-${x.Driver.driverId}`,
    name: person(x.Driver),
    team: x.Constructor.name,
    value: pick(x),
  }));
}
const raceTime = (x) => x.Time?.time ?? x.status;

export function parseSeason({ schedule, winners, drivers, teams }) {
  const winnerOf = Object.fromEntries(
    winners.RaceTable.Races.map((r) => [eventId(r), rows(r, raceTime)[0]]),
  );
  const events = schedule.RaceTable.Races.map((race) => {
    const id = eventId(race);
    const sessions = [
      ...Object.keys(LABELS)
        .filter((type) => race[type])
        .map((type) => ({ type, label: LABELS[type], startsAt: at(race[type]) })),
      { type: "Race", label: "Course", startsAt: at(race) },
    ]
      .map((s) => ({ ...s, id: `${id}:${s.type}` }))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      id,
      competition: "f1",
      season: race.season,
      round: Number(race.round),
      name: race.raceName,
      circuit: race.Circuit.circuitName,
      winner: winnerOf[id] ?? null,
      sessions,
    };
  });
  const standings = (data, key) => data.StandingsTable.StandingsLists[0]?.[key] ?? [];
  return {
    mode: "live",
    events,
    // Rempli Grand Prix par Grand Prix avec loadRound().
    results: {},
    drivers: standings(drivers, "DriverStandings").map((d) => ({
      id: `driver-${d.Driver.driverId}`,
      name: person(d.Driver),
      team: d.Constructors.at(-1)?.name ?? "",
      teamId: `team-${d.Constructors.at(-1)?.constructorId}`,
      points: Number(d.points),
    })),
    teams: standings(teams, "ConstructorStandings").map((t) => ({
      id: `team-${t.Constructor.constructorId}`,
      name: t.Constructor.name,
      points: Number(t.points),
    })),
    articles: [],
  };
}

// Résultats d'un week-end, rangés par id de session.
export function parseRound(event, { race, qualifying, sprint }) {
  const out = {};
  const add = (type, data, pick) => {
    const r = data?.RaceTable.Races[0];
    if (r) out[`${event.id}:${type}`] = rows(r, pick);
  };
  add("Race", race, raceTime);
  add("Sprint", sprint, raceTime);
  add("Qualifying", qualifying, (x) => x.Q3 ?? x.Q2 ?? x.Q1 ?? "—");
  return out;
}

// fetch avec délai maximal : un réseau lent ne bloque pas le démarrage.
export async function timedFetch(fetchFn, url, timeoutMs = 10000, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const getJson = async (fetchFn, path) => {
  const res = await timedFetch(fetchFn, `${API}${path}`);
  if (!res.ok) throw new Error(`Jolpica ${res.status} sur ${path}`);
  return (await res.json()).MRData;
};

export async function loadSeason(fetchFn = fetch) {
  // 4 requêtes au démarrage : Jolpica limite les rafales (4 req/s).
  const [schedule, winners, drivers, teams] = await Promise.all(
    [
      "/current.json?limit=100",
      "/current/results/1.json?limit=100",
      "/current/driverStandings.json",
      "/current/constructorStandings.json",
    ].map((path) => getJson(fetchFn, path)),
  );
  const season = parseSeason({ schedule, winners, drivers, teams });
  // Intersaison : calendrier vide, l'app retombe sur la démo.
  if (!season.events.length) throw new Error("Calendrier vide");
  return season;
}

export async function loadRound(event, fetchFn = fetch) {
  const base = `/${event.season}/${event.round}`;
  const hasSprint = event.sessions.some((s) => s.type === "Sprint");
  const [race, qualifying, sprint] = await Promise.all([
    getJson(fetchFn, `${base}/results.json?limit=100`),
    getJson(fetchFn, `${base}/qualifying.json?limit=100`),
    hasSprint ? getJson(fetchFn, `${base}/sprint.json?limit=100`) : null,
  ]);
  return parseRound(event, { race, qualifying, sprint });
}
