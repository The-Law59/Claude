# Graph Report - Claude  (2026-11-10)

## Corpus Check
- 95 files · ~68,372 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .geojson 1)

## Summary
- 727 nodes · 2018 edges · 31 communities (24 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b86ec56`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- community.mjs
- store.tsx
- game.test.mjs
- server.mjs
- package.json
- add-bet.mjs
- jolpica.mjs
- simulator.tsx
- Installer RaceIQ sur Proxmox
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
- accounts.mjs
- fail
- account.mjs
- news.mjs
- notify.test.mjs
- translate.test.mjs
- ads.mjs
- results.mjs
- app/_layout.tsx
- third_party/README.md

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 95 edges
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
- `Fonctionnalités` --references--> `CircuitCard()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/design.tsx
- `Fonctionnalités` --references--> `nextAction()`  [INFERRED]
  keep-pushing/README.md → keep-pushing/src/model.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `jokerSource()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.mjs
- `Regagner le joker ×2 avec des pubs` --references--> `watchRewardedAd()`  [INFERRED]
  keep-pushing/docs/pubs-joker.md → keep-pushing/src/ads.ts

## Import Cycles
- None detected.

## Communities (31 total, 7 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.05
Nodes (130): Account(), Admin(), BetRow, BetsAdmin(), EXPORTS, Part, PART_LABEL, Player (+122 more)

### Community 1 - "community.mjs"
Cohesion: 0.16
Nodes (23): block(), clean(), createTopic(), deletePost(), feedbackSummary(), forum(), GAP, hidden() (+15 more)

### Community 2 - "store.tsx"
Cohesion: 0.10
Nodes (40): Action, BetsView, Home(), Countdown(), Shortcuts(), applySynced(), articleVisible(), askFeedback() (+32 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.08
Nodes (38): Fonctionnalités, AFTER_QUALI, answerOf(), closesAt(), dnfCount(), EXTRAS, history(), isClosed() (+30 more)

### Community 4 - "server.mjs"
Cohesion: 0.09
Nodes (37): ADMINS, admobCache, admobKeys(), allowReport, allRounds(), api(), BACKUPS, betView() (+29 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (47): dependencies, @anthropic-ai/sdk, expo, expo-constants, expo-linear-gradient, expo-linking, expo-notifications, expo-router (+39 more)

### Community 6 - "add-bet.mjs"
Cohesion: 0.16
Nodes (15): event, file, ids, list, [pseudo, gp, part, names], state, stop(), user (+7 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.11
Nodes (30): additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory(), loadDriverSeason() (+22 more)

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

### Community 12 - "design.tsx"
Cohesion: 0.11
Nodes (29): Checker(), CircuitCard(), Hero(), heroText, Kerb(), SpeedLines(), TeamBadge(), Thumb() (+21 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "mercato.mjs"
Cohesion: 0.14
Nodes (23): addDriver(), addRumor(), cancelOfficial(), clean(), foresaw(), gameOf(), makeOfficial(), MERCATO_POINTS (+15 more)

### Community 20 - "accounts.mjs"
Cohesion: 0.14
Nodes (21): file, password, state, addFriend(), authenticate(), bearer(), BLOCK, credentials() (+13 more)

### Community 21 - "fail"
Cohesion: 0.23
Nodes (13): fail(), GameError, CHAT, createLeague(), deleteMessage(), joinLeague(), leaguesOf, leaveLeague() (+5 more)

### Community 22 - "account.mjs"
Cohesion: 0.24
Nodes (12): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), checkPassword() (+4 more)

### Community 23 - "news.mjs"
Cohesion: 0.10
Nodes (28): refreshNews(), API_URL, articles, demoSeason, drivers, events, race, results (+20 more)

### Community 24 - "notify.test.mjs"
Cohesion: 0.19
Nodes (15): recap(), PARTS, POINTS, inbox(), markRead(), notify(), notifyFriend(), notifyLeague() (+7 more)

### Community 25 - "translate.test.mjs"
Cohesion: 0.15
Nodes (6): geo, IDS, out, root, createTranslator(), SCHEMA

### Community 26 - "ads.mjs"
Cohesion: 0.19
Nodes (11): Regagner le joker ×2 avec des pubs, ADMOB_KEYS_URL, ADS_ENABLED, adsWatched(), jokerSource(), ADS_PER_JOKER, parseKeys(), recordReward() (+3 more)

### Community 27 - "results.mjs"
Cohesion: 0.33
Nodes (6): bySession(), checkOverride(), OVERRIDE_SIZE, reorder(), sessionType(), withOverrides()

### Community 28 - "app/_layout.tsx"
Cohesion: 0.43
Nodes (6): ErrorBoundary(), Gate(), RootLayout(), installCrashReporting(), reportCrash(), react-native-safe-area-context

## Knowledge Gaps
- **10 isolated node(s):** `expo`, `expo-constants`, `expo-linking`, `react-dom`, `react-native-screens` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 270 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `store.tsx`, `simulator.tsx`, `Installer RaceIQ sur Proxmox`, `design.tsx`, `app/_layout.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `expo`, `expo-constants`, `expo-linking` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.052853598014888335 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `community.mjs`, `game.test.mjs`, `admin.test.mjs`, `mercato.mjs`, `accounts.mjs`, `account.mjs`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `store.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09797979797979799 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `game.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08484848484848485 - nodes in this community are weakly interconnected._