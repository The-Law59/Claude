import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { articleVisible } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, SourceBadge, formatDate, useTheme } from "../../src/ui";

export default function Home() {
  const { s } = useTheme();
  const { prefs, season, focus, loadResults } = useStore();
  useEffect(() => loadResults(focus.last), [focus.last.id]);
  const router = useRouter();
  const [personal, setPersonal] = useState(true);
  const [kind, setKind] = useState<"all" | "official" | "press" | "unofficial">("all");
  const { current, last } = focus;
  const next = current.sessions.find((x) => Date.parse(x.startsAt) > Date.now());
  const lastRaceProtected = prefs.protectedSessions.includes(last.sessions.at(-1)!.id);
  const visible = season.articles.filter(
    (a) => articleVisible(a, prefs, personal) && (kind === "all" || a.kind === kind),
  );
  const rank = <T extends { id: string }>(list: T[], id: string) => {
    const i = list.findIndex((x) => x.id === id);
    return i < 0 ? null : { ...list[i], position: i + 1 };
  };
  const myDriver = rank(season.drivers, prefs.myDriver);
  const myTeam = rank(season.teams, prefs.myTeam);
  const lastResult = season.results[last.sessions.at(-1)!.id]?.find(
    (r) => r.driverId === prefs.myDriver,
  );
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
      <Text style={s.heading}>Mon paddock</Text>
      {!myDriver && !myTeam ? (
        <View style={s.card}>
          <Text style={s.text}>Choisissez votre pilote et votre écurie pour les suivre ici.</Text>
          <Button label="Choisir ★" onPress={() => router.navigate("/favorites")} secondary />
        </View>
      ) : prefs.protectedSessions.length > 0 ? (
        <View style={s.lock}>
          <Text style={s.text}>Classement masqué : une session est protégée.</Text>
        </View>
      ) : (
        <View style={s.card}>
          {myDriver && (
            <View style={s.rank}>
              <Text style={s.position}>{myDriver.position}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{myDriver.name} ★</Text>
                <Text style={s.small}>
                  {myDriver.team}
                  {lastResult ? ` · ${lastResult.position}e à ${last.name}` : ""}
                </Text>
              </View>
              <Text style={s.time}>{myDriver.points} pts</Text>
            </View>
          )}
          {myTeam && (
            <View style={s.rank}>
              <Text style={s.position}>{myTeam.position}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{myTeam.name} ★</Text>
                <Text style={s.small}>Championnat des écuries</Text>
              </View>
              <Text style={s.time}>{myTeam.points} pts</Text>
            </View>
          )}
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
      {season.articles.some((a) => a.kind) && (
        <Pills
          options={[
            ["all", "Toutes sources"],
            ["official", "Officielles"],
            ["press", "Presse"],
            ["unofficial", "Non officielles"],
          ]}
          value={kind}
          onChange={setKind}
        />
      )}
      <Text style={s.heading}>À la une</Text>
      {visible.map((a) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/article/${a.id}`)}
          style={s.card}
          key={a.id}
        >
          <SourceBadge kind={a.kind} lang={a.lang} />
          <Text style={s.label}>
            {a.rumor ? "RUMEUR · " : ""}
            {a.source
              ? `${a.source.toUpperCase()}${a.dated === false ? "" : ` · ${formatDate(a.publishedAt!)}`}`
              : a.rumor
                ? "NON CONFIRMÉE"
                : "ACTUALITÉ · DÉMONSTRATION"}
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
              Actualités indisponibles pour le moment. Vérifiez votre connexion.
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}
