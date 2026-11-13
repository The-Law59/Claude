import { Pressable, Text, View } from "react-native";
import { TeamBadge } from "../../src/design";
import { setMine } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Screen, Toggle, useTheme } from "../../src/ui";

export default function Favorites() {
  const { s, team } = useTheme();
  const { prefs, setPrefs, update, season } = useStore();
  const toggle = (id: string, on: boolean) =>
    update({
      favorites: on ? [...prefs.favorites, id] : prefs.favorites.filter((x) => x !== id),
    });
  // Choix principal : un seul pilote, une seule écurie (qui colore l'app).
  const pickers = [
    ["Mon écurie", "myTeam", season.teams],
    ["Mon pilote", "myDriver", season.drivers],
  ] as const;
  return (
    <Screen>
      <Text style={s.title}>Votre paddock.</Text>
      <Text style={s.subtitle}>Choisissez votre écurie : toute l’appli prend ses couleurs.</Text>
      <Text style={s.heading}>Mon écurie</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {season.teams.map((t) => {
          const selected = prefs.myTeam === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Mon écurie : ${t.name}`}
              accessibilityState={{ selected }}
              onPress={() => setPrefs((p) => setMine(p, "myTeam", selected ? "" : t.id))}
              style={{ width: 96, alignItems: "center", gap: 6 }}
            >
              <TeamBadge teamId={t.id} name={t.name} size={72} selected={selected} />
              <Text
                style={[
                  s.small,
                  { textAlign: "center" },
                  selected && { color: s.text.color, fontWeight: "800" },
                ]}
                numberOfLines={2}
              >
                {selected ? "★ " : ""}
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {pickers.slice(1).map(([title, key, list]) => (
        <View key={key}>
          <Text style={s.heading}>{title}</Text>
          <View style={s.pills}>
            {list.map((f) => {
              const selected = prefs[key] === f.id;
              // Chaque écurie s'affiche dans sa couleur ; un pilote dans celle de son écurie.
              const color = team("teamId" in f ? f.teamId : f.id);
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${title} : ${f.name}`}
                  accessibilityState={{ selected }}
                  onPress={() => setPrefs((p) => setMine(p, key, selected ? "" : f.id))}
                  style={[s.pill, { borderColor: color }, selected && { backgroundColor: color }]}
                >
                  <Text style={selected ? s.pillTextActive : [s.text, { color }]}>
                    {selected ? "★ " : ""}
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={s.heading}>Autres favoris</Text>
      <Text style={s.small}>Pour filtrer les actualités « Pour vous ».</Text>
      {[...season.drivers, ...season.teams].map((f) => (
        <Toggle
          key={f.id}
          label={f.name}
          value={prefs.favorites.includes(f.id)}
          onChange={(on) => toggle(f.id, on)}
        />
      ))}
      <Text style={s.small}>Vos choix sont enregistrés sur cet appareil.</Text>
    </Screen>
  );
}
