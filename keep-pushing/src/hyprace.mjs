// Calendrier, classements et résultats F1 via l'API Hyprace (RapidAPI, plan
// Pro : 200 appels par jour, 4 000 par mois, au-delà c'est bloqué). Utilisée
// par le serveur seulement, qui garde tout en mémoire et le sert à tous les
// téléphones : la clé ne quitte jamais le serveur.
// Les données sont converties dans la forme déjà utilisée par l'appli (celle
// de Jolpica), avec les mêmes identifiants, pour que pronos, Mercato et
// historiques restent valides.
import { timedFetch } from "./jolpica.mjs";

export const HYPRACE_HOST = "hyprace-api.p.rapidapi.com";
const API = `https://${HYPRACE_HOST}/v2`;

// --- Client : en-têtes RapidAPI, suivi du quota (en-têtes X-Ratelimit-*).
export class QuotaError extends Error {}
// reserve : appels gardés de côté chaque jour, pour ne jamais être bloqué.
export function createHypraceClient({ apiKey, fetchFn = fetch, reserve = 15, log = () => {} }) {
  const usage = { calls: 0, remainingDay: null, remainingMonth: null, lastError: "", at: 0 };
  async function get(path, params = {}) {
    if (
      usage.remainingDay !== null &&
      usage.remainingDay <= reserve &&
      Date.now() - usage.at < 86400000
    )
      throw new QuotaError("Quota Hyprace du jour presque atteint : données en mémoire servies.");
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
    ).toString();
    const res = await timedFetch(fetchFn, `${API}${path}${query ? `?${query}` : ""}`, 15000, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": HYPRACE_HOST },
    });
    usage.calls += 1;
    usage.at = Date.now();
    const day = Number(res.headers.get("x-ratelimit-requests-remaining"));
    const month = Number(res.headers.get("x-ratelimit-requests-per-month-remaining"));
    if (Number.isFinite(day) && res.headers.get("x-ratelimit-requests-remaining") !== null)
      usage.remainingDay = day;
    if (
      Number.isFinite(month) &&
      res.headers.get("x-ratelimit-requests-per-month-remaining") !== null
    )
      usage.remainingMonth = month;
    if (!res.ok) {
      usage.lastError = `Hyprace ${res.status} sur ${path}`;
      log(usage.lastError);
      if (res.status === 429) usage.remainingDay = 0;
      throw new Error(usage.lastError);
    }
    return res.json();
  }
  return { get, usage };
}

// --- Identifiants de l'appli (ceux de Jolpica), à partir des noms Hyprace.
const plain = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
const slug = (t) =>
  plain(t)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
