import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { protectWeekend } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, ResultRows, Screen, Toggle, formatDate, s } from "../../src/ui";

// Un Grand Prix : ses sessions, ses résultats, sa protection anti-spoil.
export default function GrandPrix() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prefs, setPrefs, season, loadResults } = useStore();
  const router = useRouter();
  const event = season.events.find((e) => e.id === id);
  const [sessionId, setSessionId] = useState(event?.sessions.at(-1)!.id ?? "");
  useEffect(() => {
    if (event) loadResults(event);
  }, [event?.id]);
  const back = (
    <Button
      label="← Retour au calendrier"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/season"))}
      secondary
    />
  );
  if (!event)
    return (
      <Screen>
        {back}
        <Text style={s.text}>Grand Prix introuvable.</Text>
      </Screen>
    );
  const session = event.sessions.find((x) => x.id === sessionId) ?? event.sessions.at(-1)!;
  return (
    <Screen>
      {back}
      <Text style={s.label}>MANCHE {event.round}</Text>
      <Text style={s.title}>{event.name}</Text>
      <Text style={s.subtitle}>{event.circuit}</Text>
      <Toggle
        label="Protéger ce week-end"
        value={event.sessions.every((x) => prefs.protectedSessions.includes(x.id))}
        onChange={(on) => setPrefs((p) => protectWeekend(p, event.sessions, on))}
        detail="Masque résultats, vainqueur et actualités liées."
      />
      <Text style={s.small}>Horaires locaux du téléphone</Text>
      {event.sessions.map((x) => (
        <Pressable
          key={x.id}
          accessibilityRole="button"
          accessibilityState={{ selected: x.id === session.id }}
          onPress={() => setSessionId(x.id)}
          style={[s.session, x.id === session.id && s.mine]}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.text}>{x.label}</Text>
            <Text style={s.small}>{formatDate(x.startsAt)}</Text>
          </View>
          <Text style={s.link}>
            {prefs.protectedSessions.includes(x.id)
              ? "Protégée"
              : Date.parse(x.startsAt) > Date.now()
                ? "À venir"
                : "Résultat"}
          </Text>
        </Pressable>
      ))}
      <Text style={s.heading}>{session.label}</Text>
      <ResultRows sessionId={session.id} />
    </Screen>
  );
}
