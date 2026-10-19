import { useCallback, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Button, Screen, formatDate, useCall, useTheme } from "../src/ui";

type Stats = {
  players: { total: number; active7: number; active30: number; new7: number };
  signups: { week: string; count: number }[];
  bets: { eventId: string; name: string; round: number; players: number }[];
  forum: { topics: number; posts: number; posts7: number; reported: number };
  leagues: { count: number; members: number; messages7: number };
  feedback: { count: number; average: number | null };
  errors: { total: number; last24h: number };
  health: { ok: boolean; version: string; uptime: number; checks: Record<string, string> };
  latestErrors: {
    signature: string;
    source: string;
    message: string;
    where: string;
    platform: string;
    count: number;
    last: number;
    stack: string;
  }[];
};
const EXPORTS: [string, string][] = [
  ["players", "Joueurs"],
  ["bets", "Paris"],
  ["feedback", "Avis"],
  ["errors", "Erreurs"],
];

// Tableau de bord des admins : l'appli prend-elle ? Le serveur va-t-il bien ?
export default function Admin() {
  const { s, c } = useTheme();
  const router = useRouter();
  const call = useCall();
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useFocusEffect(
    useCallback(() => {
      call("/api/admin/stats")
        .then(setData)
        .catch((e) => setError(e.message));
    }, [call]),
  );
  const download = async (type: string) => {
    try {
      const { filename, csv } = await call(`/api/admin/export/${type}`);
      if (Platform.OS === "web") {
        // BOM : accents corrects à l'ouverture dans Excel.
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else await Share.share({ message: csv, title: filename });
      setNotice(`${filename} prêt.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export impossible.");
    }
  };
  const back = (
    <Button
      label="← Retour"
      secondary
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
    />
  );
  if (!data)
    return (
      <Screen>
        {back}
        <Text style={error ? s.error : s.small}>{error || "Chargement…"}</Text>
      </Screen>
    );
  const tile = (value: string | number, label: string, color = c.ink) => (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={[s.cardTitle, { color }]}>{value}</Text>
      <Text style={[s.small, { textAlign: "center" }]}>{label}</Text>
    </View>
  );
  const bar = (label: string, value: number, max: number, right: string) => (
    <View key={label} style={{ gap: 4, paddingVertical: 3 }}>
      <View style={{ flexDirection: "row" }}>
        <Text style={[s.small, { flex: 1 }]}>{label}</Text>
        <Text style={s.time}>{right}</Text>
      </View>
      <View
        style={{
          width: `${max ? (value / max) * 100 : 0}%`,
          minWidth: value ? 4 : 0,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.accent,
        }}
      />
    </View>
  );
  const h = data.health;
  const hours = Math.floor(h.uptime / 3600);
  const maxSignup = Math.max(1, ...data.signups.map((w) => w.count));
  return (
    <Screen>
      {back}
      <Text style={s.title}>Tableau de bord.</Text>
      {!!error && <Text style={s.error}>{error}</Text>}

      <View style={[s.card, { borderWidth: 2, borderColor: h.ok ? c.green : c.error }]}>
        <Text style={s.label}>SERVEUR · VERSION {h.version}</Text>
        <Text style={s.cardTitle}>
          {h.ok ? "✓ En ligne" : "⚠ Problème"} · depuis{" "}
          {hours >= 24 ? `${Math.floor(hours / 24)} j` : `${hours} h`}
        </Text>
        <Text style={s.small}>
          Saison : {h.checks.season} · actus : {h.checks.news} · sauvegarde : {h.checks.save}
        </Text>
      </View>

      <Text style={s.heading}>Joueurs</Text>
      <View style={[s.card, { flexDirection: "row" }]}>
        {tile(data.players.total, "inscrits")}
        {tile(data.players.active7, "actifs 7 j", c.accent)}
        {tile(data.players.active30, "actifs 30 j")}
        {tile(`+${data.players.new7}`, "nouveaux 7 j")}
      </View>
      <View style={s.card}>
        <Text style={s.label}>INSCRIPTIONS PAR SEMAINE</Text>
        {data.signups.map((w) =>
          bar(
            `semaine du ${w.week.slice(8)}/${w.week.slice(5, 7)}`,
            w.count,
            maxSignup,
            String(w.count),
          ),
        )}
      </View>

      <Text style={s.heading}>Pronos</Text>
      <View style={s.card}>
        <Text style={s.label}>JOUEURS AYANT PARIÉ, PAR GP</Text>
        {data.bets.map((b) =>
          bar(
            `${b.round}. ${b.name.replace(" Grand Prix", "")}`,
            b.players,
            data.players.total,
            `${b.players} (${Math.round((b.players / Math.max(1, data.players.total)) * 100)} %)`,
          ),
        )}
        {!data.bets.length && <Text style={s.small}>Aucun pari cette saison.</Text>}
      </View>

      <Text style={s.heading}>Communauté</Text>
      <View style={[s.card, { flexDirection: "row" }]}>
        {tile(data.forum.topics, "sujets")}
        {tile(data.forum.posts7, "messages forum 7 j")}
        {tile(data.leagues.count, "ligues")}
        {tile(data.leagues.messages7, "messages ligues 7 j")}
      </View>
      <View style={[s.card, { flexDirection: "row" }]}>
        {tile(data.feedback.average ?? "—", `note moyenne (${data.feedback.count} avis)`, c.accent)}
        {tile(data.forum.reported, "messages signalés", data.forum.reported ? c.error : c.ink)}
      </View>
      <Button label="Voir les avis" secondary onPress={() => router.push("/feedback")} />

      <Text style={s.heading}>Erreurs</Text>
      <Text style={s.small}>
        {data.errors.last24h} sur les dernières 24 h · {data.errors.total} erreur
        {data.errors.total > 1 ? "s différentes gardées" : " gardée"}.
      </Text>
      {data.latestErrors.map((e) => (
        <Pressable
          key={e.signature}
          accessibilityRole="button"
          onPress={() => setOpen(open === e.signature ? null : e.signature)}
          style={s.card}
        >
          <Text style={s.label}>
            {e.source === "app"
              ? `APPLI${e.platform ? ` · ${e.platform.toUpperCase()}` : ""}`
              : "SERVEUR"}{" "}
            · {e.count}× · {formatDate(e.last)}
          </Text>
          <Text style={s.text} numberOfLines={open === e.signature ? undefined : 2}>
            {e.message}
          </Text>
          {!!e.where && <Text style={s.small}>{e.where}</Text>}
          {open === e.signature && !!e.stack && (
            <Text style={[s.small, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
              {e.stack}
            </Text>
          )}
        </Pressable>
      ))}
      {!data.latestErrors.length && <Text style={s.small}>Aucune erreur enregistrée. 🎉</Text>}

      <Text style={s.heading}>Exports CSV</Text>
      <View style={s.pills}>
        {EXPORTS.map(([type, label]) => (
          <Button key={type} label={`⬇ ${label}`} secondary onPress={() => download(type)} />
        ))}
      </View>
      {!!notice && <Text style={s.small}>{notice}</Text>}
      <Text style={s.small}>Séparateur « ; » : s’ouvre directement dans Excel ou LibreOffice.</Text>
    </Screen>
  );
}
