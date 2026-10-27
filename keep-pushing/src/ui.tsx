import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { api, hasApi } from "./api.mjs";
import { articleVisible, setProtected } from "./model.mjs";
import { DEFAULT_ACCENT, accentFor, mix, readableOn, tint } from "./teams.mjs";
import { type Row, useStore } from "./store";

const light = {
  bg: "#f5f6f8",
  card: "#ffffff",
  ink: "#202631",
  muted: "#626c79",
  accent: DEFAULT_ACCENT,
  accentBg: DEFAULT_ACCENT, // fond des boutons (texte blanc)
  line: "#dce0e6",
  soft: tint(DEFAULT_ACCENT),
  green: "#2e6746",
  chip: "#e8ebef",
  lock: "#e7efe8",
  lockOn: "#e4eee6",
  warn: "#fbeedd",
  error: "#9c3020",
  hero: "#202631",
};
const dark = {
  ...light,
  bg: "#0e1115",
  card: "#181c22",
  ink: "#e9ecf0",
  muted: "#a1abb8",
  line: "#2c333d",
  green: "#7cc99a",
  chip: "#232932",
  lock: "#17251c",
  lockOn: "#1d3324",
  warn: "#3a2a14",
  error: "#ff8f7a",
  hero: "#1f252e",
};
export const formatDate = (date: string | number) =>
  new Date(date).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// Thème aux couleurs de « mon écurie », clair ou sombre (réglage ou système).
