# Graph Report - Claude  (2026-11-12)

## Corpus Check
- 101 files · ~72,712 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .geojson 1)

## Summary
- 791 nodes · 2175 edges · 36 communities (29 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `069c6b12`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- mercato.mjs
- useStore
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
- fail
- Button
- ads.test.mjs
- store.tsx
- environment
- index.tsx
- ref_node_test
- expo-router
- mercato.tsx
- ui.tsx
- third_party/README.md
- securite.test.mjs
- formatDate
- add-bet.mjs
- Regagner le joker ×2 avec des pubs
- build-tracks.mjs

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 95 edges
2. `useStore()` - 72 edges
3. `Button()` - 62 edges
4. `Screen()` - 52 edges
5. `fail()` - 45 edges
6. `useCall()` - 35 edges
7. `react-native` - 32 edges
8. `formatDate()` - 30 edges
9. `react` - 28 edges
10. `expo-router` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `useTheme()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/ui.tsx
- `Fonctionnalités` --references--> `nextAction()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/model.mjs
- `Fonctionnalités` --references--> `CircuitCard()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/design.tsx
- `Regagner le joker ×2 avec des pubs` --references--> `jokerSource()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.mjs
- `Fonctionnalités` --references--> `qualiReference()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs

## Import Cycles
- None detected.

## Communities (36 total, 7 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.13
Nodes (26): Favorites(), Bet, BetView, Boards, Champions, Chat, closing(), LABELS (+18 more)

### Community 1 - "mercato.mjs"
Cohesion: 0.12
Nodes (30): addDriver(), addRumor(), cancelOfficial(), CATEGORIES, clean(), driverIdOf(), foresaw(), gameOf() (+22 more)

### Community 2 - "useStore"
Cohesion: 0.30
Nodes (16): GrandPrix(), Login(), Reveal(), Live(), Season(), Settings(), api(), protectIds() (+8 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.06
Nodes (53): Fonctionnalités, AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history(), isClosed() (+45 more)

### Community 4 - "server.mjs"
Cohesion: 0.07
Nodes (49): ADMINS, admobCache, admobKeys(), allowRegister, allowReport, allRounds(), api(), BACKUPS (+41 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (49): dependencies, @anthropic-ai/sdk@^0.133.0, expo@~57.0.28, expo-constants@~57.0.21, expo-linear-gradient@~57.0.0, expo-linking@~57.0.12, expo-notifications@~57.0.22, expo-router@~57.0.26 (+41 more)

### Community 6 - "translate.test.mjs"
Cohesion: 0.17
Nodes (5): file, password, state, createTranslator(), SCHEMA

### Community 7 - "jolpica.mjs"
Cohesion: 0.10
Nodes (33): refreshSeason(), additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory() (+25 more)

### Community 8 - "simulator.tsx"
Cohesion: 0.23
Nodes (17): Driver, Picks, Race, Simulator(), contenders(), defaultPicks(), maxLeft(), pointsFor() (+9 more)

### Community 9 - "Installer RaceIQ sur Proxmox"
Cohesion: 0.12
Nodes (14): 1. Créer le conteneur (interface Proxmox), 2. Installer l'app (dans la console du conteneur), 3. Traduction des actualités anglaises (facultatif), 4. Sur le téléphone, Essais libres (fournisseur à choisir), Installer RaceIQ sur Proxmox, Pubs pour regagner le joker (après la sortie sur les stores), Surveillance (+6 more)

### Community 10 - "expo"
Cohesion: 0.14
Nodes (13): package, expo, android, ios, name, orientation, plugins, scheme (+5 more)

### Community 11 - "admin.test.mjs"
Cohesion: 0.20
Nodes (14): betsOf(), cell(), date(), exportCsv(), resolveErrors(), setBetFor(), stats(), toCsv() (+6 more)

### Community 12 - "index.tsx"
Cohesion: 0.11
Nodes (29): Checker(), CircuitCard(), Hero(), heroText, Kerb(), SpeedLines(), TeamBadge(), Thumb() (+21 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "fail"
Cohesion: 0.06
Nodes (63): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), addFriend() (+55 more)

### Community 20 - "Button"
Cohesion: 0.15
Nodes (24): Account(), Admin(), BetRow, BetsAdmin(), EXPORTS, Part, PART_LABEL, PenaltiesAdmin() (+16 more)

### Community 21 - "ads.test.mjs"
Cohesion: 0.38
Nodes (7): ADMOB_KEYS_URL, adsWatched(), jokerSource(), ADS_PER_JOKER, parseKeys(), recordReward(), verifySsv()

### Community 22 - "store.tsx"
Cohesion: 0.05
Nodes (65): ErrorBoundary(), Gate(), RootLayout(), refreshNews(), API_URL, installCrashReporting(), reportCrash(), articles (+57 more)

### Community 23 - "environment"
Cohesion: 0.08
Nodes (23): ADMINS, ADS_ENABLED, ANTHROPIC_API_KEY, MERCATO_YEAR, PRACTICE_API_KEY, PRACTICE_PROVIDER, TRUST_PROXY, build (+15 more)

### Community 24 - "index.tsx"
Cohesion: 0.14
Nodes (19): Duel(), DuelResult, Pair, Row, Season, Action, BetsView, Home() (+11 more)

### Community 25 - "ref_node_test"
Cohesion: 0.31
Nodes (7): createPracticeSource(), isPractice(), matchDriver(), plain(), PRACTICE_TYPES, PROVIDERS, drivers

### Community 26 - "expo-router"
Cohesion: 0.14
Nodes (17): Feature, Feedback(), Summary, Category, CATEGORY_HINTS, CATEGORY_ICONS, Forum(), NewTopic() (+9 more)

### Community 27 - "mercato.tsx"
Cohesion: 0.16
Nodes (19): Act, Admin(), Category, Driver, Game, Grid, GROUPS, last() (+11 more)

### Community 28 - "ui.tsx"
Cohesion: 0.20
Nodes (15): Article(), Driver(), Season, Season, Team(), articleVisible(), setMine(), BADGES (+7 more)

### Community 31 - "securite.test.mjs"
Cohesion: 0.39
Nodes (4): adminPseudoTaken(), clientIp(), failureCounter(), parseTrusted()

### Community 32 - "formatDate"
Cohesion: 0.15
Nodes (13): ASK, Bet, BetWizard(), Part, PART_LABEL, Step, View_, ForumTopic() (+5 more)

### Community 33 - "add-bet.mjs"
Cohesion: 0.25
Nodes (8): event, file, ids, list, [pseudo, gp, part, names], state, stop(), user

### Community 34 - "Regagner le joker ×2 avec des pubs"
Cohesion: 0.33
Nodes (4): Regagner le joker ×2 avec des pubs, ADS_ENABLED, ADS_PER_JOKER, watchRewardedAd()

### Community 35 - "build-tracks.mjs"
Cohesion: 0.33
Nodes (4): geo, IDS, out, root

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 278 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `formatDate`, `useStore`, `simulator.tsx`, `Installer RaceIQ sur Proxmox`, `index.tsx`, `Button`, `store.tsx`, `index.tsx`, `expo-router`, `mercato.tsx`, `ui.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `game.test.mjs`, `mercato.mjs`, `admin.test.mjs`, `server.mjs`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `mercato.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `game.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.056265984654731455 - nodes in this community are weakly interconnected._