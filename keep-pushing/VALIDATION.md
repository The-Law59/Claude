# Validation — V0.2 du 13 octobre 2026

- 16 tests réussis (`npm test`) : règles anti-spoil, ids de session par week-end, choix du week-end en cours, lecture du format Jolpica, lecture RSS, lien des actualités aux favoris et aux sessions, erreurs réseau.
- Vérification TypeScript : réussie.
- Export web : réussi. Parcours vérifié dans Chromium au format iPhone : navigation entre onglets, article puis retour, protection du week-end, déblocage de la seule course, préférences conservées après rechargement.
- API Jolpica : données réelles chargées et affichées dans Chromium (23 Grands Prix 2026, dernière course, qualifications, classements pilotes et écuries). Mode démonstration vérifié aussi, sans réseau.

- Flux Motorsport.com : 40 articles réels affichés ; 16 dans « Pour vous » avec les favoris par défaut ; week-end de Singapour protégé, seuls les 5 articles antérieurs restent visibles. Aperçu web lancé sans contrôle CORS (le flux n’envoie pas d’en-tête CORS ; l’app mobile n’est pas concernée).

Pas encore vérifié : compilation IPA/APK, essai sur téléphone, rappels et autorisations.

- Saison 2026 réelle : 24 GP au calendrier, vainqueurs des 17 courues, résultats de Singapour (course, sprint, qualifications) chargés à l’ouverture du GP. Mon pilote (Leclerc) et mon écurie (Ferrari) affichés sur l’accueil et surlignés dans les classements.
