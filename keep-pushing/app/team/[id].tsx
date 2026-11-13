import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { loadTeamSeason } from "../../src/jolpica.mjs";
import { setMine } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, RelatedNews, Screen, ordinal, useTheme } from "../../src/ui";

type Season = Awaited<ReturnType<typeof loadTeamSeason>>;

// Fiche écurie : classement, pilotes, points GP par GP, actus liées.
export default function Team() {
  const { s, team: teamColor } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prefs, setPrefs, season } = useStore();
  const router = useRouter();
  const team = season.teams.find((t) => t.id === id);
  const drivers = season.drivers.filter((d) => d.teamId === id);
  const [data, setData] = useState<Season | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!team || season.mode !== "live") return;
    loadTeamSeason(team.id)
      .then(setData)
      .catch(() => setError("Résultats indisponibles pour le moment."));
  }, [team?.id]);
  const back = (
    <Button
      label="← Retour"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/season"))}
      secondary
    />
  );
  if (!team)
    return (
      <Screen>
        {back}
        <Text style={s.text}>Écurie introuvable.</Text>
      </Screen>
    );
  const color = teamColor(team.id);
  const rank = [...season.teams].sort((a, b) => b.points - a.points).indexOf(team) + 1;
  const hidden = prefs.protectedSessions.length > 0;
  const max = Math.max(1, ...(data ?? []).map((r) => r.points));
  return (
    <Screen>
      {back}
      <Text style={[s.label, { color }]}>ÉCURIE</Text>
      <Text style={s.title}>{team.name}</Text>
      {hidden ? (
        <View style={s.lock}>
          <Text style={s.text}>
            Statistiques masquées : elles dévoileraient une session protégée.
          </Text>
        </View>
      ) : (
        <>
          <View style={[s.card, { flexDirection: "row" }]}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.cardTitle, { color }]}>{ordinal(rank)}</Text>
              <Text style={s.small}>au championnat</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.cardTitle, { color }]}>{team.points}</Text>
              <Text style={s.small}>points</Text>
            </View>
          </View>
          <Text style={s.heading}>Pilotes</Text>
          <View style={s.card}>
            {drivers.map((d) => (
              <Pressable
                key={d.id}
                accessibilityRole="link"
                onPress={() => router.push(`/driver/${d.id}`)}
                style={s.rank}
              >
                <Text style={[s.text, { flex: 1, color }]}>{d.name}</Text>
                <Text style={s.time}>{d.points} pts ›</Text>
              </Pressable>
            ))}
          </View>
          {drivers.length >= 2 && (
            <Button
              label="⚔ Duel des pilotes de l’écurie"
              secondary
              onPress={() => router.push(`/duel?a=${drivers[0].id}&b=${drivers[1].id}`)}
            />
          )}
          {!!error && <Text style={s.error}>{error}</Text>}
          {data && (
            <>
              <Text style={s.heading}>Points GP par GP</Text>
              <Text style={s.small}>Course + sprint · meilleure place en course</Text>
              <View style={s.card}>
                {data.map((r) => (
                  <View key={r.round} style={{ gap: 4, paddingVertical: 4 }}>
                    <View style={{ flexDirection: "row" }}>
                      <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                        {r.name.replace(" Grand Prix", "")}
                      </Text>
                      <Text style={s.time}>
                        {r.points} pts · {r.best ? ordinal(r.best) : "—"}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: `${(r.points / max) * 100}%`,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: color,
                      }}
                    />
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
      <Button
        label="⚔ Comparer avec une autre écurie"
        secondary
        onPress={() => router.push(`/teams-duel?a=${team.id}`)}
      />
      {prefs.myTeam !== team.id && (
        <Button
          label="★ En faire mon écurie"
          secondary
          onPress={() => setPrefs((p) => setMine(p, "myTeam", team.id))}
        />
      )}
      <RelatedNews tags={[team.id, ...drivers.map((d) => d.id)]} />
    </Screen>
  );
}
