import { Text } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { hasApi } from "../../src/api.mjs";
import { useStore } from "../../src/store";
import { useTheme } from "../../src/ui";

const tabs = [
  ["index", "⌂", "Accueil"],
  ["pronos", "◎", "Pronos"],
  ["forum", "❝", "Forum"],
  ["season", "▦", "Saison"],
  ["favorites", "♡", "Favoris"],
  ["settings", "☷", "Réglages"],
];

export default function TabsLayout() {
  const { c } = useTheme();
  const { prefs, inbox } = useStore();
  // Pastilles : réponses au forum non lues, messages de ligue non lus.
  const unread = (prefix: string) =>
    inbox.items.filter((n) => !n.read && n.key.startsWith(prefix)).length || undefined;
  const badges: Record<string, number | undefined> = {
    forum: unread("forum:"),
    pronos: unread("league:"),
  };
  // Premier lancement : portail de connexion (si un serveur est joignable).
  if (!prefs.welcomed && !prefs.account && hasApi()) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
      }}
    >
      {tabs.map(([name, icon, title]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarBadge: badges[name],
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>{icon}</Text>,
          }}
        />
      ))}
      {/* Dernière course : ouverte depuis l'accueil, pas d'onglet dédié. */}
      <Tabs.Screen name="live" options={{ href: null }} />
    </Tabs>
  );
}
