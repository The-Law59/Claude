import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  contenders,
  defaultPicks,
  maxLeft,
  pointsFor,
  remaining,
  setPlace,
  simulate,
} from "../src/simulator.mjs";
import { useStore } from "../src/store";
import { Button, Screen, useTheme } from "../src/ui";

const OUT = 11; // hors des points
type Driver = ReturnType<typeof useStore>["season"]["drivers"][number];
type Race = { id: string; type: string; name: string };
type Picks = Record<string, Record<string, number>>;

// « Et si… » : on choisit la place des prétendants au titre sur chaque course
// et sprint restants, le classement final se recalcule.
export default function Simulator() {
  const { s, c, team } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const rem: Race[] = useMemo(() => remaining(season.events), [season.events]);
  const rivals: Driver[] = useMemo(() => contenders(season.drivers, rem), [season.drivers, rem]);
  const [picks, setPicks] = useState<Picks>(() =>
    defaultPicks(
      rem,
      rivals.map((d) => d.id),
    ),
  );
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
          <Text style={s.text}>Simulateur masqué : il dévoilerait le classement actuel.</Text>
        </View>
      </Screen>
    );
  const final: (Driver & { gained: number; total: number })[] = simulate(rivals, rem, picks);
  const [first, second] = final;
  const last = (name: string) => name.split(" ").at(-1);
  const winsAll = (id: string) =>
    setPicks((p) => rem.reduce((acc, x) => setPlace(acc, x.id, id, 1), p));
  return (
    <Screen>
      {back}
      <Text style={s.label}>SIMULATEUR DE CHAMPIONNAT</Text>
      <Text style={s.title}>Et si… ?</Text>
      <Text style={s.subtitle}>
        {rem.filter((x) => x.type === "Race").length} courses et{" "}
        {rem.filter((x) => x.type === "Sprint").length} sprints restants · {maxLeft(rem)} points en
        jeu au maximum par pilote.
      </Text>
      {rivals.length < 2 ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>
            🏆 {rivals[0]?.name ?? "—"} est déjà champion : plus personne ne peut le rattraper.
          </Text>
        </View>
      ) : (
        <>
          <View style={[s.card, { borderWidth: 2, borderColor: team(first.teamId) }]}>
            <Text style={s.label}>CLASSEMENT FINAL SIMULÉ</Text>
            <Text style={s.cardTitle}>
              🏆 {first.name} champion
              {first.total === second.total ? " (égalité : départage aux victoires)" : ""}
            </Text>
            {final.map((d, i) => (
              <View key={d.id} style={s.rank}>
                <Text style={s.position}>{i + 1}</Text>
                <Text style={[s.text, { flex: 1, color: team(d.teamId) }]}>{d.name}</Text>
                <Text style={s.small}>+{d.gained}</Text>
                <Text style={[s.time, { width: 70, textAlign: "right" }]}>{d.total} pts</Text>
              </View>
            ))}
            <Text style={s.small}>
              Seuls les pilotes encore mathématiquement en lice sont simulés. Places par défaut :
              l’ordre actuel du championnat.
            </Text>
          </View>
          <Text style={s.heading}>Raccourcis</Text>
          <View style={s.pills}>
            {rivals.map((d) => (
              <Button
                key={d.id}
                label={`${last(d.name)} gagne tout`}
                secondary
                onPress={() => winsAll(d.id)}
              />
            ))}
            <Button
              label="Réinitialiser"
              secondary
              onPress={() =>
                setPicks(
                  defaultPicks(
                    rem,
                    rivals.map((d) => d.id),
                  ),
                )
              }
            />
          </View>
          {rem.map((x) => (
            <View key={x.id} style={s.card}>
              <Text style={s.label}>
                {x.name.replace(" Grand Prix", "").toUpperCase()} ·{" "}
                {x.type === "Sprint" ? "SPRINT" : "COURSE"}
              </Text>
              {rivals.map((d) => {
                const place = picks[x.id]?.[d.id] ?? OUT;
                const move = (delta: number) =>
                  setPicks((p) =>
                    setPlace(p, x.id, d.id, Math.min(OUT, Math.max(1, place + delta))),
                  );
                return (
                  <View key={d.id} style={[s.rank, { gap: 8 }]}>
                    <Text style={[s.text, { flex: 1, color: team(d.teamId) }]}>{last(d.name)}</Text>
                    <Button label="−" secondary onPress={() => move(-1)} />
                    <Text style={[s.cardTitle, { width: 52, textAlign: "center" }]}>
                      {place >= OUT ? "—" : `P${place}`}
                    </Text>
                    <Button label="+" secondary onPress={() => move(1)} />
                    <Text style={[s.time, { width: 40, textAlign: "right", color: c.muted }]}>
                      +{pointsFor(x.type, place)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
          <Text style={s.small}>
            Barème officiel : course 25-18-15-12-10-8-6-4-2-1, sprint 8 à 1. « — » = hors des
            points.
          </Text>
        </>
      )}
    </Screen>
  );
}
