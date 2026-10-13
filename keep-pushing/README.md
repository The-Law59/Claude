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

`npm run web` ouvre la même interface. Les rappels locaux sont réservés au téléphone.

## Fonctionnalités

- Calendrier, résultats de la dernière course et des qualifications, classements pilotes et écuries réels via l’API publique [Jolpica](https://github.com/jolpica/jolpica-f1) (sans clé). Sans réseau, l’app bascule sur les données de démonstration, signalées en haut de l’écran.
- Accueil : prochain Grand Prix et prochaine session, fil d’actualités filtré par favoris. Les actualités restent fictives tant qu’aucune source n’est branchée.
- Anti-spoil par session ou par week-end, pour le dernier et le prochain Grand Prix. Articles liés et résultats masqués ; classements masqués dès qu’une session est protégée.
- Favoris (liste des pilotes et écuries de la saison) et réglages enregistrés sur l’appareil, sans compte.
- Rappels locaux neutres à 10, 30 ou 60 minutes pour les sessions du prochain Grand Prix.

## Architecture

- `app/` : écrans (expo-router). `(tabs)/` contient Accueil, Course, Saison, Favoris, Réglages ; `article/[id].tsx` le détail d’un article. Le bouton retour Android et les liens `keeppushing://` fonctionnent.
- `src/store.tsx` : préférences et saison partagées entre les écrans.
- `src/ui.tsx` : thème, composants communs (en-tête, boutons, interrupteurs, classements).
- `src/model.mjs` : règles anti-spoil, rappels, choix du week-end en cours. Testables sans téléphone.
- `src/jolpica.mjs` : lecture de l’API Jolpica vers le modèle de l’app.
- `src/data.mjs` : données de démonstration, même forme que la saison réelle.
- Modèle : compétition → week-end → sessions. Les ids de session incluent le week-end (`f1-2026-19:Race`) : protéger une course ne masque pas les autres Grands Prix, et l’ajout d’autres compétitions se fera par un nouveau fournisseur.

## Vérifier

`npm test` : tests métier. `npm run check` : TypeScript. `npx expo export --platform web` : compilation web.

## Étape suivante

Brancher un service d’actualités autorisé (résumés français et sources). Chaque article doit référencer toutes les sessions qu’il peut révéler ; en cas de doute, le masquer quand l’anti-spoil est actif. Les notifications distantes devront appliquer la protection côté serveur avant envoi. Ajouter un cache hors ligne de la dernière saison chargée.

Le direct et la position des voitures sur le circuit nécessitent une source dont les droits de redistribution et le coût ont été validés. Ne jamais inclure de clé privée de fournisseur dans l’application mobile. Les comptes et la synchronisation viendront ensuite.

Nom, identifiants d’application et marques restent provisoires avant publication. Aucun logo ou visuel officiel n’est fourni.
