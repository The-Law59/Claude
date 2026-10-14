# Keep Pushing — version 0.2

**La F1 à votre rythme.** Application React Native / Expo, iPhone et Android, thème Blanc & paprika.

## Tester sur un téléphone

1. Décompresser ce dossier sur votre ordinateur.
2. Installer Node.js 22.13 ou supérieur (version LTS recommandée).
3. Ouvrir un terminal dans le dossier `keep-pushing`.
4. Exécuter `npm ci`, puis `npx expo install --check`.
5. Installer Expo Go sur le téléphone, avec une version compatible avec le SDK 57 du projet.
6. Exécuter `npm start`. Connecter téléphone et ordinateur au même Wi-Fi.
7. Scanner le QR code avec l’appareil photo sur iPhone ou avec Expo Go sur Android.

Si la version d’Expo Go ne prend plus en charge SDK 57, mettre à niveau le SDK selon les instructions Expo, ou utiliser une development build. Le projet n’est pas un fichier IPA/APK signé, ni une application publiée.

## Tester dans le navigateur

`npm run web` : mode développement, sans les actualités (le navigateur bloque les flux RSS). Pour tout avoir : `npx expo export --platform web` puis `npm run serve` (http://localhost:3000), ou Docker : `docker compose up -d`. Installation sur Proxmox : [deploy/README.md](deploy/README.md).

Les rappels locaux sont réservés au téléphone.

## Fonctionnalités

- Calendrier, résultats de la dernière course et des qualifications, classements pilotes et écuries réels via l’API publique [Jolpica](https://github.com/jolpica/jolpica-f1) (sans clé). Sans réseau, l’app bascule sur les données de démonstration, signalées en haut de l’écran.
- Accueil : prochain Grand Prix et prochaine session, fil d’actualités filtré par favoris.
- Veille actualités F1 (`src/news.mjs`) : Formula1.com, FIA, Motorsport.com, RMC Sport, Auto Journal, Google Actualités et Reddit. Chaque article porte un badge **Officiel** (domaine de la F1, de la FIA ou d’une écurie, liste explicite), **Presse** ou **Non officiel** (tout domaine inconnu), filtrable sur l’accueil. Une même info vue par plusieurs flux garde la source la plus fiable. Titre, extrait et lien vers l’article d’origine seulement. Les articles anglais sont traduits en français côté serveur par l’API Claude, modèle Claude Haiku 5.5 (`src/translate.mjs`, clé `ANTHROPIC_API_KEY` sur le serveur uniquement), signalés « Traduit de l’anglais » avec le titre original. Les favoris sont reconnus dans le texte (nom du pilote, de l’écurie). Ajouter une source : une ligne dans `src/news.mjs`. Dans le navigateur (`npm run web`), le flux peut être bloqué par la politique CORS du site ; l’app mobile n’est pas concernée.
- Anti-spoil des actualités, règle prudente : un article publié après le début d’une session protégée est masqué, quel que soit son sujet.
- Anti-spoil par session ou par week-end, pour le dernier et le prochain Grand Prix. Articles liés et résultats masqués ; classements masqués dès qu’une session est protégée.
- Saison complète : calendrier des Grands Prix avec vainqueur, page de chaque GP avec course, sprint et qualifications (chargés à la demande), protection anti-spoil par GP.
- Mode différé : « Je regarde ce week-end en différé » protège tout le week-end ; au retour, l’écran « Prêt à découvrir ? » dévoile le podium marche par marche.
- Anti-spoil automatique (Réglages) : courses et sprints, ou tout le week-end, protégés 5 min avant le départ et jusqu’à 48 h après, sauf les sessions déjà marquées « regardées ».
- Récap du week-end rédigé par Claude (`src/recap.mjs`, serveur) à partir des résultats officiels et des titres d’actualités, une fois par GP ; ligne perso pour mon pilote et mon écurie ; masqué si une session du week-end est protégée.
- Pronostics entre amis (onglet Pronos, `src/predictions.mjs`) : groupes à code d’invitation, sans compte ; pole + podium, fermés aux premières qualifications ; pronos des autres visibles après fermeture ; barème pole 3, place exacte 5, sur le podium 2 ; classement masqué si une session est protégée. Données dans `data/predictions.json` sur le serveur.
- Mon pilote et mon écurie (★) : l’app prend la couleur de l’écurie choisie (`src/teams.mjs`, contraste vérifié par les tests), carte « Mon paddock » sur l’accueil (classement, points, dernier résultat), mis en avant dans les classements. Autres favoris pour filtrer les actualités. Réglages enregistrés sur l’appareil, sans compte.
- Rappels locaux neutres à 10, 30 ou 60 minutes pour les sessions du prochain Grand Prix.

## Architecture

- `app/` : écrans (expo-router). `(tabs)/` contient Accueil, Course, Saison, Favoris, Réglages ; `article/[id].tsx` le détail d’un article ; `gp/[id].tsx` un Grand Prix. Le bouton retour Android et les liens `keeppushing://` fonctionnent.
- `src/store.tsx` : préférences et saison partagées entre les écrans.
- `src/ui.tsx` : thème (`useTheme()`, couleur de l’écurie), composants communs (en-tête, boutons, interrupteurs, classements).
- `src/model.mjs` : règles anti-spoil, rappels, choix du week-end en cours. Testables sans téléphone.
- `src/jolpica.mjs` : lecture de l’API Jolpica vers le modèle de l’app.
- `server.mjs` : serveur de la version web : fichiers, et veille actualités `/api/news.json` (flux fusionnés, traduits, rafraîchis toutes les 5 min). Sur mobile, `EXPO_PUBLIC_API_URL` permet d’utiliser ce serveur ; sinon l’app lit les flux elle-même, sans traduction.
- `src/news.mjs` : sources RSS, lecture des flux, lien des articles aux favoris et aux sessions.
- `src/data.mjs` : données de démonstration, même forme que la saison réelle.
- Modèle : compétition → week-end → sessions. Les ids de session incluent le week-end (`f1-2026-19:Race`) : protéger une course ne masque pas les autres Grands Prix, et l’ajout d’autres compétitions se fera par un nouveau fournisseur.

## Vérifier

`npm test` : tests métier. `npm run check` : TypeScript. `npx expo export --platform web` : compilation web.

## Étape suivante

Ajouter d’autres sources d’actualités après accord ou vérification de leurs conditions (L’Équipe réserve ses flux RSS à un usage personnel). Les notifications distantes devront appliquer la protection côté serveur avant envoi. Ajouter un cache hors ligne de la dernière saison chargée.

Le direct et la position des voitures sur le circuit nécessitent une source dont les droits de redistribution et le coût ont été validés. Ne jamais inclure de clé privée de fournisseur dans l’application mobile. Les comptes et la synchronisation viendront ensuite.

Nom, identifiants d’application et marques restent provisoires avant publication. Aucun logo ou visuel officiel n’est fourni.
