import { Pressable, Text, View } from "react-native";
import { setMine } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Screen, Toggle, useTheme } from "../../src/ui";

export default function Favorites() {
  const { c, s } = useTheme();
  const { prefs, setPrefs, update, season } = useStore();
  const toggle = (id: string, on: boolean) =>
    update({
      favorites: on ? [...prefs.favorites, id] : prefs.favorites.filter((x) => x !== id),
    });
  const lists = [
    ["Pilotes", "myDriver", "mon pilote", season.drivers],
    ["Écuries", "myTeam", "mon écurie", season.teams],
  ] as const;
  return (
    <Screen>
      <Text style={s.title}>Votre paddock.</Text>
      <Text style={s.subtitle}>
        ★ choisit votre pilote et votre écurie : l’app prend la couleur de votre écurie.
        Les interrupteurs ajoutent d’autres favoris pour filtrer les actualités.
      </Text>
      {lists.map(([title, key, label, list]) => (
        <View key={key}>
          <Text style={s.heading}>{title}</Text>
          {list.map((f) => {
            const mine = prefs[key] === f.id;
            return (
              <View key={f.id} style={[s.favRow, mine && s.mine]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Choisir ${f.name} comme ${label}`}
                  accessibilityState={{ selected: mine }}
                  onPress={() => setPrefs((p) => setMine(p, key, mine ? "" : f.id))}
                  style={s.star}
                >
                  <Text style={{ fontSize: 22, color: mine ? c.accent : c.line }}>★</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Toggle
                    label={f.name}
                    detail={mine ? label.charAt(0).toUpperCase() + label.slice(1) : undefined}
                    value={prefs.favorites.includes(f.id)}
                    onChange={(on) => toggle(f.id, on)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={s.small}>Vos choix sont enregistrés sur cet appareil.</Text>
    </Screen>
  );
}
