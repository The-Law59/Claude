# Regagner le joker ×2 avec des pubs

Règle : chaque joueur a un joker gratuit par saison. Une fois utilisé, il peut
regarder **3 pubs récompensées** pendant un week-end pour débloquer un joker
sur **ce** GP. À refaire chaque week-end.

Ce qui est prêt (désactivé) :

- `src/ads.mjs` : vérification de la signature Google (SSV), comptage des pubs
  par joueur et par GP sans doublon, règle du joker (`jokerSource` : gratuit,
  pubs, ou refusé). Testé dans `tests/ads.test.mjs`.
- `server.mjs` :
  - `GET /api/ads/admob-ssv` : appelé par Google après chaque pub vue en
    entier. Signature vérifiée avec les clés publiques de Google (gardées 24 h).
  - `GET /api/ads/status?event=<id>` : pubs vues, pubs nécessaires, joker débloqué.
  - Le pari accepte le joker si le gratuit est libre, ou si 3 pubs ont été vues
    sur ce GP. Un joker « pubs » ne consomme pas le joker gratuit.
  - Ces routes répondent 404 tant que `ADS_ENABLED=1` n'est pas dans `.env`.
- `src/ads.ts` : point d'entrée côté appli (`ADS_ENABLED = false`), rien n'est
  affiché.

À faire au moment de la sortie sur les stores :

1. Créer le compte AdMob, une appli iOS et une Android, et un bloc
   « Récompense » pour chacune. Dans le bloc, activer la vérification côté
   serveur avec l'URL `https://<domaine public>/api/ads/admob-ssv` (le serveur
   doit être joignable en HTTPS depuis Internet).
2. Installer `react-native-google-mobile-ads` (build de développement Expo,
   pas Expo Go) et renseigner les identifiants d'appli dans `app.json`.
3. Dans `src/ads.ts`, implémenter `watchRewardedAd` avec `RewardedAd` et
   `serverSideVerificationOptions: { userId, customData: eventId }`, puis passer
   `ADS_ENABLED` à `true`.
4. Dans Pronos, quand le joker gratuit est déjà posé ailleurs : bouton
   « 🎬 Regarder une pub (x/3) », puis rafraîchir `/api/ads/status`. Une fois
   débloqué, le bouton joker habituel fonctionne.
5. Consentement : formulaire UMP de Google (RGPD, obligatoire en Europe) et,
   sur iPhone, la demande de suivi App Tracking Transparency. À mentionner dans
   la politique de confidentialité.
6. `ADS_ENABLED=1` dans `.env` du serveur, puis `docker compose up -d`.
