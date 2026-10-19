import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { hasApi } from "../../src/api.mjs";
import { CATEGORIES } from "../../src/community.labels.mjs";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, formatDate, useCall, useTheme } from "../../src/ui";

type Category = keyof typeof CATEGORIES;
type Topic = {
  id: string;
  category: Category;
  title: string;
  eventId: string | null;
  pseudo: string;
  text: string;
  replies: number;
  lastAt: number;
};
type Reported = {
  topicId: string;
  title: string;
  postId: string;
  pseudo: string;
  text: string;
  reports: number;
};

// Forum : débats sur la réglementation, les week-ends de course, les pronos…
export default function Forum() {
  const { s, c } = useTheme();
  const { prefs, season, focus } = useStore();
  const router = useRouter();
  const call = useCall();
  const [category, setCategory] = useState<Category | "all">("all");
  const [data, setData] = useState<{
    topics: Topic[];
    admin: boolean;
    reported: Reported[];
  } | null>(null);
  const [error, setError] = useState("");
  const [writing, setWriting] = useState(false);
  const load = useCallback(() => {
    if (!prefs.account || !hasApi()) return;
    call(`/api/forum${category === "all" ? "" : `?category=${category}`}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [category, call, prefs.account?.token]);
  useFocusEffect(load);

  if (!hasApi() || season.mode !== "live")
    return (
      <Screen>
        <Text style={s.title}>Forum.</Text>
        <View style={s.lock}>
          <Text style={s.text}>
            Le forum passe par le serveur Keep Pushing : ouvrez l’app depuis votre serveur.
          </Text>
        </View>
      </Screen>
    );
  if (!prefs.account)
    return (
      <Screen>
        <Text style={s.title}>Forum.</Text>
        <Text style={s.subtitle}>
          Débattez de la réglementation, des week-ends de course et de vos pronos avec les autres
          joueurs.
        </Text>
        <Button label="Se connecter ou créer un compte" onPress={() => router.push("/login")} />
      </Screen>
    );
  // Sujet lié à un GP dont une session est protégée : masqué (anti-spoil).
  const spoiler = (t: Topic) =>
    !!t.eventId && prefs.protectedSessions.some((id) => id.startsWith(`${t.eventId}:`));
  const eventName = (id: string | null) => season.events.find((e) => e.id === id)?.name;
  return (
    <Screen>
      <Text style={s.title}>Forum.</Text>
      <Text style={s.subtitle}>
        Le paddock des joueurs : débattez, comparez, chambrez (gentiment).
      </Text>
      <Pills
        options={[["all", "Tout"], ...(Object.entries(CATEGORIES) as [Category, string][])]}
        value={category}
        onChange={setCategory}
      />
      {writing ? (
        <NewTopic
          initial={category === "all" ? "divers" : category}
          events={[focus.current, focus.last].filter((e, i, a) => a.indexOf(e) === i)}
          onCancel={() => setWriting(false)}
          onCreated={(id) => {
            setWriting(false);
            router.push(`/forum/${id}`);
          }}
        />
      ) : (
        <Button label="✏️ Nouveau sujet" onPress={() => setWriting(true)} />
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
      {data?.admin && data.reported.length > 0 && (
        <View style={[s.card, { borderWidth: 2, borderColor: c.error }]}>
          <Text style={s.label}>MODÉRATION · {data.reported.length} MESSAGE(S) SIGNALÉ(S)</Text>
          {data.reported.map((r) => (
            <Pressable
              key={r.postId}
              accessibilityRole="link"
              onPress={() => router.push(`/forum/${r.topicId}`)}
              style={s.rank}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.text} numberOfLines={2}>
                  {r.pseudo} : {r.text}
                </Text>
                <Text style={s.small}>
                  {r.title} · {r.reports} signalement(s)
                </Text>
              </View>
              <Text style={s.link}>Voir ›</Text>
            </Pressable>
          ))}
        </View>
      )}
      {(data?.topics ?? []).map((t) =>
        spoiler(t) ? (
          <View key={t.id} style={s.lock}>
            <Text style={s.text}>
              Sujet masqué : il parle du {eventName(t.eventId)}, protégé par l’anti-spoil.
            </Text>
          </View>
        ) : (
          <TopicCard key={t.id} topic={t} event={eventName(t.eventId)} onChange={load} />
        ),
      )}
      {data && !data.topics.length && (
        <Text style={s.small}>Aucun sujet ici pour l’instant : lancez le premier débat !</Text>
      )}
      <Text style={s.small}>
        Restez courtois. Un message qui pose problème ? « Signaler » le transmet aux modérateurs.
      </Text>
    </Screen>
  );
}

function NewTopic({
  initial,
  events,
  onCancel,
  onCreated,
}: {
  initial: Category;
  events: { id: string; name: string }[];
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const { s, c } = useTheme();
  const call = useCall();
  const [category, setCategory] = useState<Category>(initial);
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  const submit = () =>
    call("/api/forum", { method: "POST", body: { category, title, text, eventId } })
      .then((d) => onCreated(d.id))
      .catch((e) => setError(e.message));
  return (
    <View style={s.card}>
      <Text style={s.label}>NOUVEAU SUJET</Text>
      <Pills
        options={Object.entries(CATEGORIES) as [Category, string][]}
        value={category}
        onChange={setCategory}
      />
      {category === "weekend" && (
        <>
          <Text style={s.small}>
            Grand Prix concerné (le sujet sera masqué à ceux qui le regardent en différé) :
          </Text>
          <Pills
            options={events.map((e): [string, string] => [e.id, e.name.replace(" Grand Prix", "")])}
            value={eventId}
            onChange={setEventId}
          />
        </>
      )}
      <TextInput
        style={input}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
        placeholder="Titre (ex. Faut-il revoir les limites de piste ?)"
      />
      <TextInput
        style={[input, { minHeight: 110, textAlignVertical: "top" }]}
        value={text}
        onChangeText={setText}
        maxLength={2000}
        multiline
        placeholder="Votre message…"
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      <Button label="Publier" onPress={submit} />
      <Button label="Annuler" secondary onPress={onCancel} />
    </View>
  );
}

// Sujet dans la liste : premier message, réponses dépliables en cascade et
// réponse directe, sans ouvrir la fiche (gardée pour signaler, effacer…).
type Post = { id: string; pseudo: string; mine: boolean; text: string; at: number };
function TopicCard({
  topic: t,
  event,
  onChange,
}: {
  topic: Topic;
  event?: string;
  onChange: () => void;
}) {
  const { s, c } = useTheme();
  const router = useRouter();
  const call = useCall();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const load = () =>
    call(`/api/forum/${t.id}`)
      .then((d) => {
        setPosts(d.posts);
        setError("");
      })
      .catch((e) => setError(e.message));
  const send = () =>
    text.trim() &&
    call(`/api/forum/${t.id}`, { method: "POST", body: { text } })
      .then((d) => {
        setPosts(d.posts);
        setText("");
        setError("");
        onChange();
      })
      .catch((e) => setError(e.message));
  const replies = posts ? posts.length - 1 : t.replies;
  return (
    <View style={s.card}>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/forum/${t.id}`)}>
        <Text style={s.label}>
          {CATEGORIES[t.category].toUpperCase()}
          {event ? ` · ${event.replace(" Grand Prix", "").toUpperCase()}` : ""}
        </Text>
        <Text style={s.cardTitle}>{t.title}</Text>
      </Pressable>
      <Text style={s.small}>
        par {t.pseudo} · {formatDate(t.lastAt)}
      </Text>
      <Text style={s.text}>{t.text}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !!posts }}
        onPress={() => (posts ? setPosts(null) : load())}
        style={s.smallButton}
      >
        <Text style={s.link}>
          {posts
            ? "Replier ▴"
            : replies
              ? `💬 Voir ${replies} réponse${replies > 1 ? "s" : ""} ▾`
              : "💬 Répondre ▾"}
        </Text>
      </Pressable>
      {posts && (
        <View style={{ gap: 10, borderLeftWidth: 3, borderLeftColor: c.soft, paddingLeft: 12 }}>
          {posts.slice(1).map((p) => (
            <View key={p.id} style={{ gap: 2 }}>
              <Text style={s.small}>
                <Text style={{ fontWeight: "700", color: p.mine ? c.accent : c.ink }}>
                  {p.pseudo}
                </Text>{" "}
                · {formatDate(p.at)}
              </Text>
              <Text style={s.text}>{p.text}</Text>
            </View>
          ))}
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 10,
              padding: 10,
              fontSize: 15,
              color: c.ink,
              backgroundColor: c.card,
              minHeight: 60,
              textAlignVertical: "top",
            }}
            value={text}
            onChangeText={setText}
            maxLength={2000}
            multiline
            placeholder="Votre réponse…"
          />
          {!!error && <Text style={s.error}>{error}</Text>}
          <Button label="Répondre" onPress={send} />
          <Pressable accessibilityRole="link" onPress={() => router.push(`/forum/${t.id}`)}>
            <Text style={s.small}>Ouvrir le sujet (signaler, effacer, masquer un joueur) ›</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
