import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { articleVisible } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, formatDate, s } from "../../src/ui";

export default function Home() {
  const { prefs, season, focus } = useStore();
  const router = useRouter();
  const [personal, setPersonal] = useState(true);
  const { current, last } = focus;
  const next = current.sessions.find((x) => Date.parse(x.startsAt) > Date.now());
  const lastRaceProtected = prefs.protectedSessions.includes(last.sessions.at(-1)!.id);
  const visible = season.articles.filter((a) => articleVisible(a, prefs, personal));
  return (
    <Screen>
      <Text style={s.title}>Au cœur du paddock.</Text>
      <Text style={s.subtitle}>Votre sélection, votre rythme.</Text>
      <View style={s.hero}>
        <Text style={s.heroLabel}>
          {season.mode === "live" ? "PROCHAIN GRAND PRIX" : "WEEK-END DE DÉMONSTRATION"}
        </Text>
        <Text style={s.heroTitle}>{current.name}</Text>
        <Text style={s.heroText}>
          {next ? `${next.label} · ${formatDate(next.startsAt)}` : "Week-end terminé"}
        </Text>
        <Button
          label={lastRaceProtected ? "Gérer la protection" : "Voir la dernière course →"}
          onPress={() => router.navigate(lastRaceProtected ? "/settings" : "/live")}
        />
      </View>
      {prefs.protectedSessions.length > 0 && (
        <View style={s.lock}>
          <Text style={s.text}>
            {prefs.protectedSessions.length} session(s) protégée(s). Les actualités
            associées sont masquées.
          </Text>
        </View>
      )}
      <Pills
        options={[
          [true, "Pour vous"],
          [false, "Toute la F1"],
        ]}
        value={personal}
        onChange={setPersonal}
      />
      <Text style={s.heading}>À la une</Text>
      {visible.map((a) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/article/${a.id}`)}
          style={s.card}
          key={a.id}
        >
          <Text style={s.label}>
            {a.rumor ? "RUMEUR · NON CONFIRMÉE" : "ACTUALITÉ · DÉMONSTRATION"}
          </Text>
          <Text style={s.cardTitle}>{a.title}</Text>
          <Text style={s.small}>Lire le résumé →</Text>
        </Pressable>
      ))}
      {!visible.length && (
        <View style={s.card}>
          {season.articles.length ? (
            <>
              <Text style={s.text}>Aucune actualité visible pour cette sélection.</Text>
              <Button
                label="Choisir mes favoris"
                onPress={() => router.navigate("/favorites")}
                secondary
              />
            </>
          ) : (
            <Text style={s.text}>
              Les actualités arrivent bientôt : aucune source d’actualités n’est encore
              branchée.
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}
