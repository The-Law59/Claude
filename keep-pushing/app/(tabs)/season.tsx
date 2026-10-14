import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, formatDate, useTheme } from "../../src/ui";

export default function Season() {
  const { s } = useTheme();
  const { prefs, season, focus } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"calendar" | "drivers" | "teams">("calendar");
  const mine = tab === "drivers" ? prefs.myDriver : prefs.myTeam;
  const standings: { id: string; name: string; points: number; team?: string }[] =
    tab === "drivers" ? season.drivers : season.teams;
  return (
    <Screen>
      <Text style={s.title}>La saison.</Text>
      <Pills
        options={[
          ["calendar", "Calendrier"],
          ["drivers", "Pilotes"],
          ["teams", "Écuries"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "calendar" ? (
        <>
          <Text style={s.small}>
            {season.events.length} Grands Prix · touchez un GP pour ses résultats, sa météo et sa fiche circuit
          </Text>
          {season.events.map((e) => {
            const race = e.sessions.at(-1)!;
            const hidden = e.sessions.some((x) => prefs.protectedSessions.includes(x.id));
            const upcoming = Date.parse(race.startsAt) > Date.now();
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                onPress={() => router.push(`/gp/${e.id}`)}
                style={[s.session, e.id === focus.current.id && s.mine]}
              >
                <Text style={s.position}>{e.round}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.text}>{e.name}</Text>
                  <Text style={s.small}>
                    {formatDate(race.startsAt)}
                    {!upcoming && e.winner && !hidden ? ` · 🏆 ${e.winner.name}` : ""}
                  </Text>
                </View>
                <Text style={s.link}>
                  {hidden ? "Protégé" : upcoming ? "À venir" : "Résultats →"}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : prefs.protectedSessions.length > 0 ? (
        <View style={s.lock}>
          <Text style={s.cardTitle}>Classement masqué</Text>
          <Text style={s.text}>Il pourrait révéler le résultat d’une session protégée.</Text>
          <Button
            label="Gérer les sessions"
            onPress={() => router.navigate("/settings")}
            secondary
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>{season.mode === "live" ? "CHAMPIONNAT" : "POINTS FICTIFS"}</Text>
          {standings.map((x, i) => (
            <Pressable
              key={x.id}
              accessibilityRole="link"
              onPress={() =>
                season.mode === "live" &&
                router.push(tab === "drivers" ? `/driver/${x.id}` : `/team/${x.id}`)
              }
              style={[s.rank, x.id === mine && s.mine]}
            >
              <Text style={s.position}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.text}>
                  {x.name}
                  {x.id === mine ? " ★" : ""}
                </Text>
                {!!x.team && <Text style={s.small}>{x.team}</Text>}
              </View>
              <Text style={s.time}>{x.points} pts ›</Text>
            </Pressable>
          ))}
          {season.mode === "live" && (
            <Button
              label="⚔ Comparer deux pilotes"
              secondary
              onPress={() => router.push("/duel")}
            />
          )}
          {season.mode === "live" && (
            <Button
              label="🏆 Simulateur de championnat"
              secondary
              onPress={() => router.push("/simulator")}
            />
          )}
        </View>
      )}
    </Screen>
  );
}
