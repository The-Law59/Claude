# Graph Report - Claude  (2026-10-28)

## Corpus Check
- 82 files · ~50,638 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 599 nodes · 1676 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e0d3f84`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- accounts.mjs
- store.tsx
- game.test.mjs
- server.mjs
- package.json
- ads.mjs
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
- app/_layout.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 79 edges
2. `useStore()` - 65 edges
3. `Button()` - 54 edges
4. `Screen()` - 50 edges
5. `fail()` - 32 edges
6. `react-native` - 30 edges
7. `useCall()` - 27 edges
8. `expo-router` - 25 edges
9. `react` - 25 edges
10. `formatDate()` - 25 edges

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

## Communities (20 total, 5 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.07
Nodes (100): Account(), Admin(), EXPORTS, Stats, Article(), BetWizard(), Driver(), Season (+92 more)

### Community 1 - "accounts.mjs"
Cohesion: 0.06
Nodes (64): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), addFriend(), authenticate() (+56 more)

### Community 2 - "store.tsx"
Cohesion: 0.08
Nodes (41): articles, drivers, events, race, results, sessions, sid(), teams (+33 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.06
Nodes (54): ASK, Bet, Part, PART_LABEL, Step, View_, Fonctionnalités, AFTER_QUALI (+46 more)

### Community 4 - "server.mjs"
Cohesion: 0.06
Nodes (49): file, password, state, ADMINS, admobCache, admobKeys(), allowReport, allRounds() (+41 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, expo, expo-constants, expo-linking, expo-notifications, expo-router, expo-status-bar (+35 more)

### Community 6 - "ads.mjs"
Cohesion: 0.19
Nodes (11): Regagner le joker ×2 avec des pubs, ADMOB_KEYS_URL, ADS_ENABLED, adsWatched(), jokerSource(), ADS_PER_JOKER, parseKeys(), recordReward() (+3 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.07
Nodes (46): refreshNews(), API_URL, demoSeason, at(), eventId(), getJson(), LABELS, loadCircuitHistory() (+38 more)

### Community 8 - "simulator.tsx"
Cohesion: 0.23
Nodes (16): Driver, Picks, Race, Simulator(), contenders(), defaultPicks(), maxLeft(), pointsFor() (+8 more)

### Community 9 - "Installer Keep Pushing sur Proxmox"
Cohesion: 0.12
Nodes (14): 1. Créer le conteneur (interface Proxmox), 2. Installer l'app (dans la console du conteneur), 3. Traduction des actualités anglaises (facultatif), 4. Sur le téléphone, Essais libres (fournisseur à choisir), Installer Keep Pushing sur Proxmox, Pubs pour regagner le joker (après la sortie sur les stores), Surveillance (+6 more)

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

### Community 19 - "app/_layout.tsx"
Cohesion: 0.43
Nodes (6): ErrorBoundary(), Gate(), RootLayout(), installCrashReporting(), reportCrash(), react-native-safe-area-context

## Knowledge Gaps
- **10 isolated node(s):** `expo`, `expo-constants`, `expo-linking`, `react-dom`, `react-native-screens` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 220 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `game.test.mjs`, `simulator.tsx`, `Installer Keep Pushing sur Proxmox`, `teams.mjs`, `app/_layout.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `expo`, `expo-constants`, `expo-linking` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.07470967741935484 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `accounts.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06260406260406261 - nodes in this community are weakly interconnected._
- **Should `store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0821256038647343 - nodes in this community are weakly interconnected._
- **Should `game.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05687645687645688 - nodes in this community are weakly interconnected._