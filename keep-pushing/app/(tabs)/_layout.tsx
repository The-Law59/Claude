import { Redirect, Tabs } from "expo-router";
import { hasApi } from "../../src/api.mjs";
import { useStore } from "../../src/store";

// Pages principales. Pas de barre en bas : tout s'ouvre depuis le menu ☰ de
// l'en-tête (src/ui.tsx), qui porte aussi les pastilles (forum, ligues).
const pages = ["index", "pronos", "forum", "season", "live", "favorites", "settings"];

export default function TabsLayout() {
  const { prefs } = useStore();
  // Premier lancement : portail de connexion (si un serveur est joignable).
  if (!prefs.welcomed && !prefs.account && hasApi()) return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
      {pages.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
