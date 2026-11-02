// Classements corrigés par un admin : quand une pénalité d'après-course
// n'est pas encore reportée par Jolpica, un admin saisit l'ordre officiel
// (au moins le top 10 de la course ou des qualifs, le top 8 du sprint).
// Les pilotes saisis passent devant, dans cet ordre ; les autres suivent
// dans l'ordre de Jolpica. Utilisé par le serveur (points) et l'appli (affichage).

// Taille minimale d'une correction, par type de session.
export const OVERRIDE_SIZE = { Race: 10, Qualifying: 10, Sprint: 8 };
export const sessionType = (sessionId) => sessionId.split(":").at(-1);

export function reorder(rows, ids) {
  const top = ids.map((id) => rows.find((r) => r.driverId === id)).filter(Boolean);
  const rest = rows.filter((r) => !ids.includes(r.driverId));
  return [...top, ...rest].map((r, i) => ({
    ...r,
    position: i + 1,
    ...(r.positionText && /^\d+$/.test(r.positionText) && { positionText: String(i + 1) }),
    corrected: true,
  }));
}

// results : { sessionId: rows } ; overrides : { sessionId: { ids } }.
export function withOverrides(results, overrides = {}) {
  if (!results) return results;
  return Object.fromEntries(
    Object.entries(results).map(([id, rows]) => [
      id,
      overrides[id] && rows?.length ? reorder(rows, overrides[id].ids) : rows,
    ]),
  );
}

// Vérifie une correction ; renvoie un message d'erreur ou null.
export function checkOverride(sessionId, ids, driverIds) {
  const size = OVERRIDE_SIZE[sessionType(sessionId)];
  if (!size) return "Seuls la course, les qualifs et le sprint se corrigent.";
  if (!Array.isArray(ids) || ids.length < size) return `Il faut au moins ${size} pilotes.`;
  if (!ids.every((id) => driverIds.includes(id))) return "Pilote inconnu.";
  if (new Set(ids).size !== ids.length) return "Un pilote est en double.";
  return null;
}
