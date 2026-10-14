import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { loadDriverSeason } from "../src/jolpica.mjs";
import { duel, teammateOf } from "../src/model.mjs";
import { useStore } from "../src/store";
import { accentFor } from "../src/teams.mjs";
import { Button, DriverPicker, Screen, useTheme } from "../src/ui";

type Season = Awaited<ReturnType<typeof loadDriverSeason>>;
type Row = Season[number];
type Pair = [number, number];
type DuelResult = {
  rounds: { round: number; name: string; me: Row; mate: Row }[];
  race: Pair;
  quali: Pair;
  best: Pair;
};

// Duel de deux pilotes sur la saison : par défaut mon pilote face à son
// coéquipier, mais n'importe quels pilotes, même d'écuries différentes.
export default function Duel() {
  const { s, c } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const [aId, setA] = useState(params.a ?? (prefs.myDriver || season.drivers[0]?.id || ""));
  const [bId, setB] = useState(params.b ?? teammateOf(season.drivers, aId)?.id ?? "");
  const [editing, setEditing] = useState<"a" | "b" | null>(null);
  const me = season.drivers.find((d) => d.id === aId);
  const mate = season.drivers.find((d) => d.id === bId);
  const [data, setData] = useState<[Season, Season] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    setError("");
    if (!me || !mate || season.mode !== "live") return;
    let current = true;
    Promise.all([loadDriverSeason(me.id), loadDriverSeason(mate.id)])
      .then((d) => current && setData(d))
      .catch(() => current && setError("Résultats indisponibles pour le moment."));
    return () => {
      current = false;
    };
  }, [me?.id, mate?.id]);
  const pick = (id: string) => {
    // Choisir le pilote déjà en face : on inverse les deux.
    if (editing === "a") id === bId ? (setB(aId), setA(id)) : setA(id);
    else id === aId ? (setA(bId), setB(id)) : setB(id);
    setEditing(null);
  };
  const sameTeam = me && mate && me.teamId === mate.teamId;
  const colorA = me ? accentFor(me.teamId) : c.accent;
  const colorB = !mate ? c.muted : sameTeam ? c.ink : accentFor(mate.teamId);
  const Side = ({ side, id }: { side: "a" | "b"; id: string }) => {
    const d = season.drivers.find((x) => x.id === id);
    return (
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
          {d?.name ?? "Choisir"}
        </Text>
        <Text style={s.small}>{d?.team ?? ""}</Text>
        <Text style={s.link}>Changer</Text>
      </Pressable>
    );
  };
  const back = (
    <Button
      label="← Retour"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      secondary
    />
  );
  // Le duel dévoile des résultats : masqué comme les classements.
  if (prefs.protectedSessions.length > 0)
    return (
      <Screen>
        {back}
        <View style={s.lock}>
          <Text style={s.text}>Duel masqué : il dévoilerait une session protégée.</Text>
        </View>
      </Screen>
    );
  const d = data && (duel(...data) as DuelResult);
  const mateOfA = teammateOf(season.drivers, aId);
  const last = (name: string) => name.split(" ").at(-1);
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
            <View style={{ flex: 1 - share, backgroundColor: sameTeam ? c.line : colorB }} />
          </View>
        )}
      </View>
    );
  };
  const pos = (n?: number, dnf?: boolean) => (dnf ? "Ab." : n ? `${n}e` : "—");
  return (
    <Screen>
      {back}
      <Text style={s.label}>
        {sameTeam ? `DUEL DE COÉQUIPIERS · ${me.team.toUpperCase()}` : "DUEL DE PILOTES"}
      </Text>
      {me && mate && (
        <Text style={s.title}>
          {last(me.name)} <Text style={{ color: c.muted }}>vs</Text> {last(mate.name)}
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Side side="a" id={aId} />
        <Side side="b" id={bId} />
      </View>
      {editing && <DriverPicker onPick={pick} />}
      {mateOfA && bId !== mateOfA.id && (
        <Button
          label={`Face à son coéquipier (${last(mateOfA.name)})`}
          secondary
          onPress={() => setB(mateOfA.id)}
        />
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
      {!me || !mate ? (
        <Text style={s.small}>Choisissez deux pilotes.</Text>
      ) : !d ? (
        !error && <Text style={s.small}>Chargement de la saison…</Text>
      ) : (
        <>
          <View style={[s.card, { gap: 16 }]}>
            <Bar title="Devant en course" values={d.race} />
            <Bar title="Devant en qualifications" values={d.quali} />
            <Bar title="Points au championnat" values={[me!.points, mate!.points]} />
            <Bar
              title="Meilleur résultat"
              values={d.best}
              lowerWins
              format={(v) => (Number.isFinite(v) ? `${v}e` : "—")}
            />
          </View>
          <Text style={s.heading}>Grand Prix par Grand Prix</Text>
          <Text style={s.small}>Qualifications · course (Ab. = abandon)</Text>
          <View style={s.card}>
            {d.rounds.map((r) => {
              const won = !!r.me.race && !!r.mate.race && r.me.race < r.mate.race;
              return (
                <View key={r.round} style={s.rank}>
                  <Text style={[s.small, { width: 28 }]}>{r.round}</Text>
                  <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                    {r.name.replace(" Grand Prix", "")}
                  </Text>
                  <Text style={[s.time, won && { color: colorA, fontWeight: "700" }]}>
                    {pos(r.me.quali)} · {pos(r.me.race, r.me.dnf)}
                  </Text>
                  <Text
                    style={[
                      s.time,
                      { width: 84, textAlign: "right" },
                      !won && { fontWeight: "700" },
                    ]}
                  >
                    {pos(r.mate.quali)} · {pos(r.mate.race, r.mate.dnf)}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
