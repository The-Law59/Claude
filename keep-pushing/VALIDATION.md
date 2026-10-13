# Validation — V0.2 du 13 octobre 2026

- 27 tests réussis (`npm test`) : règles anti-spoil, ids de session par week-end, choix du week-end en cours, lecture du format Jolpica, lecture RSS, lien des actualités aux favoris et aux sessions, erreurs réseau.
- Vérification TypeScript : réussie.
- Export web : réussi. Parcours vérifié dans Chromium au format iPhone : navigation entre onglets, article puis retour, protection du week-end, déblocage de la seule course, préférences conservées après rechargement.
- API Jolpica : données réelles chargées et affichées dans Chromium (23 Grands Prix 2026, dernière course, qualifications, classements pilotes et écuries). Mode démonstration vérifié aussi, sans réseau.

- Flux Motorsport.com : 40 articles réels affichés ; 16 dans « Pour vous » avec les favoris par défaut ; week-end de Singapour protégé, seuls les 5 articles antérieurs restent visibles. Aperçu web lancé sans contrôle CORS (le flux n’envoie pas d’en-tête CORS ; l’app mobile n’est pas concernée).

Pas encore vérifié : compilation IPA/APK, essai sur téléphone, rappels et autorisations.

- Saison 2026 réelle : 24 GP au calendrier, vainqueurs des 17 courues, résultats de Singapour (course, sprint, qualifications) chargés à l’ouverture du GP. Mon pilote (Leclerc) et mon écurie (Ferrari) affichés sur l’accueil et surlignés dans les classements.
- Veille actualités (13 oct. 2026) : les 7 flux répondent ; 161 articles lus, 80 après fusion des doublons (11 officiels, 41 presse, 28 non officiels). Corrigé sur données réelles : nouvelle adresse Formula1.com, flux Formula1.com sans date (« date non fournie »), résumés Reddit doublement encodés. Reddit limite parfois le débit (refus temporaire) : le cache de 5 min du serveur l’atténue.
- Traduction : chaîne complète vérifiée contre une fausse API locale (36 articles anglais, 2 requêtes de 20 et 16, modèle, repli, format JSON, cache disque), y compris dans l’image Docker. Pas encore testée avec la vraie API (aucune clé dans l’environnement de test) : qualité de traduction non vérifiée.
