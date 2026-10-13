# Validation — V0.2 du 13 octobre 2026

- 15 tests réussis (`npm test`) : règles anti-spoil, ids de session par week-end, choix du week-end en cours, lecture du format Jolpica, lecture RSS, lien des actualités aux favoris et aux sessions, erreurs réseau.
- Vérification TypeScript : réussie.
- Export web : réussi. Parcours vérifié dans Chromium au format iPhone : navigation entre onglets, article puis retour, protection du week-end, déblocage de la seule course, préférences conservées après rechargement.
- API Jolpica : données réelles chargées et affichées dans Chromium (23 Grands Prix 2026, dernière course, qualifications, classements pilotes et écuries). Mode démonstration vérifié aussi, sans réseau.

- Flux Motorsport.com : non joignable depuis l’environnement de test, pas encore vu à l’écran.

Pas encore vérifié : compilation IPA/APK, essai sur téléphone, rappels et autorisations.
