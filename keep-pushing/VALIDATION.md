# Validation — V0.2 du 13 octobre 2026

- 12 tests réussis (`npm test`) : règles anti-spoil, ids de session par week-end, choix du week-end en cours, lecture du format Jolpica, erreurs réseau.
- Vérification TypeScript : réussie.
- Export web : réussi. Parcours vérifié dans Chromium au format iPhone : navigation entre onglets, article puis retour, protection du week-end, déblocage de la seule course, préférences conservées après rechargement.
- API Jolpica : non joignable depuis l’environnement de test ; seul le mode démonstration a été vu à l’écran. Le format est couvert par les tests.

Pas encore vérifié : compilation IPA/APK, essai sur téléphone, rappels et autorisations.
