# Graph Report - claude  (2026-11-10)

## Corpus Check
- 101 files · ~72,435 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .geojson 1)

## Summary
- 786 nodes · 2156 edges · 32 communities (25 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12c70f82`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- mercato.mjs
- model.mjs
- game.test.mjs
- api
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
- store.tsx
- notify.test.mjs
- news.mjs
- environment
- server.mjs
- add-bet.mjs
- results.mjs
- data.mjs
- app/_layout.tsx
- third_party/README.md
- securite.test.mjs

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 97 edges
2. `useStore()` - 72 edges
3. `Button()` - 62 edges
4. `Screen()` - 52 edges
5. `fail()` - 45 edges
6. `useCall()` - 35 edges
7. `react-native` - 33 edges
8. `formatDate()` - 30 edges
9. `react` - 28 edges
10. `expo-router` - 27 edges

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

## Communities (32 total, 7 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.05
Nodes (129): Account(), Admin(), BetsAdmin(), PenaltiesAdmin(), PlayersAdmin(), ResultFix(), Article(), ASK (+121 more)

### Community 1 - "mercato.mjs"
Cohesion: 0.12
Nodes (30): addDriver(), addRumor(), cancelOfficial(), CATEGORIES, clean(), driverIdOf(), foresaw(), gameOf() (+22 more)

### Community 2 - "model.mjs"
Cohesion: 0.18
Nodes (18): parseDriverSeason(), articleVisible(), AUTO_TYPES, autoProtect(), BET_SESSIONS, BET_TODO, betReminderPlan(), defaults() (+10 more)

### Community 3 - "game.test.mjs"
Cohesion: 0.05
Nodes (56): BetRow, EXPORTS, Part, PART_LABEL, Player, Reason, SESSION_LABEL, SessionType (+48 more)

### Community 4 - "api"
Cohesion: 0.16
Nodes (23): admobKeys(), allowRegister, allowReport, allRounds(), api(), betView(), bySession(), champions() (+15 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (49): dependencies, @anthropic-ai/sdk@^0.133.0, expo@~57.0.28, expo-constants@~57.0.21, expo-linear-gradient@~57.0.0, expo-linking@~57.0.12, expo-notifications@~57.0.22, expo-router@~57.0.26 (+41 more)

### Community 6 - "translate.test.mjs"
Cohesion: 0.12
Nodes (9): geo, IDS, out, root, file, password, state, createTranslator() (+1 more)

### Community 7 - "jolpica.mjs"
Cohesion: 0.12
Nodes (29): additionsOf(), at(), driverKey(), eventId(), getJson(), LABELS, loadCircuitHistory(), loadRound() (+21 more)

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
Cohesion: 0.09
Nodes (39): Action, BetsView, Home(), TodoCard(), Fonctionnalités, Checker(), CircuitCard(), Countdown() (+31 more)

### Community 13 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, allowJs, checkJs, strict, extends, include, expo/tsconfig.base

### Community 19 - "fail"
Cohesion: 0.06
Nodes (63): bearer(), changePassword(), changePseudo(), confirm(), deleteAccount(), exportData(), removeUser(), addFriend() (+55 more)

### Community 20 - "store.tsx"
Cohesion: 0.17
Nodes (15): applySynced(), restorePreferences(), syncedPart(), Article, Ctx, Event, Inbox, Notice (+7 more)

### Community 21 - "notify.test.mjs"
Cohesion: 0.13
Nodes (18): Regagner le joker ×2 avec des pubs, ADMOB_KEYS_URL, ADS_ENABLED, adsWatched(), jokerSource(), ADS_PER_JOKER, parseKeys(), recordReward() (+10 more)

### Community 22 - "news.mjs"
Cohesion: 0.13
Nodes (20): refreshNews(), demoSeason, timedFetch(), classify(), clean(), decode(), ENTITIES, fetchFeeds() (+12 more)

### Community 23 - "environment"
Cohesion: 0.09
Nodes (22): ADMINS, ADS_ENABLED, ANTHROPIC_API_KEY, MERCATO_YEAR, PRACTICE_API_KEY, PRACTICE_PROVIDER, build, environment (+14 more)

### Community 24 - "server.mjs"
Cohesion: 0.09
Nodes (19): ADMINS, admobCache, BACKUPS, DATA, DIST, failures, firstNews, GAME (+11 more)

### Community 25 - "add-bet.mjs"
Cohesion: 0.16
Nodes (15): event, file, ids, list, [pseudo, gp, part, names], state, stop(), user (+7 more)

### Community 26 - "results.mjs"
Cohesion: 0.33
Nodes (6): roundResults(), checkOverride(), OVERRIDE_SIZE, reorder(), sessionType(), withOverrides()

### Community 27 - "data.mjs"
Cohesion: 0.25
Nodes (8): articles, drivers, events, race, results, sessions, sid(), teams

### Community 28 - "app/_layout.tsx"
Cohesion: 0.43
Nodes (6): ErrorBoundary(), Gate(), RootLayout(), API_URL, installCrashReporting(), reportCrash()

### Community 31 - "securite.test.mjs"
Cohesion: 0.39
Nodes (4): adminPseudoTaken(), clientIp(), failureCounter(), parseTrusted()

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 274 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `game.test.mjs`, `simulator.tsx`, `Installer RaceIQ sur Proxmox`, `index.tsx`, `app/_layout.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.05483405483405483 - nodes in this community are weakly interconnected._
- **Why does `fail()` connect `fail` to `game.test.mjs`, `mercato.mjs`, `admin.test.mjs`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `mercato.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.11931818181818182 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `package.json` to `server.mjs`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `game.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05200341005967604 - nodes in this community are weakly interconnected._