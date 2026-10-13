import { Text, View } from "react-native";
import { useStore } from "../../src/store";
import { Screen, Toggle, s } from "../../src/ui";

export default function Favorites() {
  const { prefs, update, season } = useStore();
  const toggle = (id: string, on: boolean) =>
    update({
      favorites: on ? [...prefs.favorites, id] : prefs.favorites.filter((x) => x !== id),
    });
  return (
    <Screen>
      <Text style={s.title}>Votre paddock.</Text>
      <Text style={s.subtitle}>Plusieurs pilotes, plusieurs écuries.</Text>
      {(
        [
          ["Pilotes", season.drivers],
          ["Écuries", season.teams],
        ] as const
      ).map(([title, list]) => (
        <View key={title}>
          <Text style={s.heading}>{title}</Text>
          {list.map((f) => (
            <Toggle
              key={f.id}
              label={f.name}
              value={prefs.favorites.includes(f.id)}
              onChange={(on) => toggle(f.id, on)}
            />
          ))}
        </View>
      ))}
      <Text style={s.small}>Vos choix sont enregistrés sur cet appareil.</Text>
    </Screen>
  );
}
