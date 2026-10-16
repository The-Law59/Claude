import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { loadTeamSeason } from "../src/jolpica.mjs";
import { teamDuel } from "../src/model.mjs";
import { useStore } from "../src/store";
import { Button, Screen, ordinal, useTheme } from "../src/ui";

type Season = Awaited<ReturnType<typeof loadTeamSeason>>;
type Row = Season[number];
type DuelResult = {
  rounds: { round: number; name: string; a: Row; b: Row }[];
  ahead: [number, number];
  podiums: [number, number];
  best: [number, number];
};

// Deux écuries face à face sur la saison : points GP par GP, podiums.
export default function TeamsDuel() {
  const { s, c, team } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const ranked = [...season.teams].sort((x, y) => y.points - x.points);
  const firstA = params.a ?? (prefs.myTeam || ranked[0]?.id || "");
  // Par défaut : l'écurie juste devant (ou derrière) au championnat.
  const i = ranked.findIndex((t) => t.id === firstA);
  const [aId, setA] = useState(firstA);
  const [bId, setB] = useState(params.b ?? ranked[i > 0 ? i - 1 : i + 1]?.id ?? "");
  const [editing, setEditing] = useState<"a" | "b" | null>(null);
  const [data, setData] = useState<[Season, Season] | null>(null);
  const [error, setError] = useState("");
  const A = season.teams.find((t) => t.id === aId);
  const B = season.teams.find((t) => t.id === bId);
  useEffect(() => {
    setData(null);
    setError("");
    if (!A || !B || season.mode !== "live") return;
    let current = true;
    Promise.all([loadTeamSeason(A.id), loadTeamSeason(B.id)])
      .then((d) => current && setData(d))
      .catch(() => current && setError("Résultats indisponibles pour le moment."));
    return () => {
      current = false;
    };
  }, [A?.id, B?.id]);
  const back = (
    <Button
      label="← Retour"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/season"))}
      secondary
    />
  );
  if (prefs.protectedSessions.length > 0)
    return (
      <Screen>
        {back}
        <View style={s.lock}>
          <Text style={s.text}>Duel masqué : il dévoilerait une session protégée.</Text>
        </View>
      </Screen>
    );
  const pick = (id: string) => {
    if (editing === "a") id === bId ? (setB(aId), setA(id)) : setA(id);
    else id === aId ? (setA(bId), setB(id)) : setB(id);
    setEditing(null);
  };
  const colorA = team(aId);
  const colorB = team(bId);
  const d = data && (teamDuel(...data) as DuelResult);
  const Side = ({ side, t }: { side: "a" | "b"; t?: (typeof season.teams)[number] }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => setEditing(editing === side ? null : side)}
      style={[
        s.card,
        { flex: 1, gap: 2 },
        editing === side && { borderWidth: 2, borderColor: c.accent },
      ]}
    >
      <Text style={[s.cardTitle, { color: side === "a" ? colorA : colorB }]}>
        {t?.name ?? "Choisir"}
      </Text>
      <Text style={s.small}>{t ? `${t.points} pts` : ""}</Text>
      <Text style={s.link}>Changer</Text>
    </Pressable>
  );
  const Bar = ({
    title,
    values,
    lowerWins = false,
    format = String,
  }: {
    title: string;
    values: [number, number];
    lowerWins?: boolean;
    format?: (v: number) => string;
  }) => {
    const [a, b] = values;
    const lead = a === b ? 0 : (lowerWins ? a < b : a > b) ? 1 : -1;
    const share = lowerWins || a + b === 0 ? 0.5 : a / (a + b);
    return (
      <View style={{ gap: 6 }}>
        <Text style={s.small}>{title}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[s.cardTitle, lead === 1 && { color: colorA }]}>{format(a)}</Text>
          <Text style={[s.cardTitle, lead === -1 && { color: colorB }]}>{format(b)}</Text>
        </View>
        {!lowerWins && (
          <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ flex: share, backgroundColor: colorA }} />
            <View style={{ flex: 1 - share, backgroundColor: colorB }} />
          </View>
        )}
      </View>
    );
  };
  return (
    <Screen>
      {back}
      <Text style={s.label}>DUEL D’ÉCURIES</Text>
      {A && B && (
        <Text style={s.title}>
          {A.name} <Text style={{ color: c.muted }}>vs</Text> {B.name}
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Side side="a" t={A} />
        <Side side="b" t={B} />
      </View>
      {editing && (
        <View style={s.pills}>
          {ranked.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => pick(t.id)}
              style={[s.pill, { borderColor: team(t.id) }]}
            >
              <Text style={[s.text, { color: team(t.id) }]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
      {!A || !B ? (
        <Text style={s.small}>Choisissez deux écuries.</Text>
      ) : !d ? (
        !error && <Text style={s.small}>Chargement de la saison…</Text>
      ) : (
        <>
          <View style={[s.card, { gap: 16 }]}>
            <Bar title="GP où elle a marqué le plus de points" values={d.ahead} />
            <Bar title="Points au championnat" values={[A.points, B.points]} />
            <Bar title="Podiums" values={d.podiums} />
            <Bar
              title="Meilleure place en course"
              values={d.best}
              lowerWins
              format={(v) => (Number.isFinite(v) ? ordinal(v) : "—")}
            />
          </View>
          <Text style={s.heading}>Grand Prix par Grand Prix</Text>
          <Text style={s.small}>Points marqués (course + sprint)</Text>
          <View style={s.card}>
            {d.rounds.map((r) => (
              <View key={r.round} style={s.rank}>
                <Text style={[s.small, { width: 28 }]}>{r.round}</Text>
                <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                  {r.name.replace(" Grand Prix", "")}
                </Text>
                <Text
                  style={[
                    s.time,
                    { width: 56, textAlign: "right" },
                    r.a.points > r.b.points && { color: colorA, fontWeight: "700" },
                  ]}
                >
                  {r.a.points}
                </Text>
                <Text
                  style={[
                    s.time,
                    { width: 56, textAlign: "right" },
                    r.b.points > r.a.points && { color: colorB, fontWeight: "700" },
                  ]}
                >
                  {r.b.points}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
