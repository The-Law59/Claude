// Pubs récompensées pour regagner le joker ×2 (3 pubs = 1 joker pour le
// week-end, une fois le joker gratuit utilisé). Préparé mais désactivé :
// à brancher quand l'appli sera sur les stores (voir docs/pubs-joker.md).
// Le serveur compte les pubs grâce à l'appel signé de Google (SSV) ; l'appli
// ne fait qu'afficher la pub avec userId et eventId.
export const ADS_ENABLED = false;
export const ADS_PER_JOKER = 3;

// Affiche une pub récompensée. Renvoie true si elle a été vue en entier.
// À remplacer par react-native-google-mobile-ads (RewardedAd) avec
// serverSideVerificationOptions: { userId, customData: eventId }.
export async function watchRewardedAd(_userId: string, _eventId: string): Promise<boolean> {
  return false;
}
