# Validation — V1 du 13 octobre 2026

- 7 tests métier réussis : filtrage, rumeurs, importance, protection des sessions, rappels neutres et reprise des préférences.
- Vérification TypeScript : réussie.
- Versions des dépendances : compatibles avec les recommandations locales du SDK Expo 57 (contrôle hors ligne).
- Export JavaScript/Hermes iOS et Android : réussi.
- Export web : réussi.
- Interface web exécutée dans un DOM de test : navigation, protection de toutes les sessions, déblocage de la seule course, article de qualifications masqué et écriture des préférences vérifiés.

Ces contrôles ne constituent pas une compilation IPA/APK, ni un essai sur appareil iPhone/Android. Les rappels, leurs autorisations et le rendu visuel final restent à vérifier sur téléphone. Le navigateur de rendu n’a pas pu être téléchargé dans cet environnement ; aucun test visuel automatisé n’est revendiqué.
