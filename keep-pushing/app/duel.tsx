import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { loadDriverSeason } from "../src/jolpica.mjs";
import { duel, teammateOf } from "../src/model.mjs";
import { useStore } from "../src/store";
import { Button, Screen, useTheme } from "../src/ui";

type Season = Awaited<ReturnType<typeof loadDriverSeason>>;
type Row = Season[number];
type Pair = [number, number];
type DuelResult = {
  rounds: { round: number; name: string; me: Row; mate: Row }[];
  race: Pair;
  quali: Pair;
  best: Pair;
};

// Mon pilote face à son coéquipier, sur la saison en cours.
export default function Duel() {
  const { s, c } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const me = season.drivers.find((d) => d.id === prefs.myDriver);
  const mate = teammateOf(season.drivers, prefs.myDriver);
  const [data, setData] = useState<[Season, Season] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!me || !mate || season.mode !== "live") return;
    Promise.all([loadDriverSeason(me.id), loadDriverSeason(mate.id)])
      .then(setData)
      .catch(() => setError("Résultats indisponibles pour le moment."));
  }, [me?.id, mate?.id]);
  const back = (
    <Button
      label="← Retour"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      secondary
    />
  );
  if (!me || !mate)
    return (
      <Screen>
        {back}
        <Text style={s.text}>Choisissez d’abord votre pilote dans Favoris.</Text>
      </Screen>
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
  const last = (name: string) => name.split(" ").at(-1);
  const Bar = ({ title, values, lowerWins = false, format = String }: {
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
          <Text style={[s.cardTitle, lead === 1 && { color: c.accent }]}>{format(a)}</Text>
          <Text style={[s.cardTitle, lead === -1 && { color: c.ink }]}>{format(b)}</Text>
        </View>
        {!lowerWins && (
          <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden" }}>
            <View style={{ flex: share, backgroundColor: c.accent }} />
            <View style={{ flex: 1 - share, backgroundColor: c.line }} />
          </View>
        )}
      </View>
    );
  };
  const pos = (n?: number, dnf?: boolean) => (dnf ? "Ab." : n ? `${n}e` : "—");
  return (
    <Screen>
      {back}
      <Text style={s.label}>DUEL DE COÉQUIPIERS · {me.team.toUpperCase()}</Text>
      <Text style={s.title}>
        {last(me.name)} <Text style={{ color: c.muted }}>vs</Text> {last(mate.name)}
      </Text>
      {!!error && <Text style={s.error}>{error}</Text>}
      {!d ? (
        !error && <Text style={s.small}>Chargement de la saison…</Text>
      ) : (
        <>
          <View style={[s.card, { gap: 16 }]}>
            <Bar title="Devant en course" values={d.race} />
            <Bar title="Devant en qualifications" values={d.quali} />
            <Bar title="Points au championnat" values={[me.points, mate.points]} />
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
              const won = r.me.race && r.mate.race && r.me.race < r.mate.race;
              return (
                <View key={r.round} style={s.rank}>
                  <Text style={[s.small, { width: 28 }]}>{r.round}</Text>
                  <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                    {r.name.replace(" Grand Prix", "")}
                  </Text>
                  <Text style={[s.time, won && { color: c.accent, fontWeight: "700" }]}>
                    {pos(r.me.quali)} · {pos(r.me.race, r.me.dnf)}
                  </Text>
                  <Text style={[s.time, { width: 84, textAlign: "right" }, !won && { fontWeight: "700" }]}>
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
