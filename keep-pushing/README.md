# Keep Pushing — version 0.1

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

- Accueil personnalisé par pilotes et écuries, fil de toutes les actualités.
- Article détaillé, filtre de rumeurs.
- Classement de course simulé, résultats par session, points pilotes et écuries fictifs.
- Horaires du week-end convertis dans le fuseau du téléphone.
- Favoris et réglages persistés avec AsyncStorage, sans compte.
- Protection par session ou week-end : articles liés et résultats masqués. Les points du championnat sont masqués dès qu’une session est protégée.
- Rappels locaux neutres à 10, 30 ou 60 minutes, avec autorisation du téléphone demandée à l’activation.

**Toutes les données sont fictives**, y compris les horaires du 16 au 18 octobre 2026. Les rappels sont désactivés par défaut : ne les activer que pour tester ces dates de démonstration. Aucune actualité distante ni notification de résultat n’est envoyée. Le choix de fréquence des actualités et les alertes de résultats sont enregistrés pour l’intégration future.

## Architecture

- `App.tsx` : cinq écrans et navigation, thème, lecture et sauvegarde des préférences.
- `src/model.mjs` : règles de visibilité, anti-spoil, notification et planification, testables sans téléphone.
- `src/data.mjs` : jeux de démonstration et contrat minimal de fournisseur.
- `src/reminders.ts` : rappels locaux natifs. Aucune notification à contenu sportif n’est programmée dans cette version.
- `tests/model.test.mjs` : tests de règles métier.

## Vérifier

`npm test` : tests métier. `npm run check` : TypeScript. `npx expo export --platform web` : compilation web.

## Étape suivante

Brancher un service d’actualités autorisé (résumés français et sources), calendrier et résultats fiables. Chaque article doit référencer toutes les sessions qu’il peut révéler ; en cas de doute, le masquer quand l’anti-spoil est actif. Les notifications distantes devront appliquer la protection côté serveur avant envoi, notamment quand l’application est fermée. Ne pas ajouter de notification révélant un résultat avant cette intégration.

Le direct et la position des voitures sur le circuit nécessitent une source dont les droits de redistribution et le coût ont été validés. Ne jamais inclure de clé privée de fournisseur dans l’application mobile. Les comptes et la synchronisation viendront ensuite.

Nom, identifiants d’application et marques restent provisoires avant publication. Aucun logo ou visuel officiel n’est fourni.
