import { useEffect, useState } from "react";
import { Share, Text, View } from "react-native";
import { API_URL } from "./api.mjs";
import { shareText } from "./recap.mjs";
import { useStore } from "./store";
import { Button, ordinal, useCall, useTheme } from "./ui";

type Recap = {
  eventId: string;
  event: string;
  points: number;
  joker: boolean;
  exact: number;
  highlights: string[];
  best: { pseudo: string; points: number } | null;
  rankBefore: number | null;
  rankAfter: number | null;
  players: number;
  friends: { total: number; beaten: number };
};

// Récap de mes pronos sur un GP terminé, à partager. Rien tant que la course
// n'a pas de résultat, ni si le week-end est protégé (anti-spoil).
export function RecapCard({ eventId, onClose }: { eventId: string; onClose?: () => void }) {
  const { s, c } = useTheme();
  const { prefs } = useStore();
  const call = useCall();
  const [r, setR] = useState<Recap | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setR(null);
    call(`/api/recap/${eventId}`)
      .then(setR)
      .catch(() => setR(null));
  }, [eventId, call]);
  if (!r || prefs.protectedSessions.some((id) => id.startsWith(`${eventId}:`))) return null;
  const url = API_URL || (typeof location !== "undefined" ? location.origin : "");
  const text = shareText(r, url);
  const share = async () => {
    try {
      const res = await Share.share({ message: text });
      if (res.action === Share.sharedAction) setNotice("Récap partagé !");
    } catch {
      // Navigateur sans partage : on copie le texte.
      await (globalThis as { navigator?: Navigator }).navigator?.clipboard?.writeText(text);
      setNotice("Récap copié : collez-le dans WhatsApp ou un SMS.");
    }
  };
  const move = r.rankBefore && r.rankAfter ? r.rankBefore - r.rankAfter : 0;
  return (
    <View style={[s.card, { borderWidth: 2, borderColor: c.accent }]}>
      <Text style={s.label}>MON RÉCAP · {r.event.toUpperCase()}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text style={[s.title, { marginTop: 0, color: c.accent }]}>{r.points} pts</Text>
        {r.joker && <Text style={[s.small, { paddingBottom: 6 }]}>joker ×2 inclus</Text>}
      </View>
      {r.rankAfter && (
        <Text style={s.text}>
          {move > 0 ? "📈" : move < 0 ? "📉" : "🏆"} {ordinal(r.rankAfter)} au général
          {move
            ? ` (${move > 0 ? "+" : ""}${move} place${Math.abs(move) > 1 ? "s" : ""})`
            : ""} sur {r.players}
        </Text>
      )}
      <Text style={s.text}>
        🎯 {r.exact} place{r.exact > 1 ? "s" : ""} exacte{r.exact > 1 ? "s" : ""}
        {r.friends.total
          ? ` · devant ${r.friends.beaten} ami${r.friends.beaten > 1 ? "s" : ""} sur ${r.friends.total}`
          : ""}
      </Text>
      {r.highlights.slice(0, 3).map((h) => (
        <Text key={h} style={s.small}>
          ⭐ {h}
        </Text>
      ))}
      {r.best && (
        <Text style={s.small}>
          Meilleur score du GP : {r.best.pseudo} ({r.best.points} pts)
        </Text>
      )}
      <Button label="📣 Partager mon récap" onPress={share} />
      {onClose && <Button label="Fermer" secondary onPress={onClose} />}
      {!!notice && <Text style={s.small}>{notice}</Text>}
    </View>
  );
}
