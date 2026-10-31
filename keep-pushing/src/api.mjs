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
  if (!res.ok)
    throw Object.assign(new Error(data.error ?? `Serveur indisponible (${res.status}).`), { status: res.status });
  return data;
}

