import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api, hasApi } from "../../src/api.mjs";
import { lockTime } from "../../src/model.mjs";
import { accentFor } from "../../src/teams.mjs";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, formatDate, useTheme } from "../../src/ui";

type Pick = { pole: string; p1: string; p2: string; p3: string };
type GroupView = {
  name: string;
  code: string;
  me: string;
  rounds: {
    eventId: string;
    name: string;
    locked: boolean;
    picks: { pseudo: string; mine: boolean; pick: Pick; points: number | null }[];
  }[];
  leaderboard: { pseudo: string; points: number; mine: boolean }[];
};
const SLOTS: [keyof Pick, string][] = [
  ["pole", "Pole position"],
  ["p1", "Vainqueur"],
  ["p2", "2e"],
  ["p3", "3e"],
];

export default function Pronos() {
  const { s, c } = useTheme();
  const { prefs, update, season } = useStore();
  const group = prefs.group;
  const [view, setView] = useState<GroupView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const token = group && `${group.memberId}.${group.token}`;
  const event = season.events.find((e) => lockTime(e) > Date.now());
  const driverName = (id: string) => season.drivers.find((d) => d.id === id)?.name ?? "—";

  const refresh = useCallback(() => {
    if (!group) return;
    api(`/api/groups/${group.groupId}`, { token })
      .then((v) => {
        setView(v);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [group?.groupId, token]);
  useFocusEffect(refresh);

  if (!hasApi() || season.mode !== "live")
    return (
      <Screen>
        <Text style={s.title}>Pronos.</Text>
        <View style={s.lock}>
          <Text style={s.text}>
            Les pronostics entre amis passent par le serveur Keep Pushing et les vraies données
            de la saison : ouvrez l’app depuis votre serveur.
          </Text>
        </View>
      </Screen>
    );
  if (!group) return <JoinOrCreate onJoined={(g) => update({ group: g })} />;

  const mine = view?.rounds.find((r) => r.eventId === event?.id)?.picks.find((p) => p.mine)?.pick;
  const lastLocked = view?.rounds.filter((r) => r.locked).at(-1);
  return (
    <Screen>
      <Text style={s.title}>{group.name}</Text>
      <Text style={s.subtitle}>
        Code d’invitation : <Text style={{ fontWeight: "700", color: c.accent }}>{group.code}</Text>
        {"  "}· vous jouez en tant que {view?.me ?? "…"}
      </Text>
      {!!error && <Text style={s.error}>{error}</Text>}

      {event && (
        <PickEditor
          key={`${event.id}-${mine ? "x" : "o"}`}
          eventName={event.name}
          closesAt={lockTime(event)}
          initial={mine}
          onSave={async (pick) => {
            try {
              setView(
                await api(`/api/groups/${group.groupId}/predictions/${event.id}`, {
                  method: "PUT",
                  body: pick,
                  token,
                }),
              );
              setNotice("Pronos enregistrés. Vous pouvez les modifier jusqu’à la fermeture.");
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Échec de l’enregistrement.");
            }
          }}
        />
      )}
      {!!notice && <Text style={s.small}>{notice}</Text>}

      <Text style={s.heading}>Classement du groupe</Text>
      {prefs.protectedSessions.length > 0 ? (
        <View style={s.lock}>
          <Text style={s.text}>Classement masqué : il dévoilerait une session protégée.</Text>
        </View>
      ) : (
        <View style={s.card}>
          {(view?.leaderboard ?? []).map((l, i) => (
            <View key={l.pseudo} style={[s.rank, l.mine && s.mine]}>
              <Text style={s.position}>{i + 1}</Text>
              <Text style={[s.text, { flex: 1 }]}>{l.pseudo}</Text>
              <Text style={s.time}>{l.points} pts</Text>
            </View>
          ))}
          <Text style={s.small}>Pole exacte 3 pts · place exacte sur le podium 5 pts · sur le podium 2 pts.</Text>
        </View>
      )}

      {lastLocked && prefs.protectedSessions.length === 0 && (
        <>
          <Text style={s.heading}>{lastLocked.name} : les pronos</Text>
          {lastLocked.picks.map((p) => (
            <View key={p.pseudo} style={[s.card, p.mine && { borderWidth: 2, borderColor: c.accent }]}>
              <Text style={s.cardTitle}>
                {p.pseudo} {p.points !== null ? `· ${p.points} pts` : "· en attente des résultats"}
              </Text>
              <Text style={s.small}>
                Pole {driverName(p.pick.pole)} · 1. {driverName(p.pick.p1)} · 2.{" "}
                {driverName(p.pick.p2)} · 3. {driverName(p.pick.p3)}
              </Text>
            </View>
          ))}
        </>
      )}
      <Button label="Quitter ce groupe sur cet appareil" onPress={() => update({ group: null })} secondary />
    </Screen>
  );

}

function PickEditor({
  eventName,
  closesAt,
  initial,
  onSave,
}: {
  eventName: string;
  closesAt: number;
  initial?: Pick;
  onSave: (p: Pick) => void;
}) {
  const { s } = useTheme();
  const { season } = useStore();
  const driverName = (id: string) => season.drivers.find((d) => d.id === id)?.name ?? "—";
  const [pick, setPick] = useState<Partial<Pick>>(initial ?? {});
  const [slot, setSlot] = useState<keyof Pick | null>(initial ? null : "pole");
  const complete = SLOTS.every(([k]) => pick[k]);
  return (
    <View style={s.card}>
      <Text style={s.label}>VOS PRONOS · {eventName.toUpperCase()}</Text>
      <Text style={s.small}>Ouverts jusqu’au {formatDate(closesAt)} (premières qualifications).</Text>
      {SLOTS.map(([k, label]) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          onPress={() => setSlot(k)}
          style={[s.session, slot === k && s.mine]}
        >
          <Text style={[s.text, { flex: 1 }]}>{label}</Text>
          <Text style={s.link}>{pick[k] ? driverName(pick[k]!) : "Choisir"}</Text>
        </Pressable>
      ))}
      {slot && (
        <View style={s.pills}>
          {season.drivers.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={d.name}
              onPress={() => {
                setPick({ ...pick, [slot]: d.id });
                const next = SLOTS.findIndex(([k]) => k === slot) + 1;
                setSlot(SLOTS[next]?.[0] ?? null);
              }}
              style={[s.pill, { borderColor: accentFor(d.teamId) }]}
            >
              <Text style={[s.text, { color: accentFor(d.teamId) }]}>{d.name.split(" ").at(-1)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button
        label={complete ? "Enregistrer mes pronos" : "Choisissez vos 4 pilotes"}
        onPress={() => complete && onSave(pick as Pick)}
      />
    </View>
  );
}

function JoinOrCreate({ onJoined }: { onJoined: (g: NonNullable<ReturnType<typeof useStore>["prefs"]["group"]>) => void }) {
  const { s, c } = useTheme();
  const [mode, setMode] = useState<"join" | "create">("join");
  const [pseudo, setPseudo] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setError(""), [mode]);
  const submit = async () => {
    setBusy(true);
    try {
      onJoined(
        mode === "join"
          ? await api("/api/groups/join", { method: "POST", body: { code: value, pseudo } })
          : await api("/api/groups", { method: "POST", body: { name: value, pseudo } }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec.");
    } finally {
      setBusy(false);
    }
  };
  const input = { borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, fontSize: 16, color: c.ink, backgroundColor: c.card };
  return (
    <Screen>
      <Text style={s.title}>Pronos.</Text>
      <Text style={s.subtitle}>
        Pronostiquez pole et podium avant chaque Grand Prix, entre amis.
      </Text>
      <Pills
        options={[
          ["join", "Rejoindre un groupe"],
          ["create", "Créer un groupe"],
        ]}
        value={mode}
        onChange={setMode}
      />
      <View style={s.card}>
        <Text style={s.text}>Votre pseudo</Text>
        <TextInput style={input} value={pseudo} onChangeText={setPseudo} maxLength={20} placeholder="ex. Quentin" />
        <Text style={s.text}>{mode === "join" ? "Code d’invitation (6 caractères)" : "Nom du groupe"}</Text>
        <TextInput
          style={input}
          value={value}
          onChangeText={setValue}
          maxLength={mode === "join" ? 6 : 40}
          autoCapitalize={mode === "join" ? "characters" : "sentences"}
          placeholder={mode === "join" ? "ex. Q562KW" : "ex. Les Tifosi"}
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button
          label={busy ? "…" : mode === "join" ? "Rejoindre" : "Créer le groupe"}
          onPress={() => !busy && submit()}
        />
      </View>
      <Text style={s.small}>
        Sans compte : cet appareil garde une clé privée qui vous identifie dans le groupe.
      </Text>
    </Screen>
  );
}
