# Graph Report - Claude  (2026-10-28)

## Corpus Check
- 85 files · ~55,990 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 645 nodes · 1808 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12d77842`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- fail
- store.tsx
- game.test.mjs
- server.mjs
- package.json
- ref_node_test
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
- community.mjs

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 85 edges
2. `useStore()` - 67 edges
3. `Button()` - 58 edges
4. `Screen()` - 52 edges
5. `fail()` - 40 edges
6. `react-native` - 31 edges
7. `useCall()` - 31 edges
8. `formatDate()` - 28 edges
9. `expo-router` - 26 edges
10. `react` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `useTheme()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/ui.tsx
- `Fonctionnalités` --references--> `qualiReference()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/bets.mjs
- `Fonctionnalités` --references--> `nextAction()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/model.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `jokerSource()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `watchRewardedAd()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.ts

## Import Cycles
- None detected.

## Communities (20 total, 5 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.06
Nodes (114): Account(), Admin(), EXPORTS, Stats, Article(), ASK, Bet, BetWizard() (+106 more)

### Community 1 - "fail"
Cohesion: 0.06
Nodes (64): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), addFriend(), authenticate() (+56 more)

### Community 2 - "store.tsx"
Cohesion: 0.05
Nodes (67): ErrorBoundary(), Gate(), RootLayout(), refreshNews(), API_URL, installCrashReporting(), reportCrash(), articles (+59 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.09
Nodes (36): AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history(), isClosed(), isOpen() (+28 more)

### Community 4 - "server.mjs"
Cohesion: 0.06
Nodes (57): ADMINS, admobCache, admobKeys(), allowReport, allRounds(), api(), BACKUPS, betView() (+49 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, expo, expo-constants, expo-linking, expo-notifications, expo-router, expo-status-bar (+35 more)

### Community 6 - "ref_node_test"
Cohesion: 0.09
Nodes (16): Regagner le joker ×2 avec des pubs, file, password, state, ADMOB_KEYS_URL, ADS_ENABLED, adsWatched(), jokerSource() (+8 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.09
Nodes (34): GrandPrix(), DuelResult, Row, Season, TeamsDuel(), refreshSeason(), at(), eventId() (+26 more)

### Community 8 - "simulator.tsx"
Cohesion: 0.23
Nodes (17): Driver, Picks, Race, Simulator(), contenders(), defaultPicks(), maxLeft(), pointsFor() (+9 more)

### Community 9 - "Installer Keep Pushing sur Proxmox"
Cohesion: 0.12
Nodes (15): 1. Créer le conteneur (interface Proxmox), 2. Installer l'app (dans la console du conteneur), 3. Traduction des actualités anglaises (facultatif), 4. Sur le téléphone, Essais libres (fournisseur à choisir), Installer Keep Pushing sur Proxmox, Pubs pour regagner le joker (après la sortie sur les stores), Surveillance (+7 more)

### Community 10 - "expo"
Cohesion: 0.14
Nodes (13): package, expo, android, ios, name, orientation, plugins, scheme (+5 more)

### Community 11 - "admin.test.mjs"
Cohesion: 0.26
Nodes (11): cell(), date(), exportCsv(), stats(), toCsv(), weekOf(), clip(), health() (+3 more)

### Community 12 - "teams.mjs"
Cohesion: 0.39
Nodes (10): accentFor(), contrast(), contrastWithWhite(), DEFAULT_ACCENT, luminance(), mix(), readableOn(), rgb() (+2 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "community.mjs"
Cohesion: 0.16
Nodes (23): block(), clean(), createTopic(), deletePost(), feedbackSummary(), forum(), GAP, hidden() (+15 more)

## Knowledge Gaps
- **10 isolated node(s):** `expo`, `expo-constants`, `expo-linking`, `react-dom`, `react-native-screens` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 234 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `store.tsx`, `jolpica.mjs`, `simulator.tsx`, `Installer Keep Pushing sur Proxmox`, `teams.mjs`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `expo`, `expo-constants`, `expo-linking` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.0628714419768533 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.061052631578947365 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `community.mjs`, `game.test.mjs`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05092276144907724 - nodes in this community are weakly interconnected._