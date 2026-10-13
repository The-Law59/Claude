import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { setProtected } from "./model.mjs";
import { DEFAULT_ACCENT, accentFor, tint } from "./teams.mjs";
import { useStore } from "./store";

const base = {
  bg: "#f5f6f8",
  card: "#ffffff",
  ink: "#202631",
  muted: "#626c79",
  accent: DEFAULT_ACCENT,
  line: "#dce0e6",
  soft: tint(DEFAULT_ACCENT),
  green: "#2e6746",
};
export const formatDate = (date: string | number) =>
  new Date(date).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// Thème aux couleurs de « mon écurie » ; recalculé seulement quand elle change.
export function useTheme() {
  const { prefs } = useStore();
  return useMemo(() => {
    const accent = accentFor(prefs.myTeam);
    const c = { ...base, accent, soft: tint(accent) };
    return { c, s: makeStyles(c) };
  }, [prefs.myTeam]);
}

export function Button({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  const { c, s } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.button, secondary && s.secondary]}
    >
      <Text style={[s.buttonText, secondary && { color: c.accent }]}>{label}</Text>
    </Pressable>
  );
}
export function Toggle({
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
  const { c, s } = useTheme();
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
        thumbColor="#fff"
        {...{ activeThumbColor: "#fff" }} // prop web uniquement
        trackColor={{ true: c.accent, false: c.line }}
      />
    </View>
  );
}
export function Pills<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  const { c, s } = useTheme();
  return (
    <View style={s.pills}>
      {options.map(([id, label]) => (
        <Pressable
          key={String(id)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === id }}
          onPress={() => onChange(id)}
          style={[s.pill, value === id && s.pillActive]}
        >
          <Text style={value === id ? s.pillTextActive : s.text}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// En-tête commun : marque, bouclier anti-spoil, origine des données.
export function Screen({ children }: { children: React.ReactNode }) {
  const { c, s } = useTheme();
  const { prefs, season, error } = useStore();
  const router = useRouter();
  const protectedAny = prefs.protectedSessions.length > 0;
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
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
          onPress={() => router.navigate("/settings")}
          style={[s.shield, protectedAny && { backgroundColor: "#e4eee6" }]}
        >
          <Text style={{ color: protectedAny ? c.green : c.ink }}>◈</Text>
          <Text style={s.tiny}>{protectedAny ? "Protégé" : "Anti-spoil"}</Text>
        </Pressable>
      </View>
      <View style={s.demo}>
        <Text style={s.tiny}>
          {season.mode === "live"
            ? "CALENDRIER ET RÉSULTATS · JOLPICA F1"
            : "DÉMONSTRATION · DONNÉES FICTIVES"}
        </Text>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

// Fiabilité de la source, toujours visible : vert = officiel, orange = non officiel.
const BADGES = {
  official: ["✓ OFFICIEL", "#1d6b3a", "#e3f1e7"],
  press: ["PRESSE", "#3d4552", "#e8ebef"],
  unofficial: ["⚠ NON OFFICIEL", "#8a4b00", "#fbeedd"],
} as const;
export function SourceBadge({ kind, lang }: { kind?: keyof typeof BADGES; lang?: string }) {
  const { s } = useTheme();
  if (!kind) return null;
  const [label, color, bg] = BADGES[kind];
  return (
    <View style={s.badgeRow}>
      <Text style={[s.badge, { color, backgroundColor: bg }]}>{label}</Text>
      {lang && lang !== "FR" && <Text style={[s.badge, s.badgeLang]}>{lang}</Text>}
    </View>
  );
}

// Classement d'une session, ou verrou si elle est protégée.
export function ResultRows({ sessionId }: { sessionId: string }) {
  const { c, s } = useTheme();
  const { prefs, setPrefs, season } = useStore();
  if (prefs.protectedSessions.includes(sessionId))
    return (
      <View style={s.lock}>
        <Text style={s.cardTitle}>Session protégée</Text>
        <Text style={s.text}>Regardez-la à votre rythme. Son résultat reste masqué.</Text>
        <Button
          label="J’ai regardé cette session"
          onPress={() => setPrefs((p) => setProtected(p, sessionId, false))}
          secondary
        />
      </View>
    );
  const rows = season.results[sessionId];
  if (!rows?.length) {
    const session = season.events.flatMap((e) => e.sessions).find((x) => x.id === sessionId);
    const message = !session || Date.parse(session.startsAt) > Date.now()
      ? "Session à venir."
      : /Practice|SprintQualifying/.test(session.type)
        ? "Pas de classement disponible pour cette session."
        : "Chargement des résultats…";
    return (
      <View style={s.card}>
        <Text style={s.text}>{message}</Text>
      </View>
    );
  }
  return (
    <View style={s.card}>
      {rows.map((r) => (
        <View style={[s.rank, r.driverId === prefs.myDriver && s.mine]} key={r.position}>
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
}

const makeStyles = (c: typeof base) =>
  StyleSheet.create({
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
  badgeRow: { flexDirection: "row", gap: 6 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  badgeLang: { color: c.muted, backgroundColor: c.line },
  mine: { backgroundColor: c.soft, marginHorizontal: -10, paddingHorizontal: 10, borderRadius: 8 },
  lock: { padding: 18, borderRadius: 14, backgroundColor: "#e7efe8", gap: 8 },
  rank: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  position: { fontSize: 22, fontWeight: "700", width: 32, color: c.ink },
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
  error: { color: "#9c3020", padding: 12, fontSize: 13 },
});
