// Appels au serveur Keep Pushing : même origine dans le navigateur, ou
// EXPO_PUBLIC_API_URL sur mobile. Sans serveur, les fonctions qui en
// dépendent (traduction, pronostics) sont masquées.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
export const hasApi = () => typeof document !== "undefined" || !!API_URL;

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, token?: string | null }} [options]
 * @returns {Promise<any>}
 */
export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body && { "content-type": "application/json" }),
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Serveur indisponible (${res.status}).`);
  return data;
}

// Profil de pronos sans compte : la clé « groupe.membre.secret » suffit à le
// retrouver sur un autre appareil, via un lien …/pronos?cle=… ou en la collant.
/** @param {{ groupId: string, memberId: string, token: string }} g */
export const memberKey = (g) => `${g.groupId}.${g.memberId}.${g.token}`;

/** @param {string} key */
export const loginLink = (key) =>
  `${API_URL || (typeof location !== "undefined" ? location.origin : "")}/pronos?cle=${key}`;

/** Accepte la clé seule ou le lien complet. @param {string} text */
export function parseMemberKey(text) {
  const key = String(text).trim().split("cle=").at(-1).split(/[&#\s]/)[0];
  const [groupId, memberId, token, ...rest] = key.split(".");
  const ok = /^[\w.-]+$/.test(key) && groupId && memberId && token && rest.length === 0;
  return ok ? { groupId, memberId, token } : null;
}