// Pilotes dont l'identifiant n'est pas simplement le nom de famille.
const DRIVER_IDS = {
  "max verstappen": "max_verstappen",
  "paul aron": "paul_aron",
  "dino beganovic": "dino_beganovic",
  "luke browning": "luke_browning",
  "rafael camara": "rafael_camara",
  "jak crawford": "jak_crawford",
  "leonardo fornaroli": "leonardo_fornaroli",
  "colton herta": "colton_herta",
  "ryo hirakawa": "hirakawa", // id gardé depuis son ajout manuel (pronos existants)
  "ayumu iwasa": "ayumu_iwasa",
  "arvid lindblad": "arvid_lindblad",
  "gabriele mini": "gabriele_mini",
  "freddie slater": "freddie_slater",
  "nikola tsolov": "nikola_tsolov",
  "frederik vesti": "frederik_vesti",
};
// Pilotes déjà connus sous leur seul nom de famille (titulaires de longue date).
const SURNAME_IDS = new Set([
  "albon",
  "alonso",
  "antonelli",
  "bearman",
  "bortoleto",
  "bottas",
  "colapinto",
  "gasly",
  "hadjar",
  "hamilton",
  "hulkenberg",
  "lawson",
  "leclerc",
  "norris",
  "ocon",
  "piastri",
  "perez",
  "russell",
  "sainz",
  "stroll",
  "tsunoda",
]);
export function driverIdOf({ firstName, lastName }) {
  const full = `${plain(firstName)} ${plain(lastName)}`;
  if (DRIVER_IDS[full]) return `driver-${DRIVER_IDS[full]}`;
  const last = slug(lastName);
  // Nouveau pilote : prénom_nom, comme Jolpica pour les arrivées récentes.
  return `driver-${SURNAME_IDS.has(last) ? last : `${slug(firstName)}_${last}`}`;
}
const TEAMS = {
  ferrari: ["ferrari", "Ferrari"],
  mercedes: ["mercedes", "Mercedes"],
  "red bull racing": ["red_bull", "Red Bull"],
  mclaren: ["mclaren", "McLaren"],
  "aston martin": ["aston_martin", "Aston Martin"],
  alpine: ["alpine", "Alpine F1 Team"],
  williams: ["williams", "Williams"],
  "racing bulls": ["rb", "RB F1 Team"],
  haas: ["haas", "Haas F1 Team"],
  audi: ["audi", "Audi"],
  cadillac: ["cadillac", "Cadillac F1 Team"],
};
export function teamOf(team) {
  const known = TEAMS[plain(team.name)];
  return known
    ? { id: `team-${known[0]}`, name: known[1] }
    : { id: `team-${slug(team.name)}`, name: team.shortName ?? team.name };
}
// circuitId Jolpica (tracés, historique du circuit) d'après le nom du GP.
const CIRCUITS = [
  [/austral/, "albert_park"],
  [/chin/, "shanghai"],
  [/japan/, "suzuka"],
  [/miami/, "miami"],
  [/canad/, "villeneuve"],
  [/monaco/, "monaco"],
  [/barcelona/, "catalunya"],
  [/spanish|espan/, "madring"],
  [/austria/, "red_bull_ring"],
  [/british/, "silverstone"],
  [/belgian/, "spa"],
  [/hungar/, "hungaroring"],
  [/dutch/, "zandvoort"],
  [/italian/, "monza"],
  [/emilia/, "imola"],
  [/azerbaijan/, "baku"],
  [/malaysia/, "sepang"],
  [/singapore/, "marina_bay"],
  [/united states/, "americas"],
  [/mexico/, "rodriguez"],
  [/sao paulo|brazil/, "interlagos"],
  [/las vegas/, "vegas"],
  [/qatar/, "losail"],
  [/abu dhabi/, "yas_marina"],
  [/bahrain/, "bahrain"],
  [/saudi/, "jeddah"],
];
export const circuitIdOf = (gpName) => CIRCUITS.find(([re]) => re.test(plain(gpName)))?.[1];

// --- Saison.
const SESSION_TYPES = {
  FirstPractice: ["FirstPractice", "Essais libres 1"],
  SecondPractice: ["SecondPractice", "Essais libres 2"],
  ThirdPractice: ["ThirdPractice", "Essais libres 3"],
  SprintQualifying: ["SprintQualifying", "Qualifications sprint"],
  SprintRace: ["Sprint", "Sprint"],
  StandardQualifying: ["Qualifying", "Qualifications"],
  MainRace: ["Race", "Course"],
};

// Pilotes connus (titulaires et réservistes) : uuid Hyprace -> { id, name, team }.
export function peopleOf(teams) {
  const people = new Map();
  for (const t of teams) {
    const team = teamOf(t);
    for (const d of t.drivers ?? []) {
      const prev = people.get(d.id);
      // Écurie de rattachement : celle où il est titulaire, sinon celle où il a marqué.
      const better =
        !prev ||
        (d.driverStatus === "Main" && prev.status !== "Main") ||
        (!prev.standing && d.standing);
      if (!better) continue;
      people.set(d.id, {
        id: driverIdOf(d),
        name: `${d.firstName} ${d.lastName}`,
        team: team.name,
        teamId: team.id,
        status: d.driverStatus,
        standing: d.standing ?? prev?.standing ?? null,
      });
    }
  }
  return people;
}

