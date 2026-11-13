# RaceIQ sur l'App Store : guide de mise en ligne (iOS)

Objectif 1 : **TestFlight** (vos iPhone, sans attendre la revue d'Apple).
Objectif 2 : **publication** sur l'App Store après la revue.

Fichiers prêts dans ce dossier :
- `icon-1024.png` : icône **provisoire** (à remplacer par le vrai logo, voir plus bas) ;
- `screenshots/` : 7 captures au format iPhone 6,9" (1290 × 2796), à déposer telles quelles.

---

## 1. Côté serveur (une fois)

Ajouter dans `/opt/keep-pushing/keep-pushing/.env` puis `docker compose up -d` :
```
PUBLISHER_NAME=Prénom Nom (ou nom de la société)
CONTACT_EMAIL=une.adresse@contact.fr
```
Elles s'affichent sur les pages exigées par Apple, à vérifier ensuite dans un navigateur :
- https://f1.thel4w.ovh/confidentialite
- https://f1.thel4w.ovh/conditions
- https://f1.thel4w.ovh/assistance

Créer aussi un **compte de démonstration** pour l'équipe de revue d'Apple
(dans l'appli : Créer un compte), par exemple pseudo `AppleReview`, avec
un mot de passe dédié. Le rejoindre à une ligue et lui faire quelques pronos
pour que l'appli ne soit pas vide.

## 2. Côté Apple (une fois)

1. **Identifiant** : developer.apple.com → Certificats, identifiants et profils →
   Identifiers → + → App IDs → App → Explicit : `com.raceiq.mobile`,
   cocher **Push Notifications** → Register.
2. **Appli** : App Store Connect → Apps → + → Nouvelle app :
   iOS · Nom `RaceIQ` · Français · `com.raceiq.mobile` · UGS `raceiq-ios` ·
   Accès complet.

## 3. Construire et envoyer sur TestFlight (sur ton PC, Windows convient)

Prérequis : Node.js 20 ou plus, Git, un compte gratuit sur expo.dev.
```bash
git clone -b keep-pushing https://github.com/The-Law59/Claude.git raceiq
cd raceiq/keep-pushing
npm ci
npm install -g eas-cli
eas login                      # compte expo.dev
eas init                       # crée le projet Expo (répondre Oui), ajoute son id dans app.json
eas build --platform ios --profile production
```
Pendant le build, EAS demande de se connecter au compte Apple : répondre
**Oui** partout, il crée lui-même le certificat de distribution et le profil
(pas besoin de Mac). Compter 15 à 30 minutes. L'adresse du serveur
(`https://f1.thel4w.ovh`) est intégrée automatiquement (fichier `eas.json`).

Puis :
```bash
eas submit --platform ios --latest
```
Le build arrive dans App Store Connect → TestFlight après 10 à 30 minutes de
traitement. Ajouter les testeurs : TestFlight → **Test interne** → + → les
membres de l'équipe (jusqu'à 100) : ils reçoivent une invitation dans l'appli
TestFlight, **sans revue Apple**. Pour des amis hors équipe : **Test externe**
(une courte revue Apple la première fois).

Committer ensuite le changement de `app.json` fait par `eas init`
(champ `extra.eas.projectId`).

## 4. Fiche App Store (à copier-coller)

**Nom** (30) : `RaceIQ`

**Sous-titre** (30) : `Pronos course auto entre amis`

**Texte promotionnel** (170, modifiable sans nouvelle version) :
> Las Vegas, Qatar, Abu Dhabi : faites vos pronos avant chaque séance, défiez vos amis dans votre ligue et suivez le Mercato de la saison prochaine.

**Description** :
> RaceIQ, c'est le week-end de course vécu entre amis.
>
> PRONOSTICS
> • Devinez le top 10 des qualifications et de la course, le sprint, le meilleur tour, les abandons et la question du week-end.
> • Assistant pas à pas : vos pronos en une minute.
> • Points détaillés étape par étape, joker ×2 une fois par saison.
> • Pénalités de grille prises en compte automatiquement.
>
> ENTRE AMIS
> • Ligues privées avec code d'invitation, classement et discussion.
> • Classement général et entre amis, récap à partager après chaque Grand Prix.
>
> MERCATO
> • Devinez la grille de la saison prochaine, pilotes F2 et de réserve compris.
> • Votez sur les rumeurs : crédible ou bidon ?
>
> TOUTE LA SAISON
> • Calendrier, résultats de toutes les séances (essais libres compris), classements.
> • Fiche de chaque circuit, météo du week-end, simulateur de championnat.
> • Actualités en français, avec anti-spoil pour regarder les courses en différé.
> • Forum pour débattre de la réglementation et des week-ends de course.
>
> Thème aux couleurs de votre écurie préférée, mode clair ou sombre.
>
> Gratuit, sans publicité, sans argent réel : les points ne servent qu'au classement.
> RaceIQ est une application indépendante, sans lien avec la Formule 1, la FIA ou les écuries.

**Mots-clés** (100, séparés par des virgules, sans espace) :
`pronostic,grand prix,formule,course,pilote,ecurie,classement,ligue,qualifications,circuit,mercato`

**URL d'assistance** : `https://f1.thel4w.ovh/assistance`
**URL de confidentialité** : `https://f1.thel4w.ovh/confidentialite`
**Catégorie** : Sports (secondaire : Divertissement)
**Copyright** : `2026 <nom de l'éditeur>`
**Prix** : Gratuit · **Disponibilité** : tous les pays, ou France/Belgique/Suisse/Canada pour commencer

## 5. Questionnaires App Store Connect

**Classification par âge** (Informations sur l'app → Classification) :
- Violence, contenu sexuel, horreur, drogues, alcool : **Aucun**
- Jeux d'argent simulés / casino : **Non** (pas de mise, pas de gain, pas d'argent)
- Contenu généré par les utilisateurs : **Oui** · Messagerie / discussion : **Oui**
- Accès web non filtré : **Non** (liens vers les articles seulement)
Résultat attendu : 13+ (ou 12+ selon la version du questionnaire).

**Confidentialité de l'app** (Confidentialité de l'app → Commencer) :
- « Collectez-vous des données ? » **Oui**. Cocher :
  - Contenu utilisateur → **Autre contenu utilisateur** (messages du forum et des ligues) et **Contenu de jeu** (pronostics) : liés à l'utilisateur · Fonctionnalités de l'app · pas de suivi.
  - Identifiants → **Identifiant utilisateur** (pseudo, identifiant de compte) : lié à l'utilisateur · Fonctionnalités de l'app · pas de suivi.
  - Diagnostics → **Données de plantage** : **non lié** à l'utilisateur · Fonctionnalités de l'app · pas de suivi.
