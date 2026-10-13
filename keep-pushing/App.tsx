import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import {
  articles,
  championship,
  constructors,
  favorites,
  results,
  sessions,
} from "./src/data.mjs";
import {
  articleVisible,
  defaults,
  protectWeekend,
  restorePreferences,
  setProtected,
} from "./src/model.mjs";
import { syncReminders } from "./src/reminders";
const KEY = "keep-pushing.preferences.v1";
const tabs = [
  ["home", "⌂", "Accueil"],
  ["live", "◉", "Direct"],
  ["season", "▦", "Saison"],
  ["favorites", "♡", "Favoris"],
  ["settings", "☷", "Réglages"],
];
const c = {
  bg: "#f5f6f8",
  card: "#ffffff",
  ink: "#202631",
  muted: "#626c79",
  accent: "#b64025",
  line: "#dce0e6",
  soft: "#fbece6",
  green: "#2e6746",
};
type Prefs = {
  version: number;
  favorites: string[];
  protectedSessions: string[];
  frequency: string;
  rumors: boolean;
  reminders: boolean;
  reminderMinutes: number;
  results: boolean;
};
function Button({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.button, secondary && s.secondary]}
    >
      <Text style={[s.buttonText, secondary && { color: c.accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}
function Toggle({
  label,
  value,
  onChange,
  detail,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  detail?: string;
}) {
  return (
    <View style={s.setting}>
      <View style={{ flex: 1 }}>
        <Text style={s.text}>{label}</Text>
        {detail && <Text style={s.small}>{detail}</Text>}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.accent, false: c.line }}
      />
    </View>
  );
}
function AppContent() {
  const [prefs, setPrefs] = useState<Prefs>(defaults),
    [ready, setReady] = useState(false),
    [page, setPage] = useState("home"),
    [personal, setPersonal] = useState(true),
    [selectedSession, setSelectedSession] = useState("race"),
    [seasonTab, setSeasonTab] = useState("sessions"),
    [articleId, setArticleId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const saveQueue = useRef(Promise.resolve());
  const reminderBusy = useRef(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (alive) {
          if (raw) setPrefs(restorePreferences(raw, sessions));
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setError("Impossible de lire vos préférences.");
          setReady(true);
        }
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
      .catch(() => {
        setError("Vos choix n’ont pas pu être enregistrés.");
      });
  }, [prefs, ready]);
  // Revalider la vue après retour depuis l’arrière-plan.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setArticleId(null);
    });
    return () => sub.remove();
  }, []);
  const update = (patch: Partial<Prefs>) =>
    setPrefs((p) => ({ ...p, ...patch }));
  const protectedAny = prefs.protectedSessions.length > 0,
    protectedAll = prefs.protectedSessions.length === sessions.length;
  const toggleWeekend = () =>
    setPrefs((p) => protectWeekend(p, sessions, !protectedAll));
  const reveal = (id: string) => setPrefs((p) => setProtected(p, id, false));
  const showRows = (id: string) =>
    prefs.protectedSessions.includes(id) ? (
      <View style={s.lock}>
        <Text style={s.cardTitle}>Session protégée</Text>
        <Text style={s.text}>
          Regardez-la à votre rythme. Son résultat reste masqué.
        </Text>
        <Button
          label="J’ai regardé cette session"
          onPress={() => reveal(id)}
          secondary
        />
      </View>
    ) : (
      <View style={s.card}>
        {(results[id] ?? []).map((r: any) => (
          <View style={s.rank} key={r.name}>
            <Text style={s.position}>{r.position}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{r.name}</Text>
              <Text style={s.small}>{r.team}</Text>
            </View>
            <Text style={s.time}>{r.value}</Text>
          </View>
        ))}
      </View>
    );
  const setReminder = async (
    value: boolean,
    minutes = prefs.reminderMinutes,
  ) => {
    if (reminderBusy.current) return;
    reminderBusy.current = true;
    try {
      const next = { ...prefs, reminders: value, reminderMinutes: minutes };
      const msg = await syncReminders(next);
      update({
        reminders: value && Platform.OS !== "web",
        reminderMinutes: minutes,
      });
      setNotice(msg);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Échec de programmation des rappels.",
      );
    } finally {
      reminderBusy.current = false;
    }
  };
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={c.accent} />
        <Text style={s.small}>Votre paddock se prépare…</Text>
      </View>
    );
  const selectedArticle = articles.find((a) => a.id === articleId);
  const canRead =
    selectedArticle && articleVisible(selectedArticle, prefs, false);
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Keep <Text style={{ color: c.accent }}>Pushing.</Text>
          </Text>
          <Text style={s.small}>La F1 à votre rythme.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gérer l’anti-spoil"
          onPress={() => {
            setPage("settings");
            setArticleId(null);
          }}
          style={[s.shield, protectedAny && { backgroundColor: "#e4eee6" }]}
        >
          <Text style={{ color: protectedAny ? c.green : c.ink }}>◈</Text>
          <Text style={s.tiny}>{protectedAny ? "Protégé" : "Anti-spoil"}</Text>
        </Pressable>
      </View>
      <View style={s.demo}>
        <Text style={s.tiny}>DÉMONSTRATION · DONNÉES FICTIVES</Text>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <ScrollView contentContainerStyle={s.content}>
        {canRead ? (
          <>
            <Button
              label="← Retour aux actualités"
              onPress={() => setArticleId(null)}
              secondary
            />
            <Text style={s.title}>{selectedArticle.title}</Text>
            <View style={s.card}>
              <Text style={s.text}>{selectedArticle.summary}</Text>
              <Text style={s.small}>
                Article fictif. Les sources seront reliées dans la prochaine
                étape.
              </Text>
            </View>
          </>
        ) : (
          <>
            {page === "home" && (
              <>
                <Text style={s.title}>Au cœur du paddock.</Text>
                <Text style={s.subtitle}>Votre sélection, votre rythme.</Text>
                <View style={s.hero}>
                  <Text style={s.heroLabel}>WEEK-END DE DÉMONSTRATION</Text>
                  <Text style={s.heroTitle}>Grand Prix d’Italie</Text>
                  <Text style={s.heroText}>
                    {prefs.protectedSessions.includes("race")
                      ? "Course protégée"
                      : "Classement de démonstration"}
                  </Text>
                  <Button
                    label={
                      prefs.protectedSessions.includes("race")
                        ? "Gérer la protection"
                        : "Voir le classement →"
                    }
                    onPress={() =>
                      setPage(
                        prefs.protectedSessions.includes("race")
                          ? "settings"
                          : "live",
                      )
                    }
                  />
                </View>
                {protectedAny && (
                  <View style={s.lock}>
                    <Text style={s.text}>
                      {prefs.protectedSessions.length} session(s) protégée(s).
                      Les actualités associées sont masquées.
                    </Text>
                  </View>
                )}
                <View style={s.pills}>
                  {[true, false].map((v) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: personal === v }}
                      onPress={() => setPersonal(v)}
                      style={[s.pill, personal === v && s.pillActive]}
                      key={String(v)}
                    >
                      <Text style={personal === v ? s.pillTextActive : s.text}>
                        {v ? "Pour vous" : "Toute la F1"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.heading}>À la une</Text>
                {articles
                  .filter((a) => articleVisible(a, prefs, personal))
                  .map((a) => (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setArticleId(a.id)}
                      style={s.card}
                      key={a.id}
                    >
                      <Text style={s.label}>
                        {a.rumor
                          ? "RUMEUR · NON CONFIRMÉE"
                          : "ACTUALITÉ · DÉMONSTRATION"}
                      </Text>
                      <Text style={s.cardTitle}>{a.title}</Text>
                      <Text style={s.small}>Lire le résumé →</Text>
                    </Pressable>
                  ))}
                {!articles.some((a) => articleVisible(a, prefs, personal)) && (
                  <View style={s.card}>
                    <Text style={s.text}>
                      Aucune actualité visible pour cette sélection.
                    </Text>
                    <Button
                      label="Choisir mes favoris"
                      onPress={() => setPage("favorites")}
                      secondary
                    />
                  </View>
                )}
              </>
            )}
            {page === "live" && (
              <>
                <Text style={s.title}>Le direct.</Text>
                <Text style={s.subtitle}>
                  Course · Simulation sans flux connecté
                </Text>
                {!prefs.protectedSessions.includes("race") && (
                  <Text style={s.label}>
                    EXEMPLE DE CLASSEMENT · TOUR 32 / 53
                  </Text>
                )}
                {showRows("race")}
                <Text style={s.small}>
                  Aucune mise à jour en temps réel dans cette version. La source
                  de données et ses droits restent à valider.
                </Text>
              </>
            )}
            {page === "season" && (
              <>
                <Text style={s.title}>La saison.</Text>
                <View style={s.pills}>
                  {[
                    ["sessions", "Sessions"],
                    ["drivers", "Pilotes"],
                    ["teams", "Écuries"],
                  ].map(([id, label]) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => setSeasonTab(id)}
                      style={[s.pill, seasonTab === id && s.pillActive]}
                    >
                      <Text
                        style={seasonTab === id ? s.pillTextActive : s.text}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {seasonTab === "sessions" ? (
                  <>
                    <Text style={s.small}>
                      Week-end fictif · Horaires locaux du téléphone
                    </Text>
                    {sessions.map((session) => (
                      <View style={s.session} key={session.id}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.text}>{session.label}</Text>
                          <Text style={s.small}>
                            {new Date(session.startsAt).toLocaleString(
                              "fr-FR",
                              {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setSelectedSession(session.id)}
                          style={s.smallButton}
                        >
                          <Text style={s.link}>
                            {prefs.protectedSessions.includes(session.id)
                              ? "Protégée"
                              : "Résultat"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                    <Text style={s.heading}>
                      {sessions.find((x) => x.id === selectedSession)?.label}
                    </Text>
                    {showRows(selectedSession)}
                  </>
                ) : protectedAny ? (
                  <View style={s.lock}>
                    <Text style={s.cardTitle}>Classement masqué</Text>
                    <Text style={s.text}>
                      Il pourrait révéler le résultat d’une session protégée.
                    </Text>
                    <Button
                      label="Gérer les sessions"
                      onPress={() => setPage("settings")}
                      secondary
                    />
                  </View>
                ) : (
                  <View style={s.card}>
                    <Text style={s.label}>POINTS FICTIFS</Text>
                    {(seasonTab === "drivers"
                      ? championship
                      : constructors
                    ).map(([name, points], i) => (
                      <View key={name} style={s.rank}>
                        <Text style={s.position}>{i + 1}</Text>
                        <Text style={[s.text, { flex: 1 }]}>{name}</Text>
                        <Text style={s.time}>{points} pts</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            {page === "favorites" && (
              <>
                <Text style={s.title}>Votre paddock.</Text>
                <Text style={s.subtitle}>
                  Plusieurs pilotes, plusieurs écuries.
                </Text>
                {["Pilote", "Écurie"].map((kind) => (
                  <View key={kind}>
                    <Text style={s.heading}>
                      {kind === "Pilote" ? "Pilotes" : "Écuries"}
                    </Text>
                    {favorites
                      .filter((f) => f.kind === kind)
                      .map((f) => (
                        <Toggle
                          key={f.id}
                          label={f.name}
                          value={prefs.favorites.includes(f.id)}
                          onChange={(on) =>
                            update({
                              favorites: on
                                ? [...prefs.favorites, f.id]
                                : prefs.favorites.filter((id) => id !== f.id),
                            })
                          }
                        />
                      ))}
                  </View>
                ))}
                <Text style={s.small}>
                  Liste de démonstration. Vos choix sont enregistrés sur cet
                  appareil.
                </Text>
              </>
            )}
            {page === "settings" && (
              <>
                <Text style={s.title}>À votre rythme.</Text>
                <Text style={s.heading}>Anti-spoil</Text>
                <Toggle
                  label="Protéger tout le week-end"
                  value={protectedAll}
                  onChange={toggleWeekend}
                  detail="Les rappels restent neutres."
                />
                {sessions.map((session) => (
                  <Toggle
                    key={session.id}
                    label={session.label}
                    value={prefs.protectedSessions.includes(session.id)}
                    onChange={(on) =>
                      setPrefs((p) => setProtected(p, session.id, on))
                    }
                    detail={
                      prefs.protectedSessions.includes(session.id)
                        ? "Protégée · désactivez après visionnage"
                        : "Résultats et actualités visibles"
                    }
                  />
                ))}
                <Text style={s.heading}>Alertes d’actualités</Text>
                <View style={s.pills}>
                  {[
                    ["important", "Importantes"],
                    ["all", "Toutes"],
                  ].map(([id, label]) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => update({ frequency: id })}
                      style={[s.pill, prefs.frequency === id && s.pillActive]}
                    >
                      <Text
                        style={
                          prefs.frequency === id ? s.pillTextActive : s.text
                        }
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Toggle
                  label="Inclure les rumeurs identifiées"
                  value={prefs.rumors}
                  onChange={(rumors) => update({ rumors })}
                />
                <Toggle
                  label="Résultats après chaque session"
                  value={prefs.results}
                  onChange={(results) => update({ results })}
                  detail="Bloqués pour les sessions protégées."
                />
                <Text style={s.small}>
                  Préférences préparées pour le futur service d’alertes. Aucune
                  alerte d’actualité ou de résultat n’est envoyée dans cette V1.
                </Text>
                <Text style={s.heading}>Rappels de sessions</Text>
                <Toggle
                  label="Activer les rappels locaux"
                  value={prefs.reminders}
                  onChange={(on) => void setReminder(on)}
                  detail="Attention : horaires de démonstration."
                />
                <View style={s.pills}>
                  {[10, 30, 60].map((minutes) => (
                    <Pressable
                      accessibilityRole="button"
                      key={minutes}
                      onPress={() =>
                        prefs.reminders
                          ? void setReminder(true, minutes)
                          : update({ reminderMinutes: minutes })
                      }
                      style={[
                        s.pill,
                        prefs.reminderMinutes === minutes && s.pillActive,
                      ]}
                    >
                      <Text
                        style={
                          prefs.reminderMinutes === minutes
                            ? s.pillTextActive
                            : s.text
                        }
                      >
                        {minutes} min
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {!!notice && (
                  <Text accessibilityLiveRegion="polite" style={s.small}>
                    {notice}
                  </Text>
                )}
                <Text style={s.heading}>Keep Pushing · 0.1</Text>
                <Text style={s.small}>
                  Sans compte. Aucun contenu officiel, aucune affiliation à
                  Formula 1. Les données affichées servent uniquement à tester
                  l’application.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
      <View style={s.nav}>
        {tabs.map(([id, icon, label]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: page === id }}
            key={id}
            onPress={() => {
              setPage(id);
              setArticleId(null);
            }}
            style={s.navButton}
          >
            <Text style={[s.navIcon, page === id && { color: c.accent }]}>
              {icon}
            </Text>
            <Text
              style={[
                s.tiny,
                page === id && { color: c.accent, fontWeight: "700" },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: c.bg,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 26,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: -1,
    color: c.ink,
  },
  shield: {
    minWidth: 64,
    minHeight: 48,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#e8ebef",
    alignItems: "center",
    justifyContent: "center",
  },
  demo: { paddingHorizontal: 22, paddingVertical: 8 },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 30,
    gap: 12,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: c.ink,
    marginTop: 8,
  },
  subtitle: { fontSize: 14, color: c.muted },
  heading: { fontSize: 19, fontWeight: "700", color: c.ink, marginTop: 12 },
  text: { fontSize: 15, lineHeight: 22, color: c.ink },
  small: { fontSize: 12, lineHeight: 18, color: c.muted },
  tiny: { fontSize: 11, color: c.muted },
  hero: {
    backgroundColor: c.ink,
    padding: 22,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  heroLabel: { fontSize: 11, letterSpacing: 1, color: "#f3d5c8" },
  heroTitle: { fontSize: 25, fontWeight: "700", color: "#fff" },
  heroText: { fontSize: 14, color: "#e5e8ed" },
  button: {
    backgroundColor: c.accent,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  secondary: { backgroundColor: c.soft },
  pills: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 6 },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
  },
  pillActive: { backgroundColor: c.ink, borderColor: c.ink },
  pillTextActive: { color: "#fff", fontSize: 15 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 18, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "600", lineHeight: 25, color: c.ink },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: c.accent,
  },
  lock: { padding: 18, borderRadius: 14, backgroundColor: "#e7efe8", gap: 8 },
  rank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  position: { fontSize: 22, fontWeight: "700", width: 24, color: c.ink },
  time: { fontSize: 13, fontVariant: ["tabular-nums"], color: c.ink },
  session: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    gap: 12,
  },
  smallButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  link: { fontSize: 13, color: c.accent, fontWeight: "600" },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  nav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: c.card,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    gap: 5,
  },
  navIcon: { fontSize: 23, color: c.muted },
  error: { color: "#9c3020", padding: 12, fontSize: 13 },
});
