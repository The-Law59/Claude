// Suivi des erreurs (appli et serveur) et état de santé du serveur.
// state.errors : erreurs regroupées par signature (source + message + lieu),
// avec un compteur ; les 200 plus récentes sont gardées.
const KEEP = 200;
const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

// Renvoie l'entrée et `fresh` (première occurrence de cette erreur).
export function recordError(
  state,
  { source, message, stack, where, platform, version },
  now = Date.now(),
) {
  state.errors ??= [];
  const e = {
    source: source === "server" ? "server" : "app",
    message: clip(message, 300) || "Erreur inconnue",
    where: clip(where, 120),
  };
  const signature = `${e.source}|${e.message.split("\n")[0]}|${e.where}`;
  const same = state.errors.find((x) => x.signature === signature);
  if (same) {
    same.count += 1;
    same.last = now;
    same.stack = clip(stack, 2000) || same.stack;
    return { entry: same, fresh: false };
  }
  const entry = {
    signature,
    ...e,
    stack: clip(stack, 2000),
    platform: clip(platform, 40),
    version: clip(version, 20),
    count: 1,
    first: now,
    last: now,
  };
  state.errors.push(entry);
  state.errors.sort((a, b) => b.last - a.last);
  state.errors.length = Math.min(state.errors.length, KEEP);
  return { entry, fresh: true };
}

// Limite par adresse : 30 rapports par heure (une appli qui boucle sur une
// erreur ne doit pas remplir le serveur).
export function rateLimiter(max = 30, windowMs = 3600000) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const h = hits.get(key);
    if (!h || now - h.start > windowMs) {
      if (hits.size > 10000) hits.clear();
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    h.count += 1;
    return h.count <= max;
  };
}

// État de santé : ok tant que le jeu se sauvegarde et que la saison a été
// chargée au moins une fois.
export function health({ startedAt, version, season, news, saveError, now = Date.now() }) {
  const checks = {
    season: season ? "ok" : "indisponible",
    news: news ? `${news.length} articles` : "en attente",
    save: saveError ? `échec : ${saveError}` : "ok",
  };
  return {
    ok: !!season && !saveError,
    version,
    uptime: Math.round((now - startedAt) / 1000),
    checks,
  };
}
