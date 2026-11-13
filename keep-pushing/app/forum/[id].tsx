import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CATEGORIES } from "../../src/community.labels.mjs";
import { useStore } from "../../src/store";
import { Button, Screen, formatDate, useCall, useTheme } from "../../src/ui";

type Post = {
  id: string;
  userId: string;
  pseudo: string;
  mine: boolean;
  text: string;
  at: number;
  reported: boolean;
  reports?: number;
};
type Topic = {
  id: string;
  category: keyof typeof CATEGORIES;
  title: string;
  eventId: string | null;
  admin: boolean;
  posts: Post[];
};

// Un sujet du forum : messages, réponse, signalement, effacement, blocage.
export default function ForumTopic() {
  const { s, c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prefs, season, markRead } = useStore();
  const router = useRouter();
  const call = useCall();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/forum"));
  const run = (p: Promise<Topic & { deleted?: boolean }>) =>
    p
      .then((t) => {
        if (t.deleted) return leave();
        setTopic(t);
        setError("");
        return true;
      })
      .catch((e) => {
        setError(e.message);
        return false;
      });
  useFocusEffect(
    useCallback(() => {
      run(call(`/api/forum/${id}`));
      markRead(`/forum/${id}`);
    }, [id, call]),
  );
  const back = <Button label="← Retour au forum" onPress={leave} secondary />;
  if (!topic)
    return (
      <Screen>
        {back}
        <Text style={error ? s.error : s.small}>{error || "Chargement…"}</Text>
      </Screen>
    );
  const event = season.events.find((e) => e.id === topic.eventId);
  if (event && prefs.protectedSessions.some((x) => x.startsWith(`${event.id}:`)))
    return (
      <Screen>
        {back}
        <View style={s.lock}>
          <Text style={s.text}>
            Sujet masqué : il parle du {event.name}, protégé par l’anti-spoil. Revenez après avoir
            regardé le week-end.
          </Text>
        </View>
      </Screen>
    );
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
    minHeight: 90,
    textAlignVertical: "top" as const,
  };
  const action = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.smallButton}>
      <Text style={s.small}>{label}</Text>
    </Pressable>
  );
  return (
    <Screen>
      {back}
      <Text style={s.label}>
        {CATEGORIES[topic.category].toUpperCase()}
        {event ? ` · ${event.name.toUpperCase()}` : ""}
      </Text>
      <Text style={s.title}>{topic.title}</Text>
      {topic.posts.map((p, i) => (
        <View key={p.id} style={[s.card, i === 0 && { borderWidth: 2, borderColor: c.soft }]}>
          <Text style={s.small}>
            <Text style={{ fontWeight: "700", color: p.mine ? c.accent : c.ink }}>{p.pseudo}</Text>{" "}
            · {formatDate(p.at)}
            {topic.admin && p.reports ? `  ·  ⚠ ${p.reports} signalement(s)` : ""}
          </Text>
          <Text style={s.text}>{p.text}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(p.mine || topic.admin) &&
              action(i === 0 ? "Supprimer le sujet" : "Effacer", () =>
                run(call(`/api/forum/${topic.id}/${p.id}`, { method: "DELETE" })),
              )}
            {!p.mine &&
              (p.reported
                ? action("Signalé ✓", () => {})
                : action("Signaler", () =>
                    run(call(`/api/forum/${topic.id}/${p.id}/report`, { method: "POST" })).then(
                      () => setNotice("Merci, le message est transmis aux modérateurs."),
                    ),
                  ))}
            {!p.mine &&
              action(`Masquer ${p.pseudo}`, () =>
                call("/api/forum/block", { method: "POST", body: { userId: p.userId } })
                  .then(() => run(call(`/api/forum/${topic.id}`)))
                  .then(() => setNotice(`Vous ne verrez plus les messages de ${p.pseudo}.`))
                  .catch((e) => setError(e.message)),
              )}
          </View>
        </View>
      ))}
      {!!notice && <Text style={s.small}>{notice}</Text>}
      <Text style={s.heading}>Répondre</Text>
      <TextInput
        style={input}
        value={text}
        onChangeText={setText}
        maxLength={2000}
        multiline
        placeholder="Votre réponse…"
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button
        label="Envoyer"
        onPress={() =>
          text.trim() &&
          run(call(`/api/forum/${topic.id}`, { method: "POST", body: { text } })).then(
            (ok) => ok && setText(""),
          )
        }
      />
    </Screen>
  );
}
