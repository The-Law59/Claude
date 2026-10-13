import { Text } from "react-native";
import { useStore } from "../../src/store";
import { ResultRows, Screen, s } from "../../src/ui";

export default function Live() {
  const { focus, season } = useStore();
  const race = focus.last.sessions.at(-1)!;
  return (
    <Screen>
      <Text style={s.title}>La course.</Text>
      <Text style={s.subtitle}>
        {focus.last.name} · {season.mode === "live" ? "Dernière course" : "Simulation"}
      </Text>
      <ResultRows sessionId={race.id} />
      <Text style={s.small}>
        Pas de direct dans cette version : le suivi tour par tour nécessite une source
        dont les droits restent à valider.
      </Text>
    </Screen>
  );
}
