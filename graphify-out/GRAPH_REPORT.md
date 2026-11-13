# Graph Report - Claude  (2026-11-13)

## Corpus Check
- 118 files · ~79,811 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .geojson 1)

## Summary
- 874 nodes · 2473 edges · 57 communities (39 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48f1ec91`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- mercato.mjs
- formatDate
- bets.mjs
- server.mjs
- package.json
- dependencies
- jolpica.mjs
- simulator.tsx
- Installer RaceIQ sur Proxmox
- expo
- admin.test.mjs
- index.tsx
- tsconfig.json
- CLAUDE.md
- .claude/CLAUDE.md
- session-start.sh
- install-lxc.sh
- VALIDATION.md
- community.mjs
- Button
- ads.test.mjs
- store.tsx
- environment
- hyprace.mjs
- add-bet.mjs
- ui.tsx
- mercato.tsx
- ui.tsx
- third_party/README.md
- securite.test.mjs
- Button
- accounts.mjs
- allRounds
- notify.test.mjs
- account.mjs
- game.test.mjs
- moderation.mjs
- results.mjs
- RaceIQ sur l'App Store : guide de mise en ligne (iOS)
- scripts
- duel.tsx
- penalties.mjs
- Regagner le joker ×2 avec des pubs
- legal.mjs
- @anthropic-ai/sdk
- expo@~57.0.28
- expo-constants@~57.0.21
- expo-linear-gradient
- expo-linking@~57.0.12
- expo-notifications
- expo-splash-screen@~57.0.10
- expo-status-bar
- react-dom@19.2.3
- @react-native-async-storage/async-storage
- react-native-svg

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 95 edges
2. `api()` - 82 edges
3. `useStore()` - 72 edges
4. `Button()` - 62 edges
5. `Screen()` - 52 edges
6. `fail()` - 47 edges
7. `useCall()` - 35 edges
8. `react-native` - 32 edges
9. `formatDate()` - 30 edges
10. `react` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `useTheme()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/ui.tsx
- `Regagner le joker ×2 avec des pubs` --references--> `jokerSource()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.mjs
- `Fonctionnalités` --references--> `qualiReference()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Fonctionnalités` --references--> `resultsSettled()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `watchRewardedAd()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.ts

## Import Cycles
- None detected.

## Communities (57 total, 18 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.13
Nodes (28): Bet, BetView, Boards, Champions, Chat, closing(), LABELS, League (+20 more)

### Community 1 - "mercato.mjs"
Cohesion: 0.14
Nodes (31): mercatoApi(), addDriver(), addRumor(), cancelOfficial(), CATEGORIES, clean(), driverIdOf(), foresaw() (+23 more)

### Community 2 - "formatDate"
Cohesion: 0.53
Nodes (4): Notifications(), Season(), noticeText(), formatDate()

### Community 3 - "bets.mjs"
Cohesion: 0.17
Nodes (23): betView(), jokerEvent(), prevRace(), roundResults(), AFTER_QUALI, answerOf(), closesAt(), dnfCount() (+15 more)

### Community 4 - "server.mjs"
Cohesion: 0.07
Nodes (25): ADMINS, admobCache, allowRegister, allowReport, BACKUPS, DATA, DIST, failures (+17 more)

### Community 5 - "package.json"
Cohesion: 0.21
Nodes (11): devDependencies, prettier@^3.9.10, @types/react@~19.2.0, typescript@~5.9.2, main, name, private, version (+3 more)

### Community 6 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, expo-router@~57.0.26, expo-system-ui@~57.0.4, react@19.2.3, react-native@^0.86.3, react-native-safe-area-context@~5.7.0, react-native-screens@~4.26.0, react-native-web@^0.21.2 (+4 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.10
Nodes (33): additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory(), loadDriverSeason() (+25 more)

### Community 8 - "simulator.tsx"
Cohesion: 0.23
Nodes (17): Driver, Picks, Race, Simulator(), contenders(), defaultPicks(), maxLeft(), pointsFor() (+9 more)

### Community 9 - "Installer RaceIQ sur Proxmox"
Cohesion: 0.12
Nodes (15): 1. Créer le conteneur (interface Proxmox), 2. Installer l'app (dans la console du conteneur), 3. Traduction des actualités anglaises (facultatif), 4. Sur le téléphone, Données F1 : Hyprace, Installer RaceIQ sur Proxmox, Pubs pour regagner le joker (après la sortie sur les stores), Surveillance (+7 more)

### Community 10 - "expo"
Cohesion: 0.10
Nodes (20): backgroundColor, foregroundImage, adaptiveIcon, package, expo, android, backgroundColor, icon (+12 more)

### Community 11 - "admin.test.mjs"
Cohesion: 0.18
Nodes (20): api(), reportError(), save(), betsOf(), cell(), date(), exportCsv(), players() (+12 more)

### Community 12 - "index.tsx"
Cohesion: 0.09
Nodes (39): Action, BetsView, Home(), TodoCard(), Fonctionnalités, Checker(), CircuitCard(), Countdown() (+31 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "community.mjs"
Cohesion: 0.19
Nodes (19): block(), clean(), createTopic(), deletePost(), feedbackSummary(), forum(), GAP, hidden() (+11 more)

### Community 20 - "Button"
Cohesion: 0.12
Nodes (28): Admin(), BetRow, BetsAdmin(), EXPORTS, Part, PART_LABEL, PenaltiesAdmin(), Player (+20 more)

### Community 21 - "ads.test.mjs"
Cohesion: 0.33
Nodes (8): admobKeys(), ADMOB_KEYS_URL, adsWatched(), jokerSource(), ADS_PER_JOKER, parseKeys(), recordReward(), verifySsv()

### Community 22 - "store.tsx"
Cohesion: 0.06
Nodes (56): ErrorBoundary(), Gate(), RootLayout(), refreshNews(), API_URL, installCrashReporting(), reportCrash(), articles (+48 more)

### Community 23 - "environment"
Cohesion: 0.07
Nodes (26): ADMINS, ADS_ENABLED, ANTHROPIC_API_KEY, CONTACT_EMAIL, HYPRACE_API_KEY, MERCATO_YEAR, PRACTICE_API_KEY, PRACTICE_PROVIDER (+18 more)

### Community 24 - "hyprace.mjs"
Cohesion: 0.09
Nodes (39): fromHyprace(), refreshSeason(), saveHyprace(), circuitIdOf(), CIRCUITS, createHypraceClient(), get(), createRoundLoader() (+31 more)

### Community 25 - "add-bet.mjs"
Cohesion: 0.07
Nodes (24): event, file, ids, list, [pseudo, gp, part, names], state, stop(), user (+16 more)

### Community 26 - "ui.tsx"
Cohesion: 0.20
Nodes (23): Account(), Feature, Feedback(), Summary, GrandPrix(), Login(), Favorites(), pages (+15 more)

### Community 27 - "mercato.tsx"
Cohesion: 0.16
Nodes (19): Act, Admin(), Category, Driver, Game, Grid, GROUPS, last() (+11 more)

### Community 28 - "ui.tsx"
Cohesion: 0.12
Nodes (27): Article(), Driver(), Season, Reveal(), Season, Team(), DuelResult, Row (+19 more)

### Community 31 - "securite.test.mjs"
Cohesion: 0.39
Nodes (5): adminPseudoTaken(), clientIp(), failureCounter(), logSecurity(), parseTrusted()

### Community 32 - "Button"
Cohesion: 0.13
Nodes (17): Post, Topic, Friends, Person, Category, CATEGORY_HINTS, CATEGORY_ICONS, Forum() (+9 more)

### Community 33 - "accounts.mjs"
Cohesion: 0.17
Nodes (21): addFriend(), authenticate(), bearer(), BLOCK, credentials(), derive, friendIds(), friendsView() (+13 more)

### Community 34 - "allRounds"
Cohesion: 0.22
Nodes (13): allRounds(), champions(), findEvent(), palmares(), rankings(), recap(), seasonDone(), seasonId() (+5 more)

### Community 35 - "notify.test.mjs"
Cohesion: 0.21
Nodes (13): PARTS, POINTS, inbox(), markRead(), notify(), notifyFriend(), notifyLeague(), notifyMercato() (+5 more)

### Community 36 - "account.mjs"
Cohesion: 0.27
Nodes (10): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), checkPassword() (+2 more)

### Community 37 - "game.test.mjs"
Cohesion: 0.10
Nodes (27): backup(), mergeBet(), fail(), GameError, CHAT, createLeague(), deleteMessage(), joinLeague() (+19 more)

### Community 38 - "moderation.mjs"
Cohesion: 0.39
Nodes (7): assertClean(), BANNED, isClean(), joinSpelled(), LEET, normalize(), PATTERNS

### Community 39 - "results.mjs"
Cohesion: 0.29
Nodes (6): bySession(), checkOverride(), OVERRIDE_SIZE, reorder(), sessionType(), withOverrides()

### Community 40 - "RaceIQ sur l'App Store : guide de mise en ligne (iOS)"
Cohesion: 0.22
Nodes (8): 1. Côté serveur (une fois), 2. Côté Apple (une fois), 3. Construire et envoyer sur TestFlight (sur ton PC, Windows convient), 4. Fiche App Store (à copier-coller), 5. Questionnaires App Store Connect, 6. Notes pour l'équipe de revue d'Apple, 7. Avant la publication publique, RaceIQ sur l'App Store : guide de mise en ligne (iOS)

### Community 41 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, check, ios, serve, start, test, web

### Community 42 - "duel.tsx"
Cohesion: 0.33
Nodes (6): Duel(), DuelResult, Pair, Row, Season, duel()

### Community 43 - "penalties.mjs"
Cohesion: 0.38
Nodes (5): applyPenalties(), PENALTY_KINDS, PENALTY_REASONS, penaltyLabel(), order

### Community 44 - "Regagner le joker ×2 avec des pubs"
Cohesion: 0.33
Nodes (4): Regagner le joker ×2 avec des pubs, ADS_ENABLED, ADS_PER_JOKER, watchRewardedAd()

### Community 45 - "legal.mjs"
Cohesion: 0.80
Nodes (3): esc(), legalPage(), page()

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `admin.test.mjs` to `mercato.mjs`, `allRounds`, `bets.mjs`, `server.mjs`, `account.mjs`, `accounts.mjs`, `game.test.mjs`, `notify.test.mjs`, `results.mjs`, `community.mjs`, `Button`, `ads.test.mjs`, `hyprace.mjs`, `add-bet.mjs`, `securite.test.mjs`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.12643678160919541 - nodes in this community are weakly interconnected._
- **Why does `useTheme()` connect `useTheme` to `Button`, `formatDate`, `simulator.tsx`, `Installer RaceIQ sur Proxmox`, `duel.tsx`, `index.tsx`, `Button`, `store.tsx`, `ui.tsx`, `mercato.tsx`, `ui.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `mercato.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.14260249554367202 - nodes in this community are weakly interconnected._
- **Why does `racingDrivers()` connect `Button` to `useTheme`, `mercato.mjs`, `server.mjs`, `jolpica.mjs`, `admin.test.mjs`, `ui.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `server.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._