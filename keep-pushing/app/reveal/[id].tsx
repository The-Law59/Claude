import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { setProtected } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, Screen, useTheme } from "../../src/ui";

// « Prêt à découvrir ? » : débloque une course ou un sprint et dévoile le
// podium marche par marche (3e, 2e puis 1er).
export default function Reveal() {
  const { s, c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = decodeURIComponent(id ?? "");
  const { prefs, setPrefs, season, loadResults } = useStore();
  const router = useRouter();
  const event = season.events.find((e) => e.sessions.some((x) => x.id === sessionId));
  const session = event?.sessions.find((x) => x.id === sessionId);
  const rows = season.results[sessionId] ?? [];
  const [revealed, setRevealed] = useState(false);
  const steps = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (event) loadResults(event);
  }, [event?.id]);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const reveal = () => {
    setPrefs((p) => setProtected(p, sessionId, false));
    setRevealed(true);
    // Du 3e au 1er, avec une pause qui laisse le suspense.
    Animated.stagger(
      900,
      [2, 1, 0].map((i) =>
        Animated.timing(steps[i], { toValue: 1, duration: 500, useNativeDriver: true }),
      ),
    ).start();
  };

  if (!event || !session)
    return (
      <Screen>
        <Button label="← Retour" onPress={back} secondary />
        <Text style={s.text}>Session introuvable.</Text>
      </Screen>
    );
  const mine = rows.find((r) => r.driverId === prefs.myDriver);
  return (
    <Screen>
      <View style={s.hero}>
        <Text style={s.heroLabel}>{event.name.toUpperCase()}</Text>
        <Text style={s.heroTitle}>
          {revealed ? `${session.label} : le podium` : "Prêt à découvrir ?"}
        </Text>
        {!revealed && (
          <Text style={s.heroText}>
            Le résultat de la {session.label.toLowerCase()} va s’afficher. Pas encore vue ?
            Revenez en arrière, rien ne sera dévoilé.
          </Text>
        )}
      </View>
      {!revealed ? (
        <>
          <Button
            label={rows.length ? "Révéler le résultat" : "Chargement du résultat…"}
            onPress={() => rows.length && reveal()}
          />
          <Button label="Pas encore, je reviens plus tard" onPress={back} secondary />
        </>
      ) : (
        <>
          {[0, 1, 2].map((i) =>
            rows[i] ? (
              <Animated.View
                key={i}
                style={[
                  s.card,
                  i === 0 && { borderWidth: 2, borderColor: c.accent },
                  {
                    opacity: steps[i],
                    transform: [
                      { translateY: steps[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                    ],
                  },
                ]}
              >
                <View style={s.rank}>
                  <Text style={s.position}>{["🥇", "🥈", "🥉"][i]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{rows[i].name}</Text>
                    <Text style={s.small}>{rows[i].team}</Text>
                  </View>
                  <Text style={s.time}>{rows[i].value}</Text>
                </View>
              </Animated.View>
            ) : null,
          )}
          {mine && mine.position > 3 && (
            <Text style={s.text}>
              Votre pilote, {mine.name}, termine {mine.position}e.
            </Text>
          )}
          <Button label="Voir le classement complet" onPress={back} secondary />
        </>
      )}
    </Screen>
  );
}
