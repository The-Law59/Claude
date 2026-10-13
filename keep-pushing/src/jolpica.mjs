// Calendrier, résultats et classements F1 via l'API publique Jolpica
// (successeur d'Ergast, sans clé). Les actualités n'ont pas encore de source.
const API = "https://api.jolpi.ca/ergast/f1/current";
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
  return (race?.Results ?? race?.QualifyingResults ?? []).map((x) => ({
    position: Number(x.position),
    name: person(x.Driver),
    team: x.Constructor.name,
    value: pick(x),
  }));
}

export function parseSeason({ schedule, results, qualifying, drivers, teams }) {
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
      name: race.raceName,
      circuit: race.Circuit.circuitName,
      sessions,
    };
  });
  const lastRace = results.RaceTable.Races[0];
  const lastQuali = qualifying.RaceTable.Races[0];
  const out = {};
  if (lastRace)
    out[`${eventId(lastRace)}:Race`] = rows(lastRace, (x) => x.Time?.time ?? x.status);
  if (lastQuali)
    out[`${eventId(lastQuali)}:Qualifying`] = rows(lastQuali, (x) => x.Q3 ?? x.Q2 ?? x.Q1 ?? "—");
  const standings = (data, key) => data.StandingsTable.StandingsLists[0]?.[key] ?? [];
  return {
    mode: "live",
    events,
    results: out,
    drivers: standings(drivers, "DriverStandings").map((d) => ({
      id: `driver-${d.Driver.driverId}`,
      name: person(d.Driver),
      team: d.Constructors.at(-1)?.name ?? "",
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

export async function loadSeason(fetchFn = fetch, timeoutMs = 10000) {
  const get = async (path) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchFn(`${API}${path}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Jolpica ${res.status} sur ${path}`);
      return (await res.json()).MRData;
    } finally {
      clearTimeout(timer);
    }
  };
  const [schedule, results, qualifying, drivers, teams] = await Promise.all(
    [
      ".json?limit=100",
      "/last/results.json",
      "/last/qualifying.json",
      "/driverStandings.json",
      "/constructorStandings.json",
    ].map(get),
  );
  const season = parseSeason({ schedule, results, qualifying, drivers, teams });
  // Intersaison : calendrier vide, l'app retombe sur la démo.
  if (!season.events.length) throw new Error("Calendrier vide");
  return season;
}
