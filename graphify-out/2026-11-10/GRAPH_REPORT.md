# Graph Report - Claude  (2026-11-07)

## Corpus Check
- 89 files · ~62,876 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 4)

## Summary
- 706 nodes · 1981 edges · 21 communities (16 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26b281d6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- fail
- store.tsx
- game.test.mjs
- server.mjs
- package.json
- ref_node_assert
- jolpica.mjs
- simulator.tsx
- Installer Keep Pushing sur Proxmox
- expo
- admin.test.mjs
- design.tsx
- tsconfig.json
- CLAUDE.md
- .claude/CLAUDE.md
- session-start.sh
- install-lxc.sh
- VALIDATION.md
- mercato.mjs
- admin.tsx

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 94 edges
2. `useStore()` - 70 edges
3. `Button()` - 61 edges
4. `Screen()` - 52 edges
5. `fail()` - 42 edges
6. `useCall()` - 34 edges
7. `react-native` - 32 edges
8. `formatDate()` - 30 edges
9. `react` - 27 edges
10. `expo-router` - 26 edges

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

## Communities (21 total, 5 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.05
Nodes (132): Account(), Admin(), BetsAdmin(), PlayersAdmin(), ResultFix(), Article(), ASK, Bet (+124 more)

### Community 1 - "fail"
Cohesion: 0.06
Nodes (64): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), addFriend() (+56 more)

### Community 2 - "store.tsx"
Cohesion: 0.05
Nodes (66): ErrorBoundary(), Gate(), RootLayout(), refreshNews(), API_URL, installCrashReporting(), reportCrash(), articles (+58 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.09
Nodes (37): Fonctionnalités, AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history(), isClosed() (+29 more)

### Community 4 - "server.mjs"
Cohesion: 0.06
Nodes (56): ADMINS, admobCache, admobKeys(), allowReport, allRounds(), api(), BACKUPS, betView() (+48 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (45): dependencies, @anthropic-ai/sdk, expo, expo-constants, expo-linear-gradient, expo-linking, expo-notifications, expo-router (+37 more)

### Community 6 - "ref_node_assert"
Cohesion: 0.09
Nodes (16): Regagner le joker ×2 avec des pubs, file, password, state, ADMOB_KEYS_URL, ADS_ENABLED, adsWatched(), jokerSource() (+8 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.11
Nodes (30): additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory(), loadDriverSeason() (+22 more)

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

### Community 12 - "design.tsx"
Cohesion: 0.16
Nodes (23): Checker(), Hero(), heroText, Kerb(), SpeedLines(), TeamBadge(), Thumb(), accentFor() (+15 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "mercato.mjs"
Cohesion: 0.14
Nodes (24): addDriver(), addRumor(), cancelOfficial(), clean(), foresaw(), gameOf(), makeOfficial(), MERCATO_POINTS (+16 more)

### Community 20 - "admin.tsx"
Cohesion: 0.09
Nodes (24): BetRow, EXPORTS, Part, PART_LABEL, Player, SESSION_LABEL, SessionType, Stats (+16 more)

## Knowledge Gaps
- **10 isolated node(s):** `expo`, `expo-constants`, `expo-linking`, `react-dom`, `react-native-screens` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 256 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `store.tsx`, `simulator.tsx`, `Installer Keep Pushing sur Proxmox`, `design.tsx`, `admin.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `expo`, `expo-constants`, `expo-linking` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.054135817212005416 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `game.test.mjs`, `mercato.mjs`, `admin.test.mjs`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.06390977443609022 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.051929824561403506 - nodes in this community are weakly interconnected._