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
  const [weatherError, setWeatherError] = useState(false);
  const [history, setHistory] = useState<{ season: string; driver: string; team: string }[]>([]);
  useEffect(() => {
    if (!event) return;
    loadResults(event);
    if (event.location)
      loadWeather(event)
        .then(setWeather)
        .catch(() => setWeatherError(true));
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
  const upcoming = event.sessions.some((x) => Date.parse(x.startsAt) > Date.now());
  const forecast = event.sessions.filter(
    (x) => weather?.bySession[x.id] && Date.parse(x.startsAt) > Date.now() - 3 * 3600000,
  );
  return (
    <Screen>
      {back}
      <Text style={s.label}>MANCHE {event.round}</Text>
      <Text style={s.title}>{event.name}</Text>
      <Text style={s.subtitle}>
        {event.circuit}
        {event.location ? ` · ${event.location.locality}, ${event.location.country}` : ""}
      </Text>
      <Text style={s.heading}>Météo du week-end</Text>
      <View style={s.card}>
        {forecast.length > 0 ? (
          forecast.map((x) => {
            const w = weather!.bySession[x.id];
            return (
              <View key={x.id} style={s.rank}>
                <Text style={{ fontSize: 26 }}>{w.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.text}>{x.label}</Text>
                  <Text style={s.small}>
                    {w.label} · sur place {localTime(x.startsAt, weather!.timezone)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.cardTitle}>{w.temp}°C</Text>
                  <Text style={s.small}>pluie {w.rain} %</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={s.text}>
            {weatherError
              ? "Météo indisponible pour le moment."
              : !weather
                ? "Chargement de la météo…"
                : upcoming
                  ? "Les prévisions apparaissent 16 jours avant le week-end."
                  : "Week-end terminé."}
          </Text>
        )}
        {weather && (
          <Text style={s.small}>
            Heure locale du circuit : {localTime(new Date().toISOString(), weather.timezone)}{" "}
            actuellement. Prévisions Open-Meteo.
          </Text>
        )}
      </View>
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
      <Text style={s.heading}>Sessions</Text>
      <Toggle
        label="Protéger ce week-end"
        value={event.sessions.every((x) => prefs.protectedSessions.includes(x.id))}
        onChange={(on) => setPrefs((p) => protectWeekend(p, event.sessions, on))}
        detail="Masque résultats, vainqueur et actualités liées."
      />
      <Text style={s.small}>Horaires de votre téléphone</Text>
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
                Heure locale du circuit : {localTime(x.startsAt, weather.timezone)}
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
    </Screen>
  );
}
