import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api, hasApi } from "../api.mjs";
import { recapReadyAt } from "../model.mjs";
import { useStore, type Event } from "../store";
import { useTheme } from "../ui";

type Recap = { headline: string; summary: string; keyFacts: string[] };

// Récap IA du dernier week-end, avec une ligne perso (mon pilote, mon écurie)
// calculée sur le téléphone. Masqué tant qu'une session du week-end est protégée.
export function RecapCard({ event }: { event: Event }) {
  const { s } = useTheme();
  const { prefs, season } = useStore();
  const [recap, setRecap] = useState<Recap | null>(null);
  const hidden = event.sessions.some((x) => prefs.protectedSessions.includes(x.id));
  const ready = hasApi() && season.mode === "live" && Date.now() > recapReadyAt(event);
  useEffect(() => {
    if (!ready || hidden) return;
    let alive = true;
    api(`/api/recap/${event.id}`)
      .then((r) => alive && setRecap(r))
      .catch(() => {}); // pas de clé ou pas encore prêt : la carte reste absente
    return () => {
      alive = false;
    };
  }, [event.id, ready, hidden]);
  if (!ready) return null;
  if (hidden)
    return (
      <View style={s.lock}>
        <Text style={s.text}>Récap du {event.name} masqué : une session est protégée.</Text>
      </View>
    );
  if (!recap) return null;

  const find = (type: string, pred: (r: { driverId: string; team: string }) => boolean) =>
    season.results[`${event.id}:${type}`]?.find(pred);
  const driver = find("Race", (r) => r.driverId === prefs.myDriver);
  const teamName = season.teams.find((t) => t.id === prefs.myTeam)?.name;
  const team = teamName && find("Race", (r) => r.team === teamName);
  const mine = [
    driver && `${driver.name} : ${driver.position}e`,
    team && team !== driver && `${teamName} : meilleure voiture ${team.position}e`,
  ].filter(Boolean);
  return (
    <View style={s.card}>
      <Text style={s.label}>LE RÉCAP DU WEEK-END · RÉDIGÉ PAR IA</Text>
      <Text style={s.cardTitle}>{recap.headline}</Text>
      <Text style={s.text}>{recap.summary}</Text>
      {recap.keyFacts.map((f) => (
        <Text key={f} style={s.text}>
          • {f}
        </Text>
      ))}
      {mine.length > 0 && <Text style={[s.text, { fontWeight: "700" }]}>★ {mine.join(" · ")}</Text>}
      <Text style={s.small}>
        Rédigé automatiquement à partir des résultats officiels et des actualités : peut contenir
        des imprécisions.
      </Text>
    </View>
  );
}
