import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../../src/store";
import { Button, Pills, ResultRows, Screen, formatDate, s } from "../../src/ui";

export default function Season() {
  const { prefs, season, focus } = useStore();
  const router = useRouter();
  const events = [...new Set([focus.last, focus.current])];
  const [eventId, setEventId] = useState(focus.last.id);
  const event = events.find((e) => e.id === eventId) ?? focus.current;
  const [sessionId, setSessionId] = useState(event.sessions.at(-1)!.id);
  const session = event.sessions.find((x) => x.id === sessionId) ?? event.sessions.at(-1)!;
  const [tab, setTab] = useState<"sessions" | "drivers" | "teams">("sessions");
  const standings: { id: string; name: string; points: number; team?: string }[] =
    tab === "drivers" ? season.drivers : season.teams;
  return (
    <Screen>
      <Text style={s.title}>La saison.</Text>
      <Pills
        options={[
          ["sessions", "Sessions"],
          ["drivers", "Pilotes"],
          ["teams", "Écuries"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "sessions" ? (
        <>
          {events.length > 1 && (
            <Pills
              options={[
                [focus.last.id, "Dernier GP"],
                [focus.current.id, "Prochain GP"],
              ]}
              value={event.id}
              onChange={setEventId}
            />
          )}
          <Text style={s.heading}>{event.name}</Text>
          <Text style={s.small}>Horaires locaux du téléphone</Text>
          {event.sessions.map((x) => (
            <View style={s.session} key={x.id}>
              <View style={{ flex: 1 }}>
                <Text style={s.text}>{x.label}</Text>
                <Text style={s.small}>{formatDate(x.startsAt)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSessionId(x.id)}
                style={s.smallButton}
              >
                <Text style={s.link}>
                  {prefs.protectedSessions.includes(x.id) ? "Protégée" : "Résultat"}
                </Text>
              </Pressable>
            </View>
          ))}
          <Text style={s.heading}>{session.label}</Text>
          <ResultRows sessionId={session.id} />
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
          <Text style={s.label}>
            {season.mode === "live" ? "CHAMPIONNAT" : "POINTS FICTIFS"}
          </Text>
          {standings.map((x, i) => (
            <View key={x.id} style={s.rank}>
              <Text style={s.position}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.text}>{x.name}</Text>
                {!!x.team && <Text style={s.small}>{x.team}</Text>}
              </View>
              <Text style={s.time}>{x.points} pts</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
