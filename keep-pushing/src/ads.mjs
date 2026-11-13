// Joker supplémentaire grâce aux pubs (préparé, désactivé tant que l'app
// n'est pas sur les stores : ADS_ENABLED=1 dans .env pour l'activer).
// Règle : le joker gratuit (un par saison) d'abord ; une fois utilisé,
// 3 pubs récompensées regardées en entier débloquent un joker pour le
// week-end en cours, et ainsi de suite chaque week-end.
// Les récompenses arrivent par la vérification côté serveur d'AdMob (SSV) :
// Google appelle /api/ads/admob-ssv avec une signature ECDSA, l'app ne peut
// donc pas s'attribuer de pubs elle-même.
import { verify } from "node:crypto";

export const ADS_PER_JOKER = 3;
export const ADMOB_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";

// Vérifie un appel SSV d'AdMob. query : la chaîne après « ? ».
// keys : { keyId: pem } (clés publiques publiées par Google).
// Renvoie les paramètres utiles, ou null si la signature est invalide.
export function verifySsv(query, keys) {
  const i = query.indexOf("&signature=");
  if (i === -1) return null;
  const message = query.slice(0, i);
  const params = new URLSearchParams(query);
  const pem = keys[params.get("key_id")];
  const signature = params.get("signature");
  if (!pem || !signature) return null;
  const ok = verify("sha256", Buffer.from(message), pem, Buffer.from(signature, "base64url"));
  if (!ok) return null;
  return {
    userId: params.get("user_id"),
    eventId: params.get("custom_data"),
    transactionId: params.get("transaction_id"),
  };
}

// Format du fichier de clés de Google -> { keyId: pem }.
export const parseKeys = (json) =>
  Object.fromEntries((json.keys ?? []).map((k) => [String(k.keyId), k.pem]));

// Une récompense (pub vue en entier) pour un joueur et un GP, sans doublon.
export function recordReward(state, { userId, eventId, transactionId }, now = Date.now()) {
  state.adRewards ??= {};
  const mine = ((state.adRewards[userId] ??= {})[eventId] ??= { count: 0, transactions: [] });
  if (transactionId && mine.transactions.includes(transactionId)) return mine.count;
  mine.count += 1;
  if (transactionId) mine.transactions.push(transactionId);
  mine.at = now;
  return mine.count;
}

export const adsWatched = (state, userId, eventId) =>
  state.adRewards?.[userId]?.[eventId]?.count ?? 0;

// Joker possible sur ce GP ? freeUsedOn : GP où le joker gratuit est déjà
// posé (autre que celui-ci), ou null. Renvoie la source du joker ou null.
export function jokerSource(state, userId, eventId, freeUsedOn) {
  if (!freeUsedOn) return "free";
  return adsWatched(state, userId, eventId) >= ADS_PER_JOKER ? "ads" : null;
}
