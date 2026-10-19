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
- Duel de pilotes (accueil → « Duel face à… », ou Saison → « Comparer deux pilotes ») : par défaut mon pilote face à son coéquipier, mais les deux pilotes se changent librement, même d’écuries différentes ; devant en course et en qualifications, points au championnat, meilleur résultat, puis GP par GP ; masqué si une session est protégée.
- Comptes et amis (`src/accounts.mjs`) : portail de connexion au premier lancement (pseudo + mot de passe, sans e-mail ; « Continuer sans compte » possible), mots de passe dérivés avec scrypt, connexion bloquée 15 min après 8 échecs ; amis ajoutés par pseudo, l’amitié est confirmée quand l’autre accepte.
- Paris (onglet Pronos, `src/bets.mjs`) : tableau top 10 des qualifications, top 8 du sprint, top 10 de la course, meilleur tour et nombre d’abandons ; qualifs, sprint et joker ouvrent le lundi qui suit le GP précédent, course, meilleur tour, abandons et question 1 h après le début des qualifs ; chaque partie ferme au départ de sa session. Barème par case : place exacte 10, à une place près 5, dans le top mais mal placé 2, sans-faute +20 ; meilleur tour 5 ; abandons exact 10, à 1 près 4. Classement général (tous les joueurs) et entre amis ; paris des amis visibles une fois la session fermée. Données dans `data/game.json` sur le serveur. (Pas de pari sur la qualif sprint : Jolpica ne publie pas ses résultats.) Pré-remplissage en un geste (« Tout pré-remplir », ou par tableau : grille des qualifs, mon top des qualifs pour la course, mon prono du GP précédent, classement du championnat) ; toucher deux cases d’une grille échange les pilotes.
- En plus des paris : question oui/non du week-end (5 pts, vérifiée avec les résultats Jolpica : poleman vainqueur, remontée, écart, écurie sur le podium) et joker (points ×2, un par saison, posé avant la première session pariée). Ligues privées à code d’invitation avec leur propre classement. « Mes manches » : points par GP, meilleur score de la manche et place au général après chaque manche.
- Rappel local 1 h avant la fermeture des paris (qualifs, sprint, course), réglable dans Réglages (téléphone uniquement).
- Réglages synchronisés avec le compte (`/api/settings`) : favoris, mon pilote/écurie, anti-spoil, filtres d’actus et thème suivent le joueur sur tous ses téléphones ; les rappels restent propres à chaque appareil.
- Pages pilote et écurie (depuis Saison → classements) : place, points, victoires, podiums, forme sur 5 GP, saison GP par GP, actus liées.
- Simulateur de championnat (Saison → Pilotes) : courses et sprints restants, pilotes encore en lice, places à choisir, classement final recalculé.
- Page GP : météo par session (Open-Meteo, jusqu’à 16 jours avant), heure locale du circuit, derniers vainqueurs du circuit.
- Mode sombre (Réglages → Affichage : comme le téléphone, clair ou sombre) ; couleurs d’écurie éclaircies automatiquement pour rester lisibles (contraste ≥ 4,5:1 testé).
- Accueil : carte « Mes pronos » (ce qu’il manque pour le prochain GP et la prochaine fermeture).
- Ligues : discussion par ligue (280 caractères, réactions rapides, un message toutes les 3 s, 200 derniers gardés ; l’auteur ou le créateur efface ; masquée si une session est protégée).
- Onglet Pronos → Palmarès : pronos des champions pilote (50 pts) et constructeur (30 pts), ouverts jusqu’au 6e GP avant la fin ; podium animé de la saison (provisoire puis final), leader de chaque ligue, saisons passées. Les points des week-ends terminés sont figés dans `data/game.json` (`final`).
- Duel d’écuries (Saison → Écuries, ou page d’une écurie) : GP gagnés aux points, points, podiums, meilleure place, GP par GP.
- Sauvegarde automatique : copie quotidienne de `data/game.json` dans `data/backups/` (14 jours gardés).
- Forum (onglet Forum, `src/community.mjs`) : sujets par catégorie (réglementation, week-ends de course, pronos et ligues, divers), réponses, rythme limité ; signaler un message, masquer un joueur, l’auteur efface ses messages ; les admins voient les signalements et suppriment. Un sujet de week-end est rattaché à son GP et masqué à ceux qui le protègent par l’anti-spoil. Dans la liste, chaque sujet montre son premier message ; les réponses se déplient en cascade et on peut répondre sans ouvrir la fiche.
- Avis (Réglages → « Donner mon avis », et rappel sur l’accueil après 3 jours puis au plus une fois par mois) : note sur 5, fonctionnalités préférées, points à améliorer, idées ; un avis par jour et par joueur. Les admins voient la synthèse (moyenne, ce qui plaît le plus, derniers avis) sur le même écran.
- Admins : pseudos listés dans la variable `ADMINS` du serveur.
- Notifications (`src/notify.mjs`) : réponses aux sujets du forum où l’on a écrit et messages de ses ligues, regroupés par sujet/ligue ; cloche dans l’en-tête, pastilles sur les onglets Forum et Pronos, écran de liste ; lues automatiquement à l’ouverture du sujet ou de la ligue ; texte neutre pour un sujet de GP protégé par l’anti-spoil. Sur téléphone, alerte locale si les notifications sont autorisées (relevé chaque minute, appli ouverte).
- Récap de GP (`src/recap.mjs`, `/api/recap/:id`) : sur l’accueil jusqu’au week-end suivant, et sur chaque GP passé dans Pronos : points (joker inclus), places exactes, meilleurs coups, place au général avant/après, amis battus ; bouton « Partager » (WhatsApp, SMS…, ou copie du texte dans un navigateur).
- Mon compte (Réglages → Mon compte, `src/account.mjs`) : changer de pseudo, de mot de passe (les autres appareils sont déconnectés), télécharger ses données (JSON), supprimer son compte (paris, amitiés, messages et sujets effacés ; ligues créées transmises au membre suivant ; avis gardés anonymes). Chaque action redemande le mot de passe.
- Tableau de bord admin (Réglages → Tableau de bord, `src/admin.mjs`) : état du serveur, joueurs inscrits/actifs, inscriptions par semaine, joueurs ayant parié par GP, activité du forum et des ligues, note moyenne, erreurs ; exports CSV (joueurs, paris, avis, erreurs).
- Suivi (`src/monitor.mjs`, `src/crash.ts`) : `/api/health` (healthcheck Docker), plantages de l’appli (écran « Oups, sortie de piste » + rapport) et erreurs serveur regroupés dans le tableau de bord, notification aux admins à chaque nouvelle erreur ; Uptime Kuma optionnel pour être alerté si le serveur tombe (voir `deploy/README.md`).
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
