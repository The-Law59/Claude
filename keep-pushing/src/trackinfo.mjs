// Fiche d'un circuit : tours et distance de course (règle : le plus petit
// nombre de tours dépassant 305 km ; Monaco fait exception, 78 tours).
export const RACE_DISTANCE = 305000;
export const LAPS_OVERRIDE = { monaco: 78 };

export function raceLaps(circuitId, lengthMeters) {
  if (LAPS_OVERRIDE[circuitId]) return LAPS_OVERRIDE[circuitId];
  return Math.floor(RACE_DISTANCE / lengthMeters) + 1;
}
// Mètres -> « 5,412 km ».
export const km = (meters) =>
  `${(meters / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km`;
