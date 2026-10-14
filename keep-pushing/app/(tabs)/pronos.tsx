import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, hasApi } from "../../src/api.mjs";
import { PARTS, POINTS } from "../../src/bets.mjs";
import { accentFor } from "../../src/teams.mjs";
import { useStore } from "../../src/store";
import { Button, DriverPicker, Pills, Screen, formatDate, useTheme } from "../../src/ui";

type Part = keyof typeof PARTS;
type Bet = { quali?: string[]; sprint?: string[]; race?: string[]; fastest?: string; dnf?: number };
type PartScore = { slots: number[]; bonus: number; total: number } | null;
type BetView = {
  eventId: string;
  parts: Part[];
  closes: Record<string, number>;
  mine: Bet | null;
  score:
    | (Record<Part, PartScore> & { fastest: number | null; dnf: number | null; total: number })
    | null;
  results: Partial<Record<"Qualifying" | "Sprint" | "Race", string[]>> & {
    fastest: string | null;
    dnf: number | null;
  };
  friends: { pseudo: string; bet: Bet; score: number }[];
};
type Rank = { rank: number; pseudo: string; points: number; weekends: number; me: boolean };
type Person = { id: string; pseudo: string };
type Friends = { me: Person; friends: Person[]; incoming: Person[]; outgoing: Person[] };

const LABELS: Record<Part, string> = { quali: "Qualifications", sprint: "Sprint", race: "Course" };

// Appel authentifié ; une session expirée déconnecte l'appareil.
function useCall() {
  const { prefs, update } = useStore();
  return useCallback(
    async (path: string, options: { method?: string; body?: unknown } = {}) => {
      try {
        return await api(path, { ...options, token: prefs.account?.token });
      } catch (e) {
        if ((e as { status?: number }).status === 401) update({ account: null });
        throw e;
      }
    },
    [prefs.account?.token],
  );
}

