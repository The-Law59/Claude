# Graph Report - Claude  (2026-11-10)

## Corpus Check
- 98 files · ~71,439 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .geojson 1)

## Summary
- 751 nodes · 2100 edges · 27 communities (20 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `050d4dd4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useStore
- community.mjs
- store.tsx
- game.test.mjs
- server.mjs
- package.json
- ref_node_assert
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
- ui.tsx
- Screen
- mercato.tsx
- useTheme
- third_party/README.md

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 97 edges
2. `useStore()` - 72 edges
3. `Button()` - 62 edges
4. `Screen()` - 52 edges
5. `fail()` - 45 edges
6. `useCall()` - 35 edges
7. `react-native` - 32 edges
8. `formatDate()` - 30 edges
9. `react` - 27 edges
10. `expo-router` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `useTheme()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/ui.tsx
- `Fonctionnalités` --references--> `qualiReference()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Fonctionnalités` --references--> `resultsSettled()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `jokerSource()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `watchRewardedAd()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.ts

## Import Cycles
- None detected.

## Communities (27 total, 7 thin omitted)

### Community 0 - "useStore"
Cohesion: 0.10
Nodes (32): Duel(), DuelResult, Pair, Row, Season, Bet, BetView, Boards (+24 more)

### Community 1 - "community.mjs"
Cohesion: 0.16
Nodes (23): block(), clean(), createTopic(), deletePost(), feedbackSummary(), forum(), GAP, hidden() (+15 more)

### Community 2 - "store.tsx"
Cohesion: 0.07
Nodes (46): ErrorBoundary(), Gate(), RootLayout(), API_URL, installCrashReporting(), reportCrash(), articles, demoSeason (+38 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.06
Nodes (54): AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history(), isClosed(), isOpen() (+46 more)

### Community 4 - "server.mjs"
Cohesion: 0.08
Nodes (45): ADMINS, admobCache, admobKeys(), allowReport, allRounds(), api(), BACKUPS, betView() (+37 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (47): dependencies, @anthropic-ai/sdk, expo, expo-constants, expo-linear-gradient, expo-linking, expo-notifications, expo-router (+39 more)

### Community 6 - "ref_node_assert"
Cohesion: 0.05
Nodes (35): Regagner le joker ×2 avec des pubs, event, file, ids, list, [pseudo, gp, part, names], state, stop() (+27 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.07
Nodes (50): refreshNews(), refreshSeason(), additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS (+42 more)

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
Cohesion: 0.21
Nodes (15): betsOf(), cell(), date(), exportCsv(), players(), resolveErrors(), setBetFor(), stats() (+7 more)

### Community 12 - "index.tsx"
Cohesion: 0.09
Nodes (41): Action, BetsView, Home(), TodoCard(), Fonctionnalités, Checker(), CircuitCard(), Countdown() (+33 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "fail"
Cohesion: 0.06
Nodes (72): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), addFriend() (+64 more)

### Community 20 - "Button"
Cohesion: 0.11
Nodes (32): Account(), Admin(), BetRow, BetsAdmin(), EXPORTS, Part, PART_LABEL, PenaltiesAdmin() (+24 more)

### Community 21 - "ui.tsx"
Cohesion: 0.13
Nodes (25): ASK, Bet, Part, PART_LABEL, Step, View_, Driver(), Season (+17 more)

### Community 22 - "Screen"
Cohesion: 0.20
Nodes (19): BetWizard(), Feature, Feedback(), Summary, GrandPrix(), Login(), Reveal(), Favorites() (+11 more)

### Community 23 - "mercato.tsx"
Cohesion: 0.16
Nodes (19): Act, Admin(), Category, Driver, Game, Grid, GROUPS, last() (+11 more)

### Community 24 - "useTheme"
Cohesion: 0.23
Nodes (12): Article(), ForumTopic(), Post, Topic, Notifications(), tabs, TabsLayout(), Season() (+4 more)

## Knowledge Gaps
- **10 isolated node(s):** `expo`, `expo-constants`, `expo-linking`, `react-dom`, `react-native-screens` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 276 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `useStore`, `store.tsx`, `simulator.tsx`, `Installer RaceIQ sur Proxmox`, `index.tsx`, `Button`, `ui.tsx`, `Screen`, `mercato.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `expo`, `expo-constants`, `expo-linking` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useStore` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `game.test.mjs`, `community.mjs`, `admin.test.mjs`, `server.mjs`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07329462989840348 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `game.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.0574400723654455 - nodes in this community are weakly interconnected._