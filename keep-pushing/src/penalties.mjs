// Pénalités de grille annoncées (moteur, boîte de vitesses, sanction…),
// saisies par un admin. Affichées avant les qualifs pour les pronos, puis
// utilisées pour une grille de départ provisoire dès la fin des qualifs ;
// la grille officielle (publiée avec la course) la remplace ensuite.
import { fail } from "./errors.mjs";

export const PENALTY_KINDS = ["places", "back", "pitlane"];
export const PENALTY_REASONS = {
  engine: "Moteur",
  gearbox: "Boîte de vitesses",
  sporting: "Sanction sportive",
  other: "Autre",
};

// « +10 places · Moteur », « Fond de grille · Moteur », « Départ des stands ».
export function penaltyLabel(p) {
  const what =
    p.kind === "places"
      ? `+${p.places} places`
      : p.kind === "back"
        ? "Fond de grille"
        : "Départ des stands";
  return `${what} · ${PENALTY_REASONS[p.reason] ?? PENALTY_REASONS.other}`;
}

// Liste envoyée par un admin : vérifiée, un pilote au plus une fois.
export function checkPenalties(list, driverIds) {
  if (!Array.isArray(list) || list.length > 22) fail(400, "Liste de pénalités invalide.");
  const seen = new Set();
  return list.map((p) => {
    if (!driverIds.includes(p?.driverId)) fail(400, "Pilote inconnu.");
    if (seen.has(p.driverId)) fail(400, "Une seule pénalité par pilote (additionnez les places).");
    seen.add(p.driverId);
    if (!PENALTY_KINDS.includes(p.kind)) fail(400, "Type de pénalité inconnu.");
    const places = p.kind === "places" ? Number(p.places) : 0;
    if (p.kind === "places" && !(Number.isInteger(places) && places >= 1 && places <= 30))
      fail(400, "Nombre de places entre 1 et 30.");
    return {
      driverId: p.driverId,
      kind: p.kind,
      ...(p.kind === "places" && { places }),
      reason: PENALTY_REASONS[p.reason] ? p.reason : "other",
    };
  });
}

// Grille provisoire à partir de l'ordre des qualifs (ids, du 1er au dernier).
// Approximation des règles : un pilote reculé de N places est inséré au rang
// visé (qualif + N) parmi les non pénalisés, ou en dernier s'il n'y a pas assez
// de voitures ; puis les fonds de grille, puis les départs des stands, chacun
// dans l'ordre des qualifs.
export function applyPenalties(order, penalties = []) {
  const byDriver = Object.fromEntries(penalties.map((p) => [p.driverId, p]));
  const pos = Object.fromEntries(order.map((id, i) => [id, i + 1]));
  const grid = order.filter((id) => !byDriver[id]);
  const moved = order
    .filter((id) => byDriver[id]?.kind === "places")
    .sort((a, b) => pos[a] + byDriver[a].places - (pos[b] + byDriver[b].places) || pos[a] - pos[b]);
  for (const id of moved)
    grid.splice(Math.min(pos[id] + byDriver[id].places - 1, grid.length), 0, id);
  return [
    ...grid,
    ...order.filter((id) => byDriver[id]?.kind === "back"),
    ...order.filter((id) => byDriver[id]?.kind === "pitlane"),
  ];
}
