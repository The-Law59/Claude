import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { loadDriverSeason } from "../../src/jolpica.mjs";
import { setMine } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, RelatedNews, Screen, ordinal, useTheme } from "../../src/ui";

type Season = Awaited<ReturnType<typeof loadDriverSeason>>;

// Fiche pilote : classement, forme récente, saison GP par GP, actus liées.
export default function Driver() {
  const { s, c, team } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prefs, setPrefs, season } = useStore();
  const router = useRouter();
  const driver = season.drivers.find((d) => d.id === id);
  const [data, setData] = useState<Season | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!driver || season.mode !== "live") return;
    loadDriverSeason(driver.id)
      .then(setData)
      .catch(() => setError("Résultats indisponibles pour le moment."));
  }, [driver?.id]);
  const back = (
    <Button
      label="← Retour"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/season"))}
      secondary
    />
  );
  if (!driver)
    return (
      <Screen>
        {back}
        <Text style={s.text}>Pilote introuvable.</Text>
      </Screen>
    );
  const color = team(driver.teamId);
  const rank = [...season.drivers].sort((a, b) => b.points - a.points).indexOf(driver) + 1;
  const hidden = prefs.protectedSessions.length > 0;
  const races = (data ?? []).filter((r) => r.race);
  const stat = (label: string, value: string | number) => (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={[s.cardTitle, { color }]}>{value}</Text>
      <Text style={s.small}>{label}</Text>
    </View>
  );
  const pos = (n?: number, dnf?: boolean) => (dnf ? "Ab." : n ? ordinal(n) : "—");
  return (
    <Screen>
      {back}
      <Text style={[s.label, { color }]}>PILOTE · {driver.team.toUpperCase()}</Text>
      <Text style={s.title}>{driver.name}</Text>
      {hidden ? (
        <View style={s.lock}>
          <Text style={s.text}>
            Statistiques masquées : elles dévoileraient une session protégée.
          </Text>
        </View>
      ) : (
        <>
          <View style={[s.card, { flexDirection: "row" }]}>
            {stat("au championnat", ordinal(rank))}
            {stat("points", driver.points)}
            {stat("victoires", races.filter((r) => r.race === 1).length)}
            {stat("podiums", races.filter((r) => !r.dnf && r.race! <= 3).length)}
          </View>
          {!!error && <Text style={s.error}>{error}</Text>}
          {data && (
            <>
              <Text style={s.heading}>Forme : 5 derniers GP</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {races.slice(-5).map((r) => (
                  <View
                    key={r.round}
                    style={[s.card, { flex: 1, alignItems: "center", padding: 10 }]}
                  >
                    <Text style={[s.cardTitle, r.race! <= 3 && !r.dnf && { color }]}>
                      {pos(r.race, r.dnf)}
                    </Text>
                    <Text style={s.small} numberOfLines={1}>
                      {r.name.replace(" Grand Prix", "").slice(0, 8)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={s.heading}>Saison GP par GP</Text>
              <Text style={s.small}>Qualifications · course (Ab. = abandon)</Text>
              <View style={s.card}>
                {data.map((r) => (
                  <View key={r.round} style={s.rank}>
                    <Text style={[s.small, { width: 28 }]}>{r.round}</Text>
                    <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                      {r.name.replace(" Grand Prix", "")}
                    </Text>
                    <Text style={s.time}>
                      {pos(r.quali)} · {pos(r.race, r.dnf)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
      <Button
        label="⚔ Comparer avec un autre pilote"
        secondary
        onPress={() => router.push(`/duel?a=${driver.id}`)}
      />
      <Button
        label={`Voir l’écurie ${driver.team}`}
        secondary
        onPress={() => router.push(`/team/${driver.teamId}`)}
      />
      {prefs.myDriver !== driver.id && (
        <Button
          label="★ En faire mon pilote"
          secondary
          onPress={() => setPrefs((p) => setMine(p, "myDriver", driver.id))}
        />
      )}
      <RelatedNews tags={[driver.id]} />
      <Text style={[s.small, { color: c.muted }]}>Résultats : API publique Jolpica.</Text>
    </Screen>
  );
}