// circuits : { uuid Hyprace: infos du circuit } (gardées par le serveur).
export function parseSeason({ grandsPrix, teams, circuits = {} }) {
  const people = peopleOf(teams);
  const teamNames = new Map(teams.map((t) => [t.id, teamOf(t)]));
  const row = (ref, position) => {
    const p = ref && people.get(ref.driverId);
    return (
      p && {
        position,
        driverId: p.id,
        name: p.name,
        team: teamNames.get(ref.teamId)?.name ?? p.team,
        value: "",
      }
    );
  };
  const events = [...grandsPrix]
    .filter((gp) => gp.status !== "Cancelled")
    .sort((a, b) => a.round - b.round)
    .map((gp) => {
      const id = `f1-${gp.season.year}-${gp.round}`;
      const circuit = circuits[gp.circuitId];
      return {
        id,
        competition: "f1",
        season: String(gp.season.year),
        round: gp.round,
        name: gp.name,
        circuit: circuit?.name ?? gp.name.replace(/ Grand Prix$/, ""),
        circuitId: circuitIdOf(gp.name),
        ...(circuit && {
          location: {
            lat: Number(circuit.latitude),
            long: Number(circuit.longitude),
            locality: circuit.place,
            country: circuit.country?.name ?? "",
          },
        }),
        winner: gp.status === "Finished" ? (row(gp.winner, 1) ?? null) : null,
        sessions: gp.schedule
          .filter((s) => SESSION_TYPES[s.type])
          .map((s) => {
            const [type, label] = SESSION_TYPES[s.type];
            return { id: `${id}:${type}`, type, label, startsAt: s.startDate, sourceId: s.id };
          })
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
        sourceId: gp.id,
        laps: gp.scheduledLaps ?? null,
      };
    });
  // Classements : pilotes qui ont couru (ils ont un classement), écuries.
  const drivers = [...people.values()]
    .filter((p) => p.standing)
    .sort((a, b) => a.standing.position - b.standing.position)
    .map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      teamId: p.teamId,
      points: p.standing.points,
    }));
  const teamRows = teams
    .map((t) => ({ ...teamOf(t), standing: t.constructors?.[0]?.standing }))
    .filter((t) => t.standing)
    .sort((a, b) => a.standing.position - b.standing.position)
    .map((t) => ({ id: t.id, name: t.name, points: t.standing.points }));
  return {
    mode: "live",
    source: "hyprace",
    events,
    results: {},
    drivers,
    teams: teamRows,
    articles: [],
  };
}

