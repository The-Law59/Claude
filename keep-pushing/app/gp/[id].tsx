import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { loadCircuitHistory } from "../../src/jolpica.mjs";
import { protectWeekend } from "../../src/model.mjs";
import { loadWeather, localTime } from "../../src/weather.mjs";
import { useStore } from "../../src/store";
import { Button, ResultRows, Screen, Toggle, formatDate, useTheme } from "../../src/ui";

// Un Grand Prix : ses sessions, ses résultats, sa protection anti-spoil.
export default function GrandPrix() {
  const { s } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prefs, setPrefs, season, loadResults } = useStore();
  const router = useRouter();
  const event = season.events.find((e) => e.id === id);
  const [sessionId, setSessionId] = useState(event?.sessions.at(-1)!.id ?? "");
  type Weather = Awaited<ReturnType<typeof loadWeather>>;
  const [weather, setWeather] = useState<Weather | null>(null);
  const [history, setHistory] = useState<{ season: string; driver: string; team: string }[]>([]);
  useEffect(() => {
    if (!event) return;
    loadResults(event);
    if (event.location)
      loadWeather(event)
        .then(setWeather)
        .catch(() => {});
    if (event.circuitId)
      loadCircuitHistory(event.circuitId)
        // L'édition de cette année est dans les résultats (et l'anti-spoil).
        .then((h: typeof history) => setHistory(h.filter((x) => x.season !== event.season)))
        .catch(() => {});
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
      <Text style={s.subtitle}>
        {event.circuit}
        {event.location ? ` · ${event.location.locality}, ${event.location.country}` : ""}
      </Text>
      <Toggle
        label="Protéger ce week-end"
        value={event.sessions.every((x) => prefs.protectedSessions.includes(x.id))}
        onChange={(on) => setPrefs((p) => protectWeekend(p, event.sessions, on))}
        detail="Masque résultats, vainqueur et actualités liées."
      />
      <Text style={s.small}>
        Horaires de votre téléphone
        {weather ? " · heure locale du circuit en dessous" : ""}
      </Text>
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
            {weather && (
              <Text style={s.small}>
                Sur place : {localTime(x.startsAt, weather.timezone)}
                {weather.bySession[x.id] &&
                  `  ·  ${weather.bySession[x.id].icon} ${weather.bySession[x.id].temp}°C, pluie ${weather.bySession[x.id].rain} %`}
              </Text>
            )}
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
      {history.length > 0 && (
        <>
          <Text style={s.heading}>Le circuit</Text>
          <View style={s.card}>
            <Text style={s.text}>
              {history.length} Grands Prix disputés ici depuis {history.at(-1)!.season}.
            </Text>
            <Text style={s.label}>DERNIERS VAINQUEURS</Text>
            {history.slice(0, 5).map((h) => (
              <View key={h.season} style={s.rank}>
                <Text style={[s.small, { width: 44 }]}>{h.season}</Text>
                <Text style={[s.text, { flex: 1 }]}>{h.driver}</Text>
                <Text style={s.small}>{h.team}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {weather && (
        <Text style={s.small}>
          Météo : prévisions Open-Meteo, disponibles jusqu’à 16 jours avant la session.
        </Text>
      )}
    </Screen>
  );
}
