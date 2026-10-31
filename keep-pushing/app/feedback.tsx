import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { hasApi } from "../src/api.mjs";
import { FEATURES } from "../src/community.labels.mjs";
import { useStore } from "../src/store";
import { Button, Screen, formatDate, useCall, useTheme } from "../src/ui";

type Feature = keyof typeof FEATURES;
type Summary = {
  count: number;
  average: number | null;
  likes: { key: Feature; label: string; count: number }[];
  latest: {
    id: string;
    pseudo: string;
    rating: number;
    likes: Feature[];
    improve: string;
    ideas: string;
    at: number;
  }[];
};

// Votre avis : note, ce que vous aimez, ce qu'on pourrait améliorer. Les
// admins y voient aussi la synthèse des avis reçus.
export default function Feedback() {
  const { s, c } = useTheme();
  const { prefs, update } = useStore();
  const router = useRouter();
  const call = useCall();
  const [rating, setRating] = useState(0);
  const [likes, setLikes] = useState<Feature[]>([]);
  const [improve, setImprove] = useState("");
  const [ideas, setIdeas] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    if (!prefs.account || !hasApi()) return;
    call("/api/me")
      .then((me) => me.admin && call("/api/feedback").then(setSummary))
      .catch(() => {});
  }, [prefs.account?.token]);
  const back = (
    <Button
      label="← Retour"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
      secondary
    />
  );
  if (!hasApi() || !prefs.account)
    return (
      <Screen>
        {back}
        <Text style={s.title}>Votre avis.</Text>
        <Text style={s.text}>
          Connectez-vous pour nous dire ce que vous pensez de Keep Pushing : un compte évite les
          avis en double.
        </Text>
        {hasApi() && <Button label="Se connecter" onPress={() => router.push("/login")} />}
      </Screen>
    );
  const submit = () =>
    call("/api/feedback", { method: "POST", body: { rating, likes, improve, ideas } })
      .then(() => {
        setSent(true);
        setError("");
        update({ feedbackAt: Date.now() });
      })
      .catch((e) => setError(e.message));
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
  const toggle = (k: Feature) =>
    setLikes((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  return (
    <Screen>
      {back}
      <Text style={s.title}>Votre avis.</Text>
      <Text style={s.subtitle}>2 minutes pour nous aider à améliorer l’appli. Merci !</Text>
      {sent ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>🙏 Merci pour votre avis !</Text>
          <Text style={s.text}>Il est bien arrivé : on le lit avant chaque nouvelle version.</Text>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.text}>Votre note globale</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""}`}
                accessibilityState={{ selected: rating >= n }}
                onPress={() => setRating(n)}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 34, color: rating >= n ? c.accent : c.line }}>★</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.text}>Ce que vous aimez (plusieurs choix possibles)</Text>
          <View style={s.pills}>
            {(Object.entries(FEATURES) as [Feature, string][]).map(([k, label]) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityState={{ selected: likes.includes(k) }}
                onPress={() => toggle(k)}
                style={[s.pill, likes.includes(k) && s.pillActive]}
              >
                <Text style={likes.includes(k) ? s.pillTextActive : s.text}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.text}>Ce qu’on pourrait améliorer</Text>
          <TextInput
            style={input}
            value={improve}
            onChangeText={setImprove}
            maxLength={1000}
            multiline
            placeholder="Un bug, quelque chose de pas clair, trop lent…"
          />
          <Text style={s.text}>Vos idées de nouveautés</Text>
          <TextInput
            style={input}
            value={ideas}
            onChangeText={setIdeas}
            maxLength={1000}
            multiline
            placeholder="Ce que vous aimeriez voir dans Keep Pushing"
          />
          {!!error && <Text style={s.error}>{error}</Text>}
          <Button
            label={rating ? "Envoyer mon avis" : "Choisissez une note"}
            onPress={() => (rating ? submit() : setError("Choisissez une note de 1 à 5 étoiles."))}
          />
        </View>
      )}

      {summary && (
        <>
          <Text style={s.heading}>Avis reçus (admin)</Text>
          <View style={[s.card, { flexDirection: "row" }]}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.title, { marginTop: 0, color: c.accent }]}>
                {summary.average ?? "—"}
              </Text>
              <Text style={s.small}>note moyenne / 5</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.title, { marginTop: 0 }]}>{summary.count}</Text>
              <Text style={s.small}>avis</Text>
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.label}>CE QUI PLAÎT LE PLUS</Text>
            {summary.likes.map((l) => (
              <View key={l.key} style={{ gap: 4, paddingVertical: 4 }}>
                <View style={{ flexDirection: "row" }}>
                  <Text style={[s.text, { flex: 1 }]}>{l.label}</Text>
                  <Text style={s.time}>{l.count}</Text>
                </View>
                <View
                  style={{
                    width: `${summary.count ? (l.count / summary.count) * 100 : 0}%`,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: c.accent,
                  }}
                />
              </View>
            ))}
          </View>
          {summary.latest.map((f) => (
            <View key={f.id} style={s.card}>
              <Text style={s.small}>
                <Text style={{ fontWeight: "700", color: c.ink }}>{f.pseudo}</Text> ·{" "}
                {"★".repeat(f.rating)}
                {"☆".repeat(5 - f.rating)} · {formatDate(f.at)}
              </Text>
              {!!f.likes.length && (
                <Text style={s.small}>Aime : {f.likes.map((k) => FEATURES[k]).join(", ")}</Text>
              )}
              {!!f.improve && <Text style={s.text}>À améliorer : {f.improve}</Text>}
              {!!f.ideas && <Text style={s.text}>Idées : {f.ideas}</Text>}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