// --- Résultats d'une séance -> lignes de l'appli.
// people : Map uuid -> pilote ; teamNames : Map uuid -> { name }.
const STATUS = {
  Dnf: ["R", "Abandon"],
  Dns: ["W", "Non partant"],
  Dsq: ["D", "Disqualifié"],
};
export function raceRows(data, people, teamNames) {
  return (data.participations ?? [])
    .filter((p) => p.result)
    .sort((a, b) => a.result.position - b.result.position)
    .map((p) => {
      const r = p.result;
      const who = people.get(p.driverId);
      const status = r.resultStatus ?? {};
      const classified = status.positionStatus === "Classified";
      const text = classified ? String(r.position) : (STATUS[status.status]?.[0] ?? "N");
      const value =
        r.position === 1 && classified
          ? (r.time ?? "")
          : classified
            ? r.gapToLeader
              ? `+${r.gapToLeader}`
              : r.lapsBehindLeader
                ? `+${r.lapsBehindLeader} tour${r.lapsBehindLeader > 1 ? "s" : ""}`
                : (r.time ?? "")
            : (STATUS[status.status]?.[1] ?? "Non classé");
      return {
        position: r.position,
        driverId: who?.id ?? `driver-${p.driverId}`,
        name: who?.name ?? "Pilote inconnu",
        team: teamNames.get(p.teamId)?.name ?? who?.team ?? "",
        value,
        positionText: text,
        ...(p.fastestLap?.rank === 1 && { fastestLap: true }),
        ...(r.grid !== undefined && { grid: r.grid }),
      };
    });
}
const plainRows = (list, people, teamNames, value) =>
  [...(list ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((x) => {
      const who = people.get(x.driverId);
      return {
        position: x.position,
        driverId: who?.id ?? `driver-${x.driverId}`,
        name: who?.name ?? "Pilote inconnu",
        team: teamNames.get(x.teamId)?.name ?? who?.team ?? "",
        value: value(x),
      };
    });
export const qualiRows = (data, people, teamNames) =>
  plainRows(data.results, people, teamNames, (x) => x.q3 ?? x.q2 ?? x.q1 ?? "—");
export const practiceRows = (data, people, teamNames) =>
  plainRows(data.results, people, teamNames, (x) =>
    x.position === 1 ? (x.time ?? "") : x.gapToLeader ? `+${x.gapToLeader}` : (x.time ?? ""),
  );
// Grille de départ officielle (pénalités comprises), publiée avant la course.
export const gridRows = (data, people, teamNames) =>
  plainRows(data.positions, people, teamNames, (x) => x.time ?? "");

// --- Quand relire une séance (le quota est compté).
const MIN = 60000;
const HOUR = 60 * MIN;
const DURATION = { Race: 2 * HOUR, Sprint: HOUR, Qualifying: HOUR, SprintQualifying: HOUR };
// entry : { rows, at } déjà lu, ou undefined. Renvoie le délai minimal depuis
// la dernière lecture (0 : lire maintenant), Infinity (séance pas finie) ou
// null (définitive, plus jamais relue).
export function nextFetchIn(type, startsAt, entry, now = Date.now()) {
  const end = Date.parse(startsAt) + (DURATION[type] ?? HOUR);
  if (now < end + 5 * MIN) return Infinity;
  if (!entry) return 0;
  const since = now - end;
  const race = type === "Race" || type === "Sprint";
  if (!entry.rows?.length)
    return since < 6 * HOUR ? 15 * MIN : since < 7 * 24 * HOUR ? 6 * HOUR : null;
  // Pénalités d'après-course : relue pendant 7 jours, de plus en plus rarement.
  if (race) return since < 6 * HOUR ? 30 * MIN : since < 7 * 24 * HOUR ? 6 * HOUR : null;
  return since < 24 * HOUR ? 3 * HOUR : null;
}
// Grille officielle : relue chaque heure entre la fin des qualifs et le départ.
export function gridFetchIn(qualiStart, raceStart, entry, now = Date.now()) {
  if (now < Date.parse(qualiStart) + 90 * MIN) return Infinity;
  if (now >= Date.parse(raceStart)) return null;
  return entry ? HOUR : 0;
}

const SCORING = new Set(["Qualifying", "Sprint", "Race"]);
const pathOf = (event, s) =>
  s.type.endsWith("Practice")
    ? `/grands-prix/${event.sourceId}/practices/${s.sourceId}/results`
    : s.type.endsWith("Qualifying")
      ? `/grands-prix/${event.sourceId}/qualifying/${s.sourceId}/results`
      : `/grands-prix/${event.sourceId}/races/${s.sourceId}/results`;
const toRows = (s, data, people, teamNames) =>
  s.type.endsWith("Practice")
    ? practiceRows(data, people, teamNames)
    : s.type.endsWith("Qualifying")
      ? qualiRows(data, people, teamNames)
      : raceRows(data, people, teamNames);

// --- Chargeur des résultats d'un GP, séance par séance.
// cache : objet { sessionId: { rows, at, final } } gardé sur disque par le serveur.
// options.all : aussi les essais et la qualif sprint (affichage) ; sinon
// seulement ce qui sert aux pronos. options.max : lectures au plus par passage.
export function createRoundLoader(
  client,
  getContext,
  cache,
  { now = () => Date.now(), onChange = () => {} } = {},
) {
  async function fetchInto(key, path, convert) {
    try {
      const data = await client.get(path);
      cache[key] = { rows: convert(data), at: now(), final: false };
    } catch (e) {
      // 404 : pas encore publiée ; quota : on garde ce qu'on a.
      if (e instanceof QuotaError) return false;
      if (/ 404 /.test(e.message)) cache[key] = { rows: [], at: now(), final: false };
      else throw e;
    }
    onChange();
    return true;
  }
  async function load(event, { all = false, max = 6 } = {}) {
    const { people, teamNames } = getContext();
    let budget = max;
    const out = {};
    // Séances des pronos d'abord (course, sprint, qualifs), puis l'affichage.
    const ordered = [...event.sessions].sort(
      (a, b) => Number(SCORING.has(b.type)) - Number(SCORING.has(a.type)),
    );
    for (const s of ordered) {
      if (!s.sourceId || (!all && !SCORING.has(s.type))) continue;
      const entry = cache[s.id];
      if (!entry?.final) {
        const wait = nextFetchIn(s.type, s.startsAt, entry, now());
        if (wait === null) cache[s.id] = { ...(entry ?? { rows: [], at: now() }), final: true };
        else if (wait !== Infinity && (!entry || now() - entry.at >= wait) && budget > 0) {
          budget -= 1;
          if (!(await fetchInto(s.id, pathOf(event, s), (d) => toRows(s, d, people, teamNames))))
            budget = 0;
        }
      }
      if (cache[s.id]?.rows?.length) out[s.id] = cache[s.id].rows;
    }
    // Grille officielle (pénalités comprises) avant la course.
    const quali = event.sessions.find((s) => s.type === "Qualifying");
    const race = event.sessions.find((s) => s.type === "Race");
    const key = `${event.id}:Grid`;
    if (quali && race?.sourceId && !out[race.id]) {
      const entry = cache[key];
      const wait = gridFetchIn(quali.startsAt, race.startsAt, entry, now());
      if (wait !== null && wait !== Infinity && (!entry || now() - entry.at >= wait) && budget > 0)
        await fetchInto(
          key,
          `/grands-prix/${event.sourceId}/races/${race.sourceId}/grid-positions`,
          (d) => gridRows(d, people, teamNames),
        );
      if (cache[key]?.rows?.length) out[key] = cache[key].rows;
    }
    return out;
  }
  // Séances qui servent aux pronos : toutes définitives.
  const settled = (event) =>
    event.sessions.every((s) => !s.sourceId || !SCORING.has(s.type) || cache[s.id]?.final);
  return { load, settled };
}

// --- Saison complète (2 appels), plus les circuits manquants (au plus 3 par passage).
export async function loadSeasonFrom(client, { year, circuits }) {
  const gps = await client.get("/grands-prix", { seasonYear: year, pageSize: 25 });
  const seasonId = gps.items[0]?.season.id;
  if (!seasonId) throw new Error("Calendrier Hyprace vide");
  const teams = await client.get(`/seasons/${seasonId}/teams`, { pageSize: 25 });
  // Circuits des GP les plus proches d'abord (météo du week-end, page du GP).
  const now = Date.now();
  const missing = [...gps.items]
    .sort(
      (a, b) => Math.abs(Date.parse(a.startDate) - now) - Math.abs(Date.parse(b.startDate) - now),
    )
    .map((g) => g.circuitId)
    .filter((id, i, all) => !circuits[id] && all.indexOf(id) === i);
  for (const id of missing.slice(0, 3)) {
    try {
      circuits[id] = await client.get(`/circuits/${id}`);
    } catch {
      break;
    }
  }
  return { grandsPrix: gps.items, teams: teams.items, circuits };
}