- Pas de « suivi » (tracking) : aucune publicité, aucun traceur → pas de demande ATT.

**Chiffrement** : déjà déclaré dans l'appli (aucun chiffrement propre),
la question n'apparaîtra pas à chaque build.

**Droits sur le contenu** : « Votre app affiche-t-elle du contenu de tiers ? » **Oui** :
données sportives sous licence (Hyprace), titres d'articles avec lien vers la
source d'origine, tracés de circuits sous licence MIT.

**Statut de commerçant (UE)** : App Store Connect → Business : se déclarer
commerçant si l'appli devient commerciale (adresse et téléphone publics sur la
fiche dans l'UE). Pour une appli gratuite sans revenu, on peut se déclarer
non-commerçant au départ.

## 6. Notes pour l'équipe de revue d'Apple

Champ « Informations de connexion » : le compte de démonstration
(`AppleReview` / son mot de passe). Champ « Remarques » :
> RaceIQ is a free motorsport companion app with a prediction game between friends. There is no real money, no wagering and no prizes: points are only used for leaderboards.
> User-generated content (forum, league chat): users must accept the Terms (zero tolerance for objectionable content) when signing up; a word filter blocks abusive messages before posting; every message can be reported and any user can be blocked; admins review reports within 24 hours and can delete content and accounts. Account deletion is available in Menu → My account.
> RaceIQ is independent and not affiliated with Formula 1, the FIA or any team; no official logos or photos are used. Sports data is licensed from Hyprace.

## 7. Avant la publication publique

- [ ] Remplacer l'icône provisoire : vrai logo carré 1024 × 1024, PNG, **sans transparence**,
      dans `assets/icon.png` (et `assets/splash-icon.png` pour l'écran de démarrage, fond transparent).
- [ ] Captures : refaire si l'icône ou le design changent (`store/screenshots`).
- [ ] Vérifier les 3 pages légales avec le vrai nom et la vraie adresse.
- [ ] Tester l'appli TestFlight sur un week-end de course complet.

Points de vigilance de la revue :
- **Marques** : ne pas utiliser « F1 », « Formula 1 », les logos ou les photos officielles dans
  le nom, le sous-titre, l'icône ou les captures (déjà respecté). Les mentions descriptives
  dans l'appli restent prudentes et la fiche précise l'indépendance.
- **Contenu des joueurs** : modérer les signalements rapidement (Tableau de bord → Forum).
