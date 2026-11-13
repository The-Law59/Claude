// Résultats des essais libres (et de la qualif sprint) : Jolpica ne les
// publie pas. Ce module est le point de branchement d'un fournisseur sous
// licence commerciale (Hyprace en premier choix), activé par .env :
//   PRACTICE_PROVIDER=hyprace
//   PRACTICE_API_KEY=…
// Sans fournisseur, l'app indique que les résultats ne sont pas disponibles.
//
// Contrat d'un fournisseur : fetchSession({ event, type, apiKey, fetchFn })
// renvoie des lignes [{ position, name, team, value }] (nom complet du
// pilote, écurie, temps ou écart) ; ce module rattache les pilotes à la saison.

export const PRACTICE_TYPES = [
  "FirstPractice",
  "SecondPractice",
  "ThirdPractice",
  "SprintQualifying",
];
export const isPractice = (type) => PRACTICE_TYPES.includes(type);

// Fournisseurs disponibles. À compléter avec l'adaptateur Hyprace une fois
// l'abonnement pris (voir deploy/README.md, « Essais libres »).
export const PROVIDERS = {};

// Sans accents ni casse : « Hülkenberg » = « Hulkenberg ».
const plain = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// Rattache un nom de pilote (« Max Verstappen », « VERSTAPPEN », « M. Verstappen »)
// à un pilote de la saison, d'abord par nom complet puis par nom de famille.
export function matchDriver(name, drivers) {
  const n = plain(name);
  const last = n.split(/[\s.]+/).at(-1);
  return (
    drivers.find((d) => plain(d.name) === n) ??
    drivers.find((d) => plain(d.name).split(" ").at(-1) === last) ??
    null
  );
}

// Source d'essais pour le serveur, ou null si aucun fournisseur n'est configuré.
export function createPracticeSource({ provider, apiKey, fetchFn = fetch, providers = PROVIDERS }) {
  const p = provider && providers[provider];
  if (!p || !apiKey) return null;
  return async (event, type, drivers) => {
    const raw = await p.fetchSession({ event, type, apiKey, fetchFn });
    return raw.map((r, i) => {
      const d = matchDriver(r.name, drivers);
      return {
        position: Number(r.position) || i + 1,
        driverId: d?.id ?? null,
        name: d?.name ?? r.name,
        team: d?.team ?? r.team ?? "",
        value: r.value ?? "",
      };
    });
  };
}
