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

// Pilotes remplaçants annoncés mais pas encore dans les classements Jolpica
// (un pilote n'y apparaît qu'après sa première course). Ajoutés à la saison
// pour pouvoir être pariés ; le titulaire reste listé, au cas où le
// remplacement ne dure qu'un week-end. Par année de saison.
export const ROSTER_ADDITIONS = {
  2026: [{ driverId: "hirakawa", givenName: "Ryo", familyName: "Hirakawa", constructorId: "haas" }],
};
const additionsOf = (season) => ROSTER_ADDITIONS[season] ?? [];
// Même pilote si Jolpica lui donne un autre identifiant : on garde le nôtre,
// pour que paris et résultats parlent du même pilote.
const plainName = (t) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function driverKey(driver, season) {
  const added = additionsOf(season).find(
    (a) => plainName(a.familyName) === plainName(driver.familyName ?? ""),
  );
  return `driver-${added?.driverId ?? driver.driverId}`;
}

function rows(race, pick) {
  return (race?.Results ?? race?.SprintResults ?? race?.QualifyingResults ?? []).map((x) => ({
    position: Number(x.position),
    driverId: driverKey(x.Driver, race?.season),
    name: person(x.Driver),
    team: x.Constructor.name,
    value: pick(x),
    // Pour les paris : non classés (R, D…) et meilleur tour.
    ...(x.positionText && { positionText: x.positionText }),
    ...(x.FastestLap?.rank === "1" && { fastestLap: true }),
    ...(x.grid !== undefined && { grid: Number(x.grid) }),
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
      circuitId: race.Circuit.circuitId,
      location: race.Circuit.Location && {
        lat: Number(race.Circuit.Location.lat),
        long: Number(race.Circuit.Location.long),
        locality: race.Circuit.Location.locality,
        country: race.Circuit.Location.country,
      },
      winner: winnerOf[id] ?? null,
      sessions,
    };
  });
  const standings = (data, key) => data.StandingsTable.StandingsLists[0]?.[key] ?? [];
  const year = schedule.RaceTable.season ?? schedule.RaceTable.Races[0]?.season;
  return {
    mode: "live",
    events,
    // Rempli Grand Prix par Grand Prix avec loadRound().
    results: {},
    drivers: withAdditions(
      standings(drivers, "DriverStandings").map((d) => ({
        id: driverKey(d.Driver, year),
        name: person(d.Driver),
        team: d.Constructors.at(-1)?.name ?? "",
        teamId: `team-${d.Constructors.at(-1)?.constructorId}`,
        points: Number(d.points),
      })),
      standings(teams, "ConstructorStandings"),
      year,
    ),
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

// Ajoute les remplaçants absents des classements, en fin de liste, à 0 point.
function withAdditions(list, teams, season) {
  const extra = additionsOf(season)
    .filter((a) => !list.some((d) => d.id === `driver-${a.driverId}`))
    .map((a) => ({
      id: `driver-${a.driverId}`,
      name: `${a.givenName} ${a.familyName}`,
      team:
        teams.find((t) => t.Constructor.constructorId === a.constructorId)?.Constructor.name ?? "",
      teamId: `team-${a.constructorId}`,
      points: 0,
    }));
  return [...list, ...extra];
}

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

// Saison d'un pilote, GP par GP : place en course (dnf si non classé) et en qualifs.
export function parseDriverSeason(results, qualifying) {
  const rounds = {};
  for (const r of results.RaceTable.Races) {
    const x = r.Results[0];
    rounds[r.round] = {
      round: Number(r.round),
      name: r.raceName,
      race: Number(x.position),
      dnf: !/^\d+$/.test(x.positionText),
      points: Number(x.points),
    };
  }
  for (const q of qualifying.RaceTable.Races) {
    rounds[q.round] ??= { round: Number(q.round), name: q.raceName };
    rounds[q.round].quali = Number(q.QualifyingResults[0].position);
  }
  return Object.values(rounds).sort((a, b) => a.round - b.round);
}

export async function loadDriverSeason(driverId, fetchFn = fetch) {
  const id = driverId.replace(/^driver-/, "");
  const [results, qualifying] = await Promise.all(
    ["results", "qualifying"].map((kind) =>
      getJson(fetchFn, `/current/drivers/${id}/${kind}.json?limit=100`),
    ),
  );
  return parseDriverSeason(results, qualifying);
}

// Saison d'une écurie, GP par GP : points (course + sprint) et meilleure place.
export function parseTeamSeason(results, sprints) {
  const rounds = {};
  const add = (races, key) => {
    for (const r of races.RaceTable.Races) {
      const x = (rounds[r.round] ??= {
        round: Number(r.round),
        name: r.raceName,
        points: 0,
        best: null,
      });
      for (const row of r[key]) {
        x.points += Number(row.points);
        if (key === "Results") x.best = Math.min(x.best ?? 99, Number(row.position));
      }
    }
  };
  add(results, "Results");
  add(sprints, "SprintResults");
  return Object.values(rounds).sort((a, b) => a.round - b.round);
}

export async function loadTeamSeason(teamId, fetchFn = fetch) {
  const id = teamId.replace(/^team-/, "");
  const [results, sprints] = await Promise.all(
    ["results", "sprint"].map((kind) =>
      getJson(fetchFn, `/current/constructors/${id}/${kind}.json?limit=100`),
    ),
  );
  return parseTeamSeason(results, sprints);
}

// Vainqueurs passés d'un circuit, du plus récent au plus ancien.
export function parseCircuitHistory(data) {
  return data.RaceTable.Races.map((r) => ({
    season: r.season,
    driver: person(r.Results[0].Driver),
    team: r.Results[0].Constructor.name,
  })).reverse();
}

export async function loadCircuitHistory(circuitId, fetchFn = fetch) {
  return parseCircuitHistory(
    await getJson(fetchFn, `/circuits/${circuitId}/results/1.json?limit=100`),
  );
}
