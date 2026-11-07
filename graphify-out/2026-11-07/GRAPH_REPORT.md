# Graph Report - Claude  (2026-11-07)

## Corpus Check
- 88 files · ~60,584 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 683 nodes · 1911 edges · 22 communities (17 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39b9e280`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- fail
- store.tsx
- game.test.mjs
- server.mjs
- package.json
- add-bet.mjs
- jolpica.mjs
- simulator.tsx
- Installer Keep Pushing sur Proxmox
- expo
- admin.test.mjs
- teams.mjs
- tsconfig.json
- CLAUDE.md
- .claude/CLAUDE.md
- session-start.sh
- install-lxc.sh
- VALIDATION.md
- mercato.mjs
- news.mjs
- app/_layout.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 88 edges
2. `useStore()` - 70 edges
3. `Button()` - 61 edges
4. `Screen()` - 52 edges
5. `fail()` - 42 edges
6. `useCall()` - 34 edges
7. `react-native` - 31 edges
8. `formatDate()` - 29 edges
9. `expo-router` - 26 edges
10. `react` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `useTheme()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/ui.tsx
- `Fonctionnalités` --references--> `nextAction()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/model.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `jokerSource()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `watchRewardedAd()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.ts
- `Fonctionnalités` --references--> `qualiReference()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs

## Import Cycles
- None detected.

## Communities (22 total, 5 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.06
Nodes (128): Account(), Admin(), BetRow, BetsAdmin(), EXPORTS, Part, PART_LABEL, Player (+120 more)

### Community 1 - "fail"
Cohesion: 0.06
Nodes (66): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), addFriend() (+58 more)

### Community 2 - "store.tsx"
Cohesion: 0.08
Nodes (42): articles, demoSeason, drivers, events, race, results, sessions, sid() (+34 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.09
Nodes (37): Fonctionnalités, AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history(), isClosed() (+29 more)

### Community 4 - "server.mjs"
Cohesion: 0.06
Nodes (56): ADMINS, admobCache, admobKeys(), allowReport, allRounds(), api(), BACKUPS, betView() (+48 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, expo, expo-constants, expo-linking, expo-notifications, expo-router, expo-status-bar (+35 more)

### Community 6 - "add-bet.mjs"
Cohesion: 0.06
Nodes (32): Regagner le joker ×2 avec des pubs, event, file, ids, list, [pseudo, gp, part, names], state, stop() (+24 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.11
Nodes (31): GrandPrix(), additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory() (+23 more)

### Community 8 - "simulator.tsx"
Cohesion: 0.23
Nodes (17): Driver, Picks, Race, Simulator(), contenders(), defaultPicks(), maxLeft(), pointsFor() (+9 more)

### Community 9 - "Installer Keep Pushing sur Proxmox"
Cohesion: 0.12
Nodes (14): 1. Créer le conteneur (interface Proxmox), 2. Installer l'app (dans la console du conteneur), 3. Traduction des actualités anglaises (facultatif), 4. Sur le téléphone, Essais libres (fournisseur à choisir), Installer Keep Pushing sur Proxmox, Pubs pour regagner le joker (après la sortie sur les stores), Surveillance (+6 more)

### Community 10 - "expo"
Cohesion: 0.14
Nodes (13): package, expo, android, ios, name, orientation, plugins, scheme (+5 more)

### Community 11 - "admin.test.mjs"
Cohesion: 0.21
Nodes (15): betsOf(), cell(), date(), exportCsv(), players(), resolveErrors(), setBetFor(), stats() (+7 more)

### Community 12 - "teams.mjs"
Cohesion: 0.39
Nodes (10): accentFor(), contrast(), contrastWithWhite(), DEFAULT_ACCENT, luminance(), mix(), readableOn(), rgb() (+2 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "mercato.mjs"
Cohesion: 0.14
Nodes (24): addDriver(), addRumor(), cancelOfficial(), clean(), foresaw(), gameOf(), makeOfficial(), MERCATO_POINTS (+16 more)

### Community 20 - "news.mjs"
Cohesion: 0.16
Nodes (19): refreshNews(), timedFetch(), classify(), clean(), decode(), ENTITIES, fetchFeeds(), has() (+11 more)

### Community 21 - "app/_layout.tsx"
Cohesion: 0.36
Nodes (7): ErrorBoundary(), Gate(), RootLayout(), API_URL, installCrashReporting(), reportCrash(), react-native-safe-area-context

## Knowledge Gaps
- **10 isolated node(s):** `expo`, `expo-constants`, `expo-linking`, `react-dom`, `react-native-screens` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 249 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `jolpica.mjs`, `simulator.tsx`, `Installer Keep Pushing sur Proxmox`, `teams.mjs`, `app/_layout.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `expo`, `expo-constants`, `expo-linking` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.055173584585349295 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `game.test.mjs`, `mercato.mjs`, `admin.test.mjs`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.060759493670886074 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08325624421831637 - nodes in this community are weakly interconnected._