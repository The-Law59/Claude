import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, hasApi } from "../../src/api.mjs";
import { RecapCard } from "../../src/RecapCard";
import { Countdown, Hero, Shortcuts, Thumb, heroText } from "../../src/design";
import {
  articleVisible,
  askFeedback,
  nextAction,
  protectWeekend,
  teammateOf,
} from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, SourceBadge, formatDate, ordinal, useTheme } from "../../src/ui";

export default function Home() {
  const { s } = useTheme();
  const { prefs, setPrefs, season, focus, loadResults, inbox } = useStore();
  useEffect(() => loadResults(focus.last), [focus.last.id]);
  const router = useRouter();
  const [personal, setPersonal] = useState(true);
  const [kind, setKind] = useState<"all" | "official" | "press" | "unofficial">("all");
  const { current, last } = focus;
  const race = current.sessions.at(-1)!;
  const unread = (prefix: string) =>
    inbox.items.filter((n) => !n.read && n.key.startsWith(prefix)).length;
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
      <Text style={s.title}>
        {prefs.account ? `Salut ${prefs.account.pseudo} 👋` : "Au cœur du paddock."}
      </Text>
      <Text style={s.subtitle}>La F1 à votre rythme.</Text>
      <Hero
        label={
          season.mode === "live"
            ? `Prochain Grand Prix · manche ${current.round}`
            : "Week-end de démonstration"
        }
        title={current.name}
        onPress={season.mode === "live" ? () => router.push(`/gp/${current.id}`) : undefined}
      >
        {Date.parse(race.startsAt) > Date.now() && <Countdown to={Date.parse(race.startsAt)} />}
        <Text style={heroText}>
          {next
            ? `📅 ${next.label} · ${formatDate(next.startsAt)}${current.location ? ` · ${current.location.locality}` : ""}`
            : "Week-end terminé"}
        </Text>
        {current.sessions.every((x) => prefs.protectedSessions.includes(x.id)) && (
          <Text style={heroText}>🎬 Week-end en différé : rien ne sera dévoilé.</Text>
        )}
      </Hero>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {season.mode === "live" && (
          <View style={{ flexGrow: 1 }}>
            <Button
              label="🌦 Météo et circuit"
              onPress={() => router.push(`/gp/${current.id}`)}
              secondary
            />
          </View>
        )}
        <View style={{ flexGrow: 1 }}>
          <Button
            label={lastRaceProtected ? "◈ Gérer la protection" : "🏁 Dernière course"}
            onPress={() => router.navigate(lastRaceProtected ? "/settings" : "/live")}
            secondary
          />
        </View>
        {!current.sessions.every((x) => prefs.protectedSessions.includes(x.id)) && (
          <View style={{ flexGrow: 1 }}>
            <Button
              label="🎬 Je regarde en différé"
              onPress={() => setPrefs((p) => protectWeekend(p, current.sessions, true))}
              secondary
            />
          </View>
        )}
      </View>
      {season.mode === "live" && hasApi() && !!prefs.account && <TodoCard eventId={current.id} />}
      {hasApi() && !!prefs.account && (
        <Shortcuts
          items={[
            { icon: "🎯", label: "Pronos", onPress: () => router.navigate("/pronos") },
            {
              icon: "🏆",
              label: "Ma ligue",
              onPress: () => router.navigate("/pronos?tab=rank"),
              badge: unread("league:"),
            },
            {
              icon: "💬",
              label: "Forum",
              onPress: () => router.navigate("/forum"),
              badge: unread("forum:"),
            },
          ]}
        />
      )}
      {prefs.protectedSessions.length > 0 && (
        <View style={s.lock}>
          <Text style={s.text}>
            {prefs.protectedSessions.length} session(s) protégée(s). Les actualités associées sont
            masquées.
          </Text>
        </View>
      )}
      {season.mode === "live" &&
        hasApi() &&
        !!prefs.account &&
        prefs.recapClosed !== last.id &&
        // Récap du dernier GP jusqu'au début du week-end suivant.
        last.id !== current.id &&
        Date.now() < Date.parse(current.sessions[0].startsAt) && (
          <RecapCard
            eventId={last.id}
            onClose={() => setPrefs((p) => ({ ...p, recapClosed: last.id }))}
          />
        )}
      {hasApi() && !!prefs.account && askFeedback(prefs) && (
        <View style={s.card}>
          <Text style={s.label}>VOTRE AVIS COMPTE</Text>
          <Text style={s.text}>
            Vous utilisez Keep Pushing depuis quelques jours : qu’en pensez-vous ? 2 minutes pour
            nous aider à l’améliorer.
          </Text>
          <Button label="💬 Donner mon avis" onPress={() => router.push("/feedback")} />
          <Button
            label="Plus tard"
            secondary
            onPress={() => setPrefs((p) => ({ ...p, feedbackAt: Date.now() }))}
          />
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
                  {lastResult ? ` · ${ordinal(lastResult.position)} à ${last.name}` : ""}
                </Text>
              </View>
              <Text style={s.time}>{myDriver.points} pts</Text>
            </View>
          )}
          {myDriver && (
            <Button
              label={`⚔ Duel face à ${teammateOf(season.drivers, myDriver.id)?.name ?? "son coéquipier"} →`}
              onPress={() => router.push("/duel")}
              secondary
            />
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
          style={[s.card, { flexDirection: "row", gap: 12 }]}
          key={a.id}
        >
          <Thumb />
          <View style={{ flex: 1, gap: 4 }}>
            <SourceBadge kind={a.kind} lang={a.lang} translated={!!a.translatedFrom} />
            <Text style={[s.text, { fontWeight: "700" }]} numberOfLines={3}>
              {a.title}
            </Text>
            <Text style={s.small}>
              {a.rumor ? "Rumeur · " : ""}
              {a.source
                ? `${a.source}${a.dated === false ? "" : ` · ${formatDate(a.publishedAt!)}`}`
                : a.rumor
                  ? "Non confirmée"
                  : "Actualité · démonstration"}
            </Text>
          </View>
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

// Carte « À faire » : la seule action utile du moment (pronos, ami, notifications).
type BetsView = {
  closes: Record<string, number>;
  opens: Record<string, number>;
  parts: string[];
  mine: Record<string, unknown> | null;
};
type Action = {
  kind: string;
  icon: string;
  title: string;
  href?: string;
  label?: string;
  at?: number;
  opensAt?: number;
  urgent?: boolean;
};
function TodoCard({ eventId }: { eventId: string }) {
  const { s, c } = useTheme();
  const { prefs, inbox } = useStore();
  const router = useRouter();
  const [bets, setBets] = useState<BetsView | null>(null);
  useFocusEffect(
    useCallback(() => {
      api(`/api/bets/${eventId}`, { token: prefs.account?.token })
        .then(setBets)
        .catch(() => setBets(null));
    }, [eventId, prefs.account?.token]),
  );
  const a = nextAction({
    bets,
    notices: inbox.items.filter((n) => !n.read),
    eventId,
  }) as Action | null;
  if (!a) return null;
  const when = (t: number) => {
    const hours = Math.max(0, Math.round((t - Date.now()) / 3600000));
    return hours < 48 ? `dans ${hours} h` : `le ${formatDate(t)}`;
  };
  const strong = a.kind !== "ready" && a.kind !== "soon";
  return (
    <View style={[s.card, strong && s.glowCard]}>
      <Text style={s.label}>À FAIRE</Text>
      <Text style={s.cardTitle}>
        {a.icon} {a.title}
      </Text>
      {!!a.at && (
        <Text style={[s.small, a.urgent && { color: c.accent, fontWeight: "700" }]}>
          {a.kind === "ready" ? "Modifiables jusqu’à la fermeture, " : "Fermeture "}
          {when(a.at)}.
        </Text>
      )}
      {!!a.opensAt && <Text style={s.small}>Ouverture le {formatDate(a.opensAt)}.</Text>}
      {!!a.href && (
        <Button
          label={`${a.label} →`}
          secondary={!strong}
          onPress={() => router.push(a.href as never)}
        />
      )}
    </View>
  );
}
