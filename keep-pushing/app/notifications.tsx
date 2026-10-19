import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { noticeText, useStore } from "../src/store";
import { Button, Screen, formatDate, useTheme } from "../src/ui";

// Notifications : réponses au forum et messages de ligue.
export default function Notifications() {
  const { s, c } = useTheme();
  const { prefs, inbox, markRead } = useStore();
  const router = useRouter();
  return (
    <Screen>
      <Button
        label="← Retour"
        secondary
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      />
      <Text style={s.title}>Notifications.</Text>
      {inbox.unread > 0 && (
        <Button label="Tout marquer comme lu" secondary onPress={() => markRead()} />
      )}
      {inbox.items.map((n) => (
        <Pressable
          key={n.id}
          accessibilityRole="link"
          onPress={() => {
            markRead(n.link);
            router.push(n.link as never);
          }}
          style={[s.card, !n.read && { borderWidth: 2, borderColor: c.accent }]}
        >
          <Text style={[s.text, !n.read && { fontWeight: "700" }]}>
            {n.key.startsWith("forum:") ? "💬 " : "🏁 "}
            {noticeText(n, prefs)}
          </Text>
          <Text style={s.small}>{formatDate(n.at)}</Text>
        </Pressable>
      ))}
      {!inbox.items.length && (
        <View style={s.card}>
          <Text style={s.text}>
            Rien de neuf. Vous serez prévenu ici des réponses à vos sujets du forum et des messages
            de vos ligues.
          </Text>
        </View>
      )}
      <Text style={s.small}>
        Sur téléphone, une alerte s’affiche aussi si vous avez autorisé les notifications (Réglages
        → rappels).
      </Text>
    </Screen>
  );
}
