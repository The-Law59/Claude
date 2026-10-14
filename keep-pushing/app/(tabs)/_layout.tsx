import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "../../src/ui";

const tabs = [
  ["index", "⌂", "Accueil"],
  ["pronos", "◎", "Pronos"],
  ["season", "▦", "Saison"],
  ["favorites", "♡", "Favoris"],
  ["settings", "☷", "Réglages"],
];

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
      }}
    >
      {tabs.map(([name, icon, title]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>{icon}</Text>
            ),
          }}
        />
      ))}
      {/* Dernière course : ouverte depuis l'accueil, pas d'onglet dédié. */}
      <Tabs.Screen name="live" options={{ href: null }} />
    </Tabs>
  );
}