export default function Pronos() {
  const { s } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"bet" | "rank" | "friends">("bet");
  if (!hasApi() || season.mode !== "live")
    return (
      <Screen>
        <Text style={s.title}>Pronos.</Text>
        <View style={s.lock}>
          <Text style={s.text}>
            Les pronos passent par le serveur Keep Pushing et les vraies données de la saison :
            ouvrez l’app depuis votre serveur.
          </Text>
        </View>
      </Screen>
    );
  if (!prefs.account)
    return (
      <Screen>
        <Text style={s.title}>Pronos.</Text>
        <Text style={s.subtitle}>
          Pariez sur le top 10 des qualifs et de la course, le sprint, le meilleur tour et les
          abandons. Classement général de tous les joueurs et classement entre amis.
        </Text>
        <Button label="Se connecter ou créer un compte" onPress={() => router.push("/login")} />
      </Screen>
    );
  return (
    <Screen>
      <Text style={s.title}>Pronos.</Text>
      <Text style={s.subtitle}>Connecté en tant que {prefs.account.pseudo}</Text>
      <Pills
        options={[
          ["bet", "Mes paris"],
          ["rank", "Classements"],
          ["friends", "Amis"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "bet" && <Weekend />}
      {tab === "rank" && <Rankings />}
      {tab === "friends" && <FriendsTab />}
    </Screen>
  );
}

function Weekend() {
  const { s, c } = useTheme();
  const { season, prefs } = useStore();
  const call = useCall();
  const events = season.events;
  const next = events.findIndex((e) => Date.parse(e.sessions.at(-1)!.startsAt) > Date.now());
  const [index, setIndex] = useState(next === -1 ? events.length - 1 : next);
  const event = events[index];
  const [view, setView] = useState<BetView | null>(null);
  const [draft, setDraft] = useState<Bet>({});
  const [slot, setSlot] = useState<{ part: Part | "fastest"; i: number } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setView(null);
    call(`/api/bets/${event.id}`)
      .then((v: BetView) => {
        setView(v);
        setDraft(v.mine ?? {});
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [event.id, call]);
  useFocusEffect(load);
  useEffect(() => {
    setSlot(null);
    setNotice("");
  }, [event.id]);

  const name = (id?: string) =>
    season.drivers
      .find((d) => d.id === id)
      ?.name.split(" ")
      .at(-1) ?? "—";
  const teamColor = (id?: string) =>
    accentFor(season.drivers.find((d) => d.id === id)?.teamId ?? "");
  const open = (part: string) => !!view && Date.now() < view.closes[part];
  // Résultats masqués tant que la session est protégée par l'anti-spoil.
  const shown = (session: string) => !prefs.protectedSessions.includes(`${event.id}:${session}`);

  const choose = (id: string) => {
    if (!slot) return;
    if (slot.part === "fastest") {
      setDraft({ ...draft, fastest: id });
      setSlot(null);
      return;
    }
    const { part, i } = slot;
    const list = [...(draft[part] ?? Array(PARTS[part].size).fill(""))];
    const before = list.indexOf(id);
    if (before !== -1) list[before] = list[i]; // déjà placé : on échange
    list[i] = id;
    setDraft({ ...draft, [part]: list });
    const empty = list.findIndex((x) => !x);
    setSlot(empty === -1 ? null : { part, i: empty });
  };

  const save = async () => {
    const body: Record<string, unknown> = {};
    for (const part of view!.parts.filter(open)) {
      const list = draft[part] ?? [];
      if (list.length && list.some((x) => !x))
        return setError(`Complétez les ${PARTS[part].size} places : ${LABELS[part]}.`);
      body[part] = list.length ? list : null;
    }
    if (open("fastest")) {
      body.fastest = draft.fastest ?? null;
      body.dnf = draft.dnf ?? null;
    }
    try {
      const v: BetView = await call(`/api/bets/${event.id}`, { method: "PUT", body });
      setView(v);
      setDraft(v.mine ?? {});
      setError("");
      setNotice("Paris enregistrés. Modifiables jusqu’au départ de chaque session.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l’enregistrement.");
    }
  };

  const parts = (view?.parts ?? []).slice().sort((a, b) => view!.closes[a] - view!.closes[b]);
  const anyOpen = parts.some(open) || open("fastest");
  const sc = view?.score;
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Button label="‹" secondary onPress={() => setIndex(Math.max(0, index - 1))} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {event.name.replace(" Grand Prix", "")}
          </Text>
          <Text style={s.small}>
            Manche {event.round} · {formatDate(event.sessions.at(-1)!.startsAt)}
          </Text>
        </View>
        <Button
          label="›"
          secondary
          onPress={() => setIndex(Math.min(events.length - 1, index + 1))}
        />
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      {!view ? (
        !error && <Text style={s.small}>Chargement…</Text>
      ) : (
        <>
          {sc && sc.total > 0 && shown("Race") && (
            <Text style={s.heading}>
              Total du week-end : <Text style={{ color: c.accent }}>{sc.total} pts</Text>
            </Text>
          )}
          {parts.map((part) => {
            const session = PARTS[part].session;
            const real = shown(session) ? view.results[session as "Race"] : undefined;
            const score = shown(session) ? sc?.[part] : null;
            const list = draft[part] ?? [];
            return (
              <View key={part} style={s.card}>
                <Text style={s.label}>
                  {LABELS[part].toUpperCase()} · TOP {PARTS[part].size}
                  {score ? `  ·  ${score.total} PTS` : ""}
                </Text>
                <Text style={s.small}>
                  {open(part) ? `Ouvert jusqu’au ${formatDate(view.closes[part])}` : "Fermé"}
                  {real ? " · pronostic / réel / points" : ""}
                </Text>
                {Array.from({ length: PARTS[part].size }, (_, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    disabled={!open(part)}
                    onPress={() => setSlot({ part, i })}
                    style={[s.rank, slot?.part === part && slot.i === i && s.mine]}
                  >
                    <Text style={[s.position, { width: 28 }]}>{i + 1}</Text>
                    <Text
                      style={[s.text, { flex: 1, color: list[i] ? teamColor(list[i]) : c.muted }]}
                    >
                      {list[i] ? name(list[i]) : open(part) ? "Choisir" : "—"}
                    </Text>
                    {real && <Text style={[s.small, { width: 90 }]}>{name(real[i])}</Text>}
                    {score && (
                      <Text
                        style={[
                          s.time,
                          { width: 44, textAlign: "right" },
                          score.slots[i] >= POINTS.close && { color: c.accent },
                        ]}
                      >
                        {score.slots[i] ? `+${score.slots[i]}` : "0"}
                      </Text>
                    )}
                  </Pressable>
                ))}
                {score?.bonus ? (
                  <Text style={s.small}>Bonus sans-faute : +{score.bonus}</Text>
                ) : null}
                {slot?.part === part && <DriverPicker onPick={choose} />}
              </View>
            );
          })}

          <View style={s.card}>
            <Text style={s.label}>BONUS COURSE</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!open("fastest")}
              onPress={() => setSlot({ part: "fastest", i: 0 })}
              style={[s.rank, slot?.part === "fastest" && s.mine]}
            >
              <Text style={[s.text, { flex: 1 }]}>Meilleur tour</Text>
              <Text style={[s.text, { color: draft.fastest ? teamColor(draft.fastest) : c.muted }]}>
                {draft.fastest ? name(draft.fastest) : open("fastest") ? "Choisir" : "—"}
              </Text>
              {shown("Race") && sc?.fastest !== null && sc?.fastest !== undefined && (
                <Text style={[s.time, { width: 44, textAlign: "right" }]}>+{sc.fastest}</Text>
              )}
            </Pressable>
            {slot?.part === "fastest" && <DriverPicker onPick={choose} />}
            <View style={s.rank}>
              <Text style={[s.text, { flex: 1 }]}>Abandons en course</Text>
              {open("dnf") && (
                <Button
                  label="−"
                  secondary
                  onPress={() => setDraft({ ...draft, dnf: Math.max(0, (draft.dnf ?? 0) - 1) })}
                />
              )}
              <Text style={[s.cardTitle, { minWidth: 32, textAlign: "center" }]}>
                {draft.dnf ?? "—"}
              </Text>
              {open("dnf") && (
                <Button
                  label="+"
                  secondary
                  onPress={() => setDraft({ ...draft, dnf: Math.min(22, (draft.dnf ?? 0) + 1) })}
                />
              )}
              {shown("Race") && sc?.dnf !== null && sc?.dnf !== undefined && (
                <Text style={[s.time, { width: 44, textAlign: "right" }]}>+{sc.dnf}</Text>
              )}
            </View>
            {shown("Race") && view.results.dnf !== null && (
              <Text style={s.small}>
                Réel : meilleur tour {name(view.results.fastest ?? undefined)}, {view.results.dnf}{" "}
                abandon(s).
              </Text>
            )}
          </View>

          {anyOpen && <Button label="Enregistrer mes paris" onPress={save} />}
          {!!notice && <Text style={s.small}>{notice}</Text>}
          <Text style={s.small}>
            Barème par case : place exacte {POINTS.exact} pts · à une place près {POINTS.close} pts
            · dans le top mais mal placé {POINTS.inTop} pts · sans-faute +{POINTS.perfect}. Meilleur
            tour {POINTS.fastest} pts. Abandons : exact {POINTS.dnfExact} pts, à 1 près{" "}
            {POINTS.dnfClose} pts.
          </Text>

          {view.friends.length > 0 && (
            <>
              <Text style={s.heading}>Les paris de vos amis</Text>
              <Text style={s.small}>Visibles une fois chaque session fermée.</Text>
              {view.friends.map((f) => (
                <View key={f.pseudo} style={s.card}>
                  <Text style={s.cardTitle}>
                    {f.pseudo}
                    {shown("Race") && f.score ? ` · ${f.score} pts` : ""}
                  </Text>
                  {parts
                    .filter((p) => f.bet[p])
                    .map((p) => (
                      <Text key={p} style={s.small}>
                        {LABELS[p]} : {f.bet[p]!.map((id, i) => `${i + 1}. ${name(id)}`).join("  ")}
                      </Text>
                    ))}
                  {f.bet.fastest && (
                    <Text style={s.small}>Meilleur tour : {name(f.bet.fastest)}</Text>
                  )}
                  {f.bet.dnf !== undefined && <Text style={s.small}>Abandons : {f.bet.dnf}</Text>}
                  {!parts.some((p) => f.bet[p]) && f.bet.fastest === undefined && (
                    <Text style={s.small}>Paris encore secrets.</Text>
                  )}
                </View>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

function Rankings() {
  const { s } = useTheme();
  const { prefs } = useStore();
  const call = useCall();
  const [scope, setScope] = useState<"general" | "friends">("general");
  const [data, setData] = useState<{ general: Rank[]; friends: Rank[]; players: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      call("/api/leaderboard")
        .then(setData)
        .catch((e) => setError(e.message));
    }, [call]),
  );
  if (prefs.protectedSessions.length > 0)
    return (
      <View style={s.lock}>
        <Text style={s.text}>Classements masqués : ils dévoileraient une session protégée.</Text>
      </View>
    );
  const rows = data?.[scope] ?? [];
  return (
    <>
      <Pills
        options={[
          ["general", "Général"],
          ["friends", "Entre amis"],
        ]}
        value={scope}
        onChange={setScope}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      {data && scope === "general" && <Text style={s.small}>{data.players} joueurs inscrits</Text>}
      <View style={s.card}>
        {rows.map((r) => (
          <View key={r.pseudo} style={[s.rank, r.me && s.mine]}>
            <Text style={[s.position, { width: 36 }]}>{r.rank}</Text>
            <Text style={[s.text, { flex: 1 }]}>{r.pseudo}</Text>
            <Text style={s.small}>{r.weekends} GP</Text>
            <Text style={[s.time, { width: 70, textAlign: "right" }]}>{r.points} pts</Text>
          </View>
        ))}
        {scope === "friends" && rows.length <= 1 && (
          <Text style={s.small}>Ajoutez des amis dans l’onglet Amis pour vous comparer.</Text>
        )}
      </View>
    </>
  );
}

function FriendsTab() {
  const { s, c } = useTheme();
  const call = useCall();
  const [data, setData] = useState<Friends | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState("");
  const run = (p: Promise<Friends>) =>
    p
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  useFocusEffect(useCallback(() => void run(call("/api/me")), [call]));
  const add = (who: string) => run(call("/api/friends", { method: "POST", body: { pseudo: who } }));
  const remove = (id: string) => run(call(`/api/friends/${id}`, { method: "DELETE" }));
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  const Row = ({ p, children }: { p: Person; children: React.ReactNode }) => (
    <View style={[s.rank, { gap: 8 }]}>
      <Text style={[s.text, { flex: 1 }]}>{p.pseudo}</Text>
      {children}
    </View>
  );
  return (
    <>
      <View style={s.card}>
        <Text style={s.text}>Ajouter un ami par son pseudo</Text>
        <TextInput
          style={input}
          value={pseudo}
          onChangeText={setPseudo}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Pseudo"
        />
        <Button
          label="Ajouter"
          onPress={() => {
            if (!pseudo.trim()) return;
            add(pseudo).then(() => setPseudo(""));
          }}
        />
        {!!error && <Text style={s.error}>{error}</Text>}
      </View>
      {!!data?.incoming.length && (
        <>
          <Text style={s.heading}>Demandes reçues</Text>
          <View style={s.card}>
            {data.incoming.map((p) => (
              <Row key={p.id} p={p}>
                <Button label="Accepter" onPress={() => add(p.pseudo)} />
                <Button label="Refuser" secondary onPress={() => remove(p.id)} />
              </Row>
            ))}
          </View>
        </>
      )}
      <Text style={s.heading}>Mes amis</Text>
      <View style={s.card}>
        {data?.friends.map((p) => (
          <Row key={p.id} p={p}>
            <Button label="Retirer" secondary onPress={() => remove(p.id)} />
          </Row>
        ))}
        {data?.outgoing.map((p) => (
          <Row key={p.id} p={p}>
            <Text style={s.small}>En attente</Text>
            <Button label="Annuler" secondary onPress={() => remove(p.id)} />
          </Row>
        ))}
        {data && !data.friends.length && !data.outgoing.length && (
          <Text style={s.small}>Pas encore d’amis : ajoutez-les par leur pseudo.</Text>
        )}
      </View>
    </>
  );
}
