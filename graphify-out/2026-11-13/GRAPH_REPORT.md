# Graph Report - Claude  (2026-11-13)

## Corpus Check
- 112 files · ~76,572 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .geojson 1)

## Summary
- 837 nodes · 2296 edges · 40 communities (33 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a0d5be73`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- mercato.mjs
- useTheme
- game.test.mjs
- server.mjs
- package.json
- translate.test.mjs
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
- react
- third_party/README.md
- securite.test.mjs
- Button
- accounts.mjs
- api
- notify.test.mjs
- account.mjs
- fail
- app/_layout.tsx
- results.mjs

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 95 edges
2. `useStore()` - 72 edges
3. `Button()` - 62 edges
4. `Screen()` - 52 edges
5. `fail()` - 45 edges
6. `useCall()` - 35 edges
7. `react-native` - 32 edges
8. `formatDate()` - 30 edges
9. `api()` - 28 edges
10. `react` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `useTheme()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/ui.tsx
- `Fonctionnalités` --references--> `qualiReference()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Fonctionnalités` --references--> `resultsSettled()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Fonctionnalités` --references--> `CircuitCard()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/design.tsx
- `Fonctionnalités` --references--> `nextAction()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/model.mjs

## Import Cycles
- None detected.

## Communities (40 total, 7 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.09
Nodes (28): Duel(), DuelResult, Pair, Row, Season, Bet, BetView, Boards (+20 more)

### Community 1 - "mercato.mjs"
Cohesion: 0.11
Nodes (31): addDriver(), addRumor(), cancelOfficial(), CATEGORIES, clean(), driverIdOf(), foresaw(), gameOf() (+23 more)

### Community 2 - "useTheme"
Cohesion: 0.28
Nodes (18): Account(), Article(), BetWizard(), GrandPrix(), Notifications(), Reveal(), Favorites(), Live() (+10 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.08
Nodes (42): betView(), roundResults(), AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history() (+34 more)

### Community 4 - "server.mjs"
Cohesion: 0.08
Nodes (21): ADMINS, admobCache, BACKUPS, DATA, DIST, failures, firstNews, GAME (+13 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (49): dependencies, @anthropic-ai/sdk@^0.133.0, expo@~57.0.28, expo-constants@~57.0.21, expo-linear-gradient@~57.0.0, expo-linking@~57.0.12, expo-notifications@~57.0.22, expo-router@~57.0.26 (+41 more)

### Community 6 - "translate.test.mjs"
Cohesion: 0.15
Nodes (6): geo, IDS, out, root, createTranslator(), SCHEMA

### Community 7 - "jolpica.mjs"
Cohesion: 0.10
Nodes (33): additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory(), loadDriverSeason() (+25 more)

### Community 8 - "simulator.tsx"
Cohesion: 0.23
Nodes (17): Driver, Picks, Race, Simulator(), contenders(), defaultPicks(), maxLeft(), pointsFor() (+9 more)

### Community 9 - "Installer RaceIQ sur Proxmox"
Cohesion: 0.12
Nodes (14): 1. Créer le conteneur (interface Proxmox), 2. Installer l'app (dans la console du conteneur), 3. Traduction des actualités anglaises (facultatif), 4. Sur le téléphone, Données F1 : Hyprace, Installer RaceIQ sur Proxmox, Pubs pour regagner le joker (après la sortie sur les stores), Surveillance (+6 more)

### Community 10 - "expo"
Cohesion: 0.14
Nodes (13): package, expo, android, ios, name, orientation, plugins, scheme (+5 more)

### Community 11 - "admin.test.mjs"
Cohesion: 0.20
Nodes (14): betsOf(), cell(), date(), exportCsv(), resolveErrors(), setBetFor(), stats(), toCsv() (+6 more)

### Community 12 - "index.tsx"
Cohesion: 0.12
Nodes (28): Checker(), Hero(), heroText, Kerb(), SpeedLines(), TeamBadge(), Thumb(), Track (+20 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "community.mjs"
Cohesion: 0.18
Nodes (20): block(), clean(), createTopic(), deletePost(), feedbackSummary(), forum(), GAP, hidden() (+12 more)

### Community 20 - "Button"
Cohesion: 0.11
Nodes (24): Admin(), BetRow, BetsAdmin(), EXPORTS, Part, PART_LABEL, PenaltiesAdmin(), Player (+16 more)

### Community 21 - "ads.test.mjs"
Cohesion: 0.19
Nodes (11): Regagner le joker ×2 avec des pubs, ADMOB_KEYS_URL, ADS_ENABLED, adsWatched(), jokerSource(), ADS_PER_JOKER, parseKeys(), recordReward() (+3 more)

### Community 22 - "store.tsx"
Cohesion: 0.05
Nodes (70): Action, BetsView, Home(), TodoCard(), Fonctionnalités, refreshNews(), articles, demoSeason (+62 more)

### Community 23 - "environment"
Cohesion: 0.08
Nodes (24): ADMINS, ADS_ENABLED, ANTHROPIC_API_KEY, HYPRACE_API_KEY, MERCATO_YEAR, PRACTICE_API_KEY, PRACTICE_PROVIDER, TRUST_PROXY (+16 more)

### Community 24 - "hyprace.mjs"
Cohesion: 0.09
Nodes (40): fromHyprace(), refreshSeason(), saveHyprace(), circuitIdOf(), CIRCUITS, createHypraceClient(), get(), createRoundLoader() (+32 more)

### Community 25 - "add-bet.mjs"
Cohesion: 0.16
Nodes (15): event, file, ids, list, [pseudo, gp, part, names], state, stop(), user (+7 more)

### Community 26 - "ui.tsx"
Cohesion: 0.18
Nodes (17): Feature, Feedback(), Summary, Login(), pages, TabsLayout(), Settings(), api() (+9 more)

### Community 27 - "mercato.tsx"
Cohesion: 0.16
Nodes (19): Act, Admin(), Category, Driver, Game, Grid, GROUPS, last() (+11 more)

### Community 28 - "react"
Cohesion: 0.24
Nodes (12): Driver(), Season, Season, Team(), DuelResult, Row, Season, TeamsDuel() (+4 more)

### Community 31 - "securite.test.mjs"
Cohesion: 0.39
Nodes (4): adminPseudoTaken(), clientIp(), failureCounter(), parseTrusted()

### Community 32 - "Button"
Cohesion: 0.13
Nodes (24): ForumTopic(), Post, Topic, Friends, FriendsList(), FriendsScreen(), Person, Category (+16 more)

### Community 33 - "accounts.mjs"
Cohesion: 0.15
Nodes (21): file, password, state, addFriend(), authenticate(), bearer(), BLOCK, credentials() (+13 more)

### Community 34 - "api"
Cohesion: 0.18
Nodes (20): admobKeys(), allowRegister, allowReport, allRounds(), api(), bySession(), champions(), findEvent() (+12 more)

### Community 35 - "notify.test.mjs"
Cohesion: 0.22
Nodes (13): PARTS, inbox(), markRead(), notify(), notifyFriend(), notifyLeague(), notifyMercato(), notifyReply() (+5 more)

### Community 36 - "account.mjs"
Cohesion: 0.23
Nodes (11): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), checkPassword() (+3 more)

### Community 37 - "fail"
Cohesion: 0.23
Nodes (13): fail(), GameError, CHAT, createLeague(), deleteMessage(), joinLeague(), leaguesOf, leaveLeague() (+5 more)

### Community 38 - "app/_layout.tsx"
Cohesion: 0.43
Nodes (6): ErrorBoundary(), Gate(), RootLayout(), API_URL, installCrashReporting(), reportCrash()

### Community 39 - "results.mjs"
Cohesion: 0.39
Nodes (5): checkOverride(), OVERRIDE_SIZE, reorder(), sessionType(), withOverrides()

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 295 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `useTheme`, `Button`, `app/_layout.tsx`, `simulator.tsx`, `Installer RaceIQ sur Proxmox`, `index.tsx`, `Button`, `store.tsx`, `ui.tsx`, `mercato.tsx`, `react`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.09425287356321839 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `accounts.mjs`, `mercato.mjs`, `game.test.mjs`, `account.mjs`, `admin.test.mjs`, `community.mjs`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `mercato.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.1140819964349376 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `game.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07910014513788098 - nodes in this community are weakly interconnected._