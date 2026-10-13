import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { demoSeason } from "./data.mjs";
import { loadRound, loadSeason } from "./jolpica.mjs";
import { loadNews, toArticle } from "./news.mjs";
import { defaults, focusEvents, restorePreferences } from "./model.mjs";

const KEY = "keep-pushing.preferences.v1";
export type Prefs = {
  version: number;
  favorites: string[];
  myDriver: string;
  myTeam: string;
  protectedSessions: string[];
  frequency: string;
  rumors: boolean;
  reminders: boolean;
  reminderMinutes: number;
  results: boolean;
};
export type Session = { id: string; type: string; label: string; startsAt: string };
type Row = { position: number; driverId: string; name: string; team: string; value: string };
export type Event = {
  id: string;
  competition: string;
  season: string;
  round: number;
  name: string;
  circuit: string;
  winner: Row | null;
  sessions: Session[];
};
export type Season = {
  mode: string;
  events: Event[];
  results: Record<string, Row[]>;
  drivers: { id: string; name: string; team: string; teamId: string; points: number }[];
  teams: { id: string; name: string; points: number }[];
  articles: Article[];
};
export type Article = (typeof demoSeason.articles)[number] & {
  link?: string;
  source?: string;
  via?: string;
  kind?: "official" | "press" | "unofficial";
  lang?: string;
  publishedAt?: number;
  dated?: boolean;
};
type Store = {
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
  update: (patch: Partial<Prefs>) => void;
  season: Season;
  focus: { current: Event; last: Event };
  loadResults: (event: Event) => void;
  ready: boolean;
  error: string;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(defaults as () => Prefs),
    [season, setSeason] = useState<Season>(demoSeason as Season),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const saveQueue = useRef(Promise.resolve());
  const requested = useRef(new Set<string>());
  // Résultats chargés à la demande, une fois par GP (la démo les a déjà tous).
  const loadResults = (event: Event) => {
    if (season.mode !== "live" || requested.current.has(event.id)) return;
    if (Date.parse(event.sessions[0].startsAt) > Date.now()) return;
    requested.current.add(event.id);
    loadRound(event)
      .then((more) => setSeason((x) => ({ ...x, results: { ...x.results, ...more } })))
      .catch(() => requested.current.delete(event.id));
  };
  useEffect(() => {
    let alive = true;
    Promise.all([
      AsyncStorage.getItem(KEY).catch(() => {
        setError("Impossible de lire vos préférences.");
        return null;
      }),
      // shortcut: sans réseau on retombe sur la démo, pas de cache hors ligne ; à ajouter si besoin.
      loadSeason().catch(() => demoSeason) as Promise<Season>,
      loadNews().catch(() => null),
    ]).then(([raw, loaded, news]) => {
      if (!alive) return;
      // Sans flux : articles fictifs en démo, aucun en mode réel.
      if (news) loaded = { ...loaded, articles: news.map((n) => toArticle(n, loaded)) };
      setSeason(loaded);
      if (raw)
        setPrefs(restorePreferences(raw, loaded.events.flatMap((e) => e.sessions)));
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(prefs)))
      .catch(() => setError("Vos choix n’ont pas pu être enregistrés."));
  }, [prefs, ready]);
  const focus = useMemo(() => focusEvents(season.events) as Store["focus"], [season]);
  const update = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));
  return (
    <Ctx.Provider value={{ prefs, setPrefs, update, season, focus, loadResults, ready, error }}>
      {children}
    </Ctx.Provider>
  );
}