// team(id) : couleur d'une écurie lisible sur le fond du thème.
export function useTheme() {
  const { prefs } = useStore();
  const system = useColorScheme();
  const isDark = prefs.theme === "dark" || (prefs.theme === "auto" && system === "dark");
  return useMemo(() => {
    const base = accentFor(prefs.myTeam);
    if (!isDark) {
      const c = { ...light, accent: base, accentBg: base, soft: tint(base) };
      return { c, s: makeStyles(c), dark: false, team: (id: string) => accentFor(id) };
    }
    const soft = mix(base, dark.card, 0.75);
    const c = { ...dark, accentBg: base, soft, accent: readableOn(base, soft) };
    // Repère un peu plus clair que les cartes : lisible aussi sur les lignes surlignées.
    const team = (id: string) => readableOn(accentFor(id), "#262c35");
    return { c, s: makeStyles(c), dark: true, team };
  }, [prefs.myTeam, isDark]);
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
  const { c, s, dark } = useTheme();
  const { prefs, season, error, inbox } = useStore();
  const router = useRouter();
  const friendRequests = inbox.items.filter((n) => !n.read && n.key.startsWith("friend:")).length;
  const protectedAny = prefs.protectedSessions.length > 0;
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={s.header}>
        <View>
          <Text style={s.brand}>
            Keep <Text style={{ color: c.accent }}>Pushing.</Text>
          </Text>
          <Text style={s.small}>La F1 à votre rythme.</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {!!prefs.account && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Amis : ${friendRequests} nouveauté(s)`}
              onPress={() => router.push("/friends")}
              style={[s.shield, { minWidth: 52 }]}
            >
              <Text style={{ color: c.ink }}>👥</Text>
              <Text style={[s.tiny, friendRequests > 0 && { color: c.accent, fontWeight: "700" }]}>
                {friendRequests > 0 ? `${friendRequests} nouv.` : "Amis"}
              </Text>
            </Pressable>
          )}
          {!!prefs.account && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications : ${inbox.unread} non lue(s)`}
              onPress={() => router.push("/notifications")}
              style={[s.shield, { minWidth: 52 }]}
            >
              <Text style={{ color: c.ink }}>🔔</Text>
              <Text style={[s.tiny, inbox.unread > 0 && { color: c.accent, fontWeight: "700" }]}>
                {inbox.unread > 0 ? `${inbox.unread} nouv.` : "Notifs"}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gérer l’anti-spoil"
            onPress={() => router.navigate("/settings")}
            style={[s.shield, protectedAny && { backgroundColor: c.lockOn }]}
          >
            <Text style={{ color: protectedAny ? c.green : c.ink }}>◈</Text>
            <Text style={s.tiny}>{protectedAny ? "Protégé" : "Anti-spoil"}</Text>
          </Pressable>
        </View>
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
export function SourceBadge({
  kind,
  lang,
  translated,
}: {
  kind?: keyof typeof BADGES;
  lang?: string;
  translated?: boolean;
}) {
  const { s } = useTheme();
  if (!kind) return null;
  const [label, color, bg] = BADGES[kind];
  return (
    <View style={s.badgeRow}>
      <Text style={[s.badge, { color, backgroundColor: bg }]}>{label}</Text>
      {translated ? (
        <Text style={[s.badge, s.badgeLang]}>TRADUIT DE L’ANGLAIS</Text>
      ) : (
        lang && lang !== "FR" && <Text style={[s.badge, s.badgeLang]}>{lang}</Text>
      )}
    </View>
  );
}

// Classement d'une session, ou verrou si elle est protégée.
export function ResultRows({ sessionId }: { sessionId: string }) {
  // Essais libres : servis par le serveur s'il a un fournisseur configuré.
  const [extra, setExtra] = useState<Row[] | undefined>(undefined);
  const [extraState, setExtraState] = useState<"idle" | "loading" | "done">("idle");
  useEffect(() => {
    setExtra(undefined);
    if (!hasApi() || !/:(First|Second|Third)Practice$|:SprintQualifying$/.test(sessionId)) return;
    setExtraState("loading");
    api(`/api/practice/${sessionId}`)
      .then((d) => d.available && setExtra(d.rows))
      .catch(() => {})
      .finally(() => setExtraState("done"));
  }, [sessionId]);
  const { c, s } = useTheme();
  const { prefs, setPrefs, season } = useStore();
  const router = useRouter();
  if (prefs.protectedSessions.includes(sessionId))
    return (
      <View style={s.lock}>
        <Text style={s.cardTitle}>Session protégée</Text>
        <Text style={s.text}>Regardez-la à votre rythme. Son résultat reste masqué.</Text>
        <Button
          label="J’ai regardé cette session"
          onPress={() =>
            // Course et sprint : révélation du podium ; autres sessions : déblocage direct.
            /:(Race|Sprint)$/.test(sessionId)
              ? router.push(`/reveal/${encodeURIComponent(sessionId)}`)
              : setPrefs((p) => setProtected(p, sessionId, false))
          }
          secondary
        />
      </View>
    );
  const session = season.events.flatMap((e) => e.sessions).find((x) => x.id === sessionId);
  const practice = !!session && /Practice|SprintQualifying/.test(session.type);
  const rows = season.results[sessionId] ?? extra;
  if (!rows?.length) {
    const message =
      !session || Date.parse(session.startsAt) > Date.now()
        ? "Session à venir."
        : practice
          ? extraState === "loading"
            ? "Chargement des résultats…"
            : "Résultats des essais pas encore disponibles dans Keep Pushing : notre source de données actuelle ne les publie pas. Ils arriveront avec une source officielle."
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

const makeStyles = (c: typeof light) =>
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
      backgroundColor: c.chip,
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
      backgroundColor: c.hero,
      padding: 22,
      borderRadius: 14,
      gap: 8,
      marginTop: 8,
    },
    heroLabel: { fontSize: 11, letterSpacing: 1, color: "#f3d5c8" },
    heroTitle: { fontSize: 25, fontWeight: "700", color: "#fff" },
    heroText: { fontSize: 14, color: "#e5e8ed" },
    button: {
      backgroundColor: c.accentBg,
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
    pillTextActive: { color: c.bg, fontSize: 15 },
    card: { backgroundColor: c.card, borderRadius: 14, padding: 18, gap: 8 },
    cardSummary: { fontSize: 14, lineHeight: 20, color: c.muted },
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
    mine: {
      backgroundColor: c.soft,
      marginHorizontal: -10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    lock: { padding: 18, borderRadius: 14, backgroundColor: c.lock, gap: 8 },
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
    error: { color: c.error, padding: 12, fontSize: 13 },
  });

// Choix d'un pilote : pastilles aux couleurs des écuries.
export function DriverPicker({ onPick }: { onPick: (id: string) => void }) {
  const { s, team } = useTheme();
  const { season } = useStore();
  return (
    <View style={s.pills}>
      {season.drivers.map((d) => (
        <Pressable
          key={d.id}
          accessibilityRole="button"
          accessibilityLabel={d.name}
          onPress={() => onPick(d.id)}
          style={[s.pill, { borderColor: team(d.teamId) }]}
        >
          <Text style={[s.text, { color: team(d.teamId) }]}>{d.name.split(" ").at(-1)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Actus liées à un pilote ou une écurie (tags), sans spoiler ni rumeur masquée.
export function RelatedNews({ tags }: { tags: string[] }) {
  const { s } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const list = season.articles
    .filter((a) => a.tags.some((t: string) => tags.includes(t)) && articleVisible(a, prefs, false))
    .slice(0, 6);
  if (!list.length) return null;
  return (
    <>
      <Text style={s.heading}>Actualités</Text>
      {list.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="link"
          onPress={() => router.push(`/article/${a.id}`)}
          style={s.card}
        >
          <SourceBadge kind={a.kind} lang={a.lang} translated={!!a.translatedFrom} />
          <Text style={s.cardTitle}>{a.title}</Text>
          {!!a.source && <Text style={s.small}>{a.source}</Text>}
        </Pressable>
      ))}
    </>
  );
}

// 1er, 2e, 3e…
export const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

// Appel authentifié ; une session expirée déconnecte l'appareil.
export function useCall() {
  const { prefs, update } = useStore();
  return useCallback(
    async (path: string, options: { method?: string; body?: unknown } = {}) => {
      try {
        return await api(path, { ...options, token: prefs.account?.token });
      } catch (e) {
        if ((e as { status?: number }).status === 401) update({ account: null });
        throw e;
      }
    },
    [prefs.account?.token],
  );
}
