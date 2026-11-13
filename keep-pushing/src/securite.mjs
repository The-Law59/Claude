// Sécurité côté serveur : IP réelle du visiteur, pseudos réservés aux admins,
// limite par IP. Fonctions pures, testées dans tests/securite.test.mjs.

// IP réelle du visiteur. Derrière Nginx Proxy Manager, toutes les connexions
// viennent du proxy : on lit alors X-Forwarded-For, en partant de la FIN
// (la valeur ajoutée par le proxy). La première valeur est écrite par le
// visiteur lui-même : la lire permettrait de se faire passer pour n'importe qui.
// trusted : IP des proxys de confiance (TRUST_PROXY=192.168.1.97 dans .env).
export function clientIp(req, trusted = []) {
  const clean = (ip) => String(ip ?? "").trim().replace(/^::ffff:/, "");
  const remote = clean(req.socket?.remoteAddress);
  if (!trusted.includes(remote)) return remote;
  const chain = String(req.headers?.["x-forwarded-for"] ?? "")
    .split(",")
    .map(clean)
    .filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i--) if (!trusted.includes(chain[i])) return chain[i];
  return remote;
}

export const parseTrusted = (env = "") =>
  env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Les pseudos listés dans ADMINS donnent les droits d'admin. Un pseudo admin
// encore libre (jamais créé, ou abandonné après un changement de pseudo) ne
// doit pas pouvoir être pris par n'importe qui : il serait admin aussitôt.
export function adminPseudoTaken(admins, pseudo, user = null) {
  const wanted = String(pseudo ?? "").trim().toLowerCase();
  if (!admins.includes(wanted)) return false;
  // Un admin peut garder (ou retrouver la casse de) son propre pseudo.
  return !(user && user.pseudo.toLowerCase() === wanted);
}

// Ligne courte pour CrowdSec (bannissement au niveau du réseau) : jamais de
// pseudo ni de mot de passe, seulement l'événement et l'IP.
export const logSecurity = (action, ip, log = console.log) => {
  if (ip) log(`[securite] action=${action} ip=${ip}`);
};

// Échecs par IP sur une fenêtre glissante : on vérifie sans compter, et on
// ne compte que les échecs (une connexion réussie ne coûte rien).
export function failureCounter(max = 30, windowMs = 3600000) {
  const hits = new Map();
  const live = (key, now) => {
    const h = hits.get(key);
    return h && now - h.start <= windowMs ? h : null;
  };
  return {
    blocked: (key, now = Date.now()) => (live(key, now)?.count ?? 0) >= max,
    fail(key, now = Date.now()) {
      const h = live(key, now);
      if (h) h.count += 1;
      else {
        if (hits.size > 10000) hits.clear();
        hits.set(key, { start: now, count: 1 });
      }
    },
  };
}
