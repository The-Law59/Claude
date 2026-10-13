import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { demoSeason } from "./data.mjs";
import { loadSeason } from "./jolpica.mjs";
import { defaults, focusEvents, restorePreferences } from "./model.mjs";

const KEY = "keep-pushing.preferences.v1";
export type Prefs = {
  version: number;
  favorites: string[];
  protectedSessions: string[];
  frequency: string;
  rumors: boolean;
  reminders: boolean;
  reminderMinutes: number;
  results: boolean;
};
export type Session = { id: string; type: string; label: string; startsAt: string };
export type Event = { id: string; competition: string; name: string; circuit: string; sessions: Session[] };
type Row = { position: number; name: string; team: string; value: string };
export type Season = {
  mode: string;
  events: Event[];
  results: Record<string, Row[]>;
  drivers: { id: string; name: string; team: string; points: number }[];
  teams: { id: string; name: string; points: number }[];
  articles: typeof demoSeason.articles;
};
type Store = {
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
  update: (patch: Partial<Prefs>) => void;
  season: Season;
  focus: { current: Event; last: Event };
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
  useEffect(() => {
    let alive = true;
    Promise.all([
      AsyncStorage.getItem(KEY).catch(() => {
        setError("Impossible de lire vos préférences.");
        return null;
      }),
      // shortcut: sans réseau on retombe sur la démo, pas de cache hors ligne ; à ajouter si besoin.
      loadSeason().catch(() => demoSeason) as Promise<Season>,
    ]).then(([raw, loaded]) => {
      if (!alive) return;
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
    <Ctx.Provider value={{ prefs, setPrefs, update, season, focus, ready, error }}>
      {children}
    </Ctx.Provider>
  );
}
