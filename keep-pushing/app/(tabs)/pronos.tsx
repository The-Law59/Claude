import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, hasApi } from "../../src/api.mjs";
import { PARTS, POINTS } from "../../src/bets.mjs";
import { CHAMPION_POINTS } from "../../src/seasons.mjs";
import { useStore } from "../../src/store";
import {
  Button,
  DriverPicker,
  Pills,
  Screen,
  Toggle,
  formatDate,
  ordinal,
  useCall,
  useTheme,
} from "../../src/ui";

type Part = keyof typeof PARTS;
type Bet = {
  quali?: string[];
  sprint?: string[];
  race?: string[];
  fastest?: string;
  dnf?: number;
  answer?: boolean;
  joker?: boolean;
};
type PartScore = { slots: number[]; bonus: number; total: number } | null;
type BetView = {
  eventId: string;
  parts: Part[];
  closes: Record<string, number>;
  mine: Bet | null;
  score:
    | (Record<Part, PartScore> & {
        fastest: number | null;
        dnf: number | null;
        answer: number | null;
        joker: boolean;
        total: number;
      })
    | null;
  question: { id: string; text: string; answer: boolean | null };
  jokerOn: string | null;
  results: Partial<Record<"Qualifying" | "Sprint" | "Race", string[]>> & {
    fastest: string | null;
    dnf: number | null;
  };
  friends: { pseudo: string; bet: Bet; score: number }[];
};
type Rank = { rank: number; pseudo: string; points: number; weekends: number; me: boolean };
type League = { id: string; name: string; code: string; rows: Rank[] };
type Round = {
  eventId: string;
  name: string;
  points: number | null;
  best: { pseudo: string; points: number };
  total: number;
  rank: number;
};
type Boards = {
  general: Rank[];
  friends: Rank[];
  players: number;
  leagues: League[];
  history: Round[];
  palmares: {
    season: string;
    done: boolean;
    left: number;
    podium: { pseudo: string; points: number; me: boolean }[];
    myRank: number | null;
    players: number;
    leagues: { name: string; pseudo: string; points: number }[];
  }[];
};
type Person = { id: string; pseudo: string };
type Friends = { me: Person; friends: Person[]; incoming: Person[]; outgoing: Person[] };

const LABELS: Record<Part, string> = { quali: "Qualifications", sprint: "Sprint", race: "Course" };

export default function Pronos() {
  const { s } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"bet" | "rank" | "season" | "friends">("bet");
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
          ["season", "Palmarès"],
          ["friends", "Amis"],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "bet" && <Weekend />}
      {tab === "rank" && <Rankings />}
      {tab === "season" && <SeasonTab />}
      {tab === "friends" && <FriendsTab />}
    </Screen>
  );
}

function Weekend() {
  const { s, c, team } = useTheme();
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
  const teamColor = (id?: string) => team(season.drivers.find((d) => d.id === id)?.teamId ?? "");
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
      body.answer = draft.answer ?? null;
    }
    if (open("joker")) body.joker = !!draft.joker;
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
  const anyOpen = parts.some(open) || open("fastest") || open("joker");
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
              {sc.joker ? "  (joker ×2)" : ""}
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

          <View style={s.card}>
            <Text style={s.label}>
              QUESTION DU WEEK-END · {POINTS.question} PTS
              {shown("Race") && sc?.answer !== null && sc?.answer !== undefined
                ? `  ·  +${sc.answer}`
                : ""}
            </Text>
            <Text style={s.text}>{view.question.text}</Text>
            {open("answer") ? (
              <Pills
                options={[
                  ["yes", "Oui"],
                  ["no", "Non"],
                ]}
                value={draft.answer === undefined ? "" : draft.answer ? "yes" : "no"}
                onChange={(v) => setDraft({ ...draft, answer: v === "yes" })}
              />
            ) : (
              <Text style={s.small}>
                Votre réponse : {draft.answer === undefined ? "—" : draft.answer ? "Oui" : "Non"}
                {shown("Race") && view.question.answer !== null
                  ? ` · bonne réponse : ${view.question.answer ? "Oui" : "Non"}`
                  : ""}
              </Text>
            )}
          </View>

          <View style={[s.card, draft.joker && { borderWidth: 2, borderColor: c.accent }]}>
            <Text style={s.label}>JOKER · POINTS ×2</Text>
            <Text style={s.small}>
              Un seul par saison : tous les points de ce week-end comptent double. À poser avant la
              première session pariée.
            </Text>
            {view.jokerOn ? (
              <Text style={s.text}>Joker déjà posé sur {view.jokerOn}.</Text>
            ) : open("joker") ? (
              <Toggle
                label="Poser mon joker sur ce Grand Prix"
                value={!!draft.joker}
                onChange={(joker) => setDraft({ ...draft, joker })}
              />
            ) : (
              <Text style={s.text}>
                {draft.joker ? "Joker posé sur ce Grand Prix." : "Pas de joker sur ce Grand Prix."}
              </Text>
            )}
          </View>

          {anyOpen && <Button label="Enregistrer mes paris" onPress={save} />}
          {!!notice && <Text style={s.small}>{notice}</Text>}
          <Text style={s.small}>
            Barème par case : place exacte {POINTS.exact} pts · à une place près {POINTS.close} pts
            · dans le top mais mal placé {POINTS.inTop} pts · sans-faute +{POINTS.perfect}. Meilleur
            tour {POINTS.fastest} pts. Abandons : exact {POINTS.dnfExact} pts, à 1 près{" "}
            {POINTS.dnfClose} pts. Question {POINTS.question} pts. Joker : total ×2.
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
                  {f.bet.answer !== undefined && (
                    <Text style={s.small}>Question : {f.bet.answer ? "Oui" : "Non"}</Text>
                  )}
                  {f.bet.joker && <Text style={s.small}>🃏 Joker posé</Text>}
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
  const { s, c } = useTheme();
  const { prefs } = useStore();
  const call = useCall();
  const [scope, setScope] = useState("general");
  const [data, setData] = useState<Boards | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const run = (p: Promise<Boards>) =>
    p
      .then((d) => {
        setData(d);
        setError("");
        return d;
      })
      .catch((e) => {
        setError(e.message);
        return null;
      });
  useFocusEffect(useCallback(() => void run(call("/api/leaderboard")), [call]));
  if (prefs.protectedSessions.length > 0)
    return (
      <View style={s.lock}>
        <Text style={s.text}>Classements masqués : ils dévoileraient une session protégée.</Text>
      </View>
    );
  const league = data?.leagues.find((l) => l.id === scope);
  const rows = scope === "general" || scope === "friends" ? data?.[scope] : league?.rows;
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  const max = Math.max(
    1,
    ...(data?.history ?? []).map((h) => Math.max(h.points ?? 0, h.best.points)),
  );
  return (
    <>
      <Pills
        options={[
          ["general", "Général"],
          ["friends", "Entre amis"],
          ...(data?.leagues ?? []).map((l): [string, string] => [l.id, l.name]),
          ["history", "Mes manches"],
        ]}
        value={scope}
        onChange={setScope}
      />
      {!!error && <Text style={s.error}>{error}</Text>}
      {scope === "history" ? (
        <>
          <Text style={s.small}>
            Vos points à chaque Grand Prix (barre), le meilleur score de la manche (trait) et votre
            place au général après la manche.
          </Text>
          <View style={s.card}>
            {(data?.history ?? []).map((h) => (
              <View key={h.eventId} style={{ gap: 4, paddingVertical: 6 }}>
                <View style={{ flexDirection: "row" }}>
                  <Text style={[s.text, { flex: 1 }]} numberOfLines={1}>
                    {h.name.replace(" Grand Prix", "")}
                  </Text>
                  <Text style={s.time}>
                    {h.points ?? "—"} pts · {ordinal(h.rank)}
                  </Text>
                </View>
                <View style={{ height: 10, justifyContent: "center" }}>
                  <View
                    style={{
                      width: `${((h.points ?? 0) / max) * 100}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: c.accent,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: `${(h.best.points / max) * 100}%`,
                      width: 2,
                      height: 14,
                      marginLeft: -1,
                      backgroundColor: c.ink,
                    }}
                  />
                </View>
                <Text style={s.small}>
                  Meilleur : {h.best.pseudo} ({h.best.points} pts)
                </Text>
              </View>
            ))}
            {data && !data.history.length && (
              <Text style={s.small}>Aucune manche jouée avec résultats pour l’instant.</Text>
            )}
          </View>
        </>
      ) : (
        <>
          {data && scope === "general" && (
            <Text style={s.small}>{data.players} joueurs inscrits</Text>
          )}
          {league && (
            <Text style={s.small}>
              Code d’invitation :{" "}
              <Text style={{ color: c.accent, fontWeight: "700" }}>{league.code}</Text>
            </Text>
          )}
          <View style={s.card}>
            {(rows ?? []).map((r) => (
              <View key={r.pseudo} style={[s.rank, r.me && s.mine]}>
                <Text style={[s.position, { width: 36 }]}>{r.rank}</Text>
                <Text style={[s.text, { flex: 1 }]}>{r.pseudo}</Text>
                <Text style={s.small}>{r.weekends} GP</Text>
                <Text style={[s.time, { width: 70, textAlign: "right" }]}>{r.points} pts</Text>
              </View>
            ))}
            {scope === "friends" && (rows?.length ?? 0) <= 1 && (
              <Text style={s.small}>Ajoutez des amis dans l’onglet Amis pour vous comparer.</Text>
            )}
          </View>
          {league && <LeagueChat id={league.id} />}
          {league && (
            <Button
              label="Quitter cette ligue"
              secondary
              onPress={() =>
                run(call(`/api/leagues/${league.id}`, { method: "DELETE" })).then(() =>
                  setScope("general"),
                )
              }
            />
          )}
        </>
      )}
      <Text style={s.heading}>Ligues privées</Text>
      <View style={s.card}>
        <Text style={s.text}>Créer une ligue</Text>
        <TextInput
          style={input}
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="ex. Les Tifosi du bureau"
        />
        <Button
          label="Créer"
          onPress={() =>
            name.trim() &&
            run(call("/api/leagues", { method: "POST", body: { name } })).then((d) => {
              const created = d?.leagues.at(-1);
              if (created) setScope(created.id);
              setName("");
            })
          }
        />
        <Text style={s.text}>Rejoindre avec un code</Text>
        <TextInput
          style={input}
          value={code}
          onChangeText={setCode}
          maxLength={6}
          autoCapitalize="characters"
          placeholder="ex. Q562KW"
        />
        <Button
          label="Rejoindre"
          secondary
          onPress={() =>
            code.trim() &&
            run(call("/api/leagues/join", { method: "POST", body: { code } })).then((d) => {
              const joined = d?.leagues.find((l) => l.code === code.trim().toUpperCase());
              if (joined) setScope(joined.id);
              setCode("");
            })
          }
        />
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

// Discussion d'une ligue : messages, réactions rapides, effacement.
const REACTIONS = ["👏", "😂", "🔥", "😱", "🏆"];
type Chat = {
  owner: boolean;
  messages: { id: string; pseudo: string; mine: boolean; text: string; at: number }[];
};
function LeagueChat({ id }: { id: string }) {
  const { s, c } = useTheme();
  const call = useCall();
  const [chat, setChat] = useState<Chat | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const run = (p: Promise<Chat>) =>
    p
      .then((d) => {
        setChat(d);
        setError("");
        return true;
      })
      .catch((e) => {
        setError(e.message);
        return false;
      });
  useEffect(() => {
    run(call(`/api/leagues/${id}/messages`));
    // Nouveaux messages toutes les 20 s tant que la ligue est ouverte.
    const timer = setInterval(() => run(call(`/api/leagues/${id}/messages`)), 20000);
    return () => clearInterval(timer);
  }, [id, call]);
  const send = (t: string) =>
    t.trim() &&
    run(call(`/api/leagues/${id}/messages`, { method: "POST", body: { text: t } })).then(
      (ok) => ok && setText(""),
    );
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  const time = (at: number) =>
    new Date(at).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <Text style={s.heading}>Discussion</Text>
      <View style={s.card}>
        {(chat?.messages ?? []).slice(-50).map((m) => (
          <View key={m.id} style={[s.rank, { alignItems: "flex-start" }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.small}>
                <Text style={{ fontWeight: "700", color: m.mine ? c.accent : c.ink }}>
                  {m.pseudo}
                </Text>{" "}
                · {time(m.at)}
              </Text>
              <Text style={s.text}>{m.text}</Text>
            </View>
            {(m.mine || chat?.owner) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer ce message"
                onPress={() =>
                  run(call(`/api/leagues/${id}/messages/${m.id}`, { method: "DELETE" }))
                }
                style={s.smallButton}
              >
                <Text style={s.small}>Effacer</Text>
              </Pressable>
            )}
          </View>
        ))}
        {chat && !chat.messages.length && (
          <Text style={s.small}>Aucun message : lancez la discussion !</Text>
        )}
        <View style={s.pills}>
          {REACTIONS.map((r) => (
            <Pressable
              key={r}
              accessibilityRole="button"
              accessibilityLabel={`Réagir ${r}`}
              onPress={() => send(r)}
              style={[s.pill, { paddingHorizontal: 12 }]}
            >
              <Text style={{ fontSize: 20 }}>{r}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={input}
          value={text}
          onChangeText={setText}
          maxLength={280}
          placeholder="Votre message…"
          onSubmitEditing={() => send(text)}
        />
        <Button label="Envoyer" onPress={() => send(text)} />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Text style={s.small}>
          Masquée quand une session est protégée, pour éviter les spoilers.
        </Text>
      </View>
    </>
  );
}

// Onglet Saison : pronos des champions et palmarès (podium animé).
type Champions = {
  season: string;
  closes: number;
  mine: { driver?: string; team?: string } | null;
  champions: { driver: string; team: string } | null;
  points: number | null;
  friends: { pseudo: string; driver?: string; team?: string }[];
};
function SeasonTab() {
  const { s, c, team } = useTheme();
  const { prefs, season } = useStore();
  const call = useCall();
  const [data, setData] = useState<Champions | null>(null);
  const [boards, setBoards] = useState<Boards | null>(null);
  const [picking, setPicking] = useState<"driver" | "team" | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      call("/api/champions")
        .then(setData)
        .catch((e) => setError(e.message));
      call("/api/leaderboard")
        .then(setBoards)
        .catch(() => {});
    }, [call]),
  );
  const save = (patch: { driver?: string; team?: string }) =>
    call("/api/champions", { method: "PUT", body: patch })
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  const driver = (id?: string) => season.drivers.find((d) => d.id === id);
  const teamOf = (id?: string) => season.teams.find((t) => t.id === id);
  const open = !!data && Date.now() < data.closes;
  const hidden = prefs.protectedSessions.length > 0;
  const current = boards?.palmares.find((p) => p.season === data?.season) ?? boards?.palmares[0];
  return (
    <>
      <View style={s.card}>
        <Text style={s.label}>
          CHAMPIONS {data?.season ?? ""} · PILOTE {CHAMPION_POINTS.driver} PTS · CONSTRUCTEUR{" "}
          {CHAMPION_POINTS.team} PTS
        </Text>
        <Text style={s.small}>
          {!data
            ? "Chargement…"
            : open
              ? `Ouvert jusqu’au ${formatDate(data.closes)} (6 GP avant la fin). Points comptés à la dernière course.`
              : "Fermé."}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!open}
          onPress={() => setPicking(picking === "driver" ? null : "driver")}
          style={[s.rank, picking === "driver" && s.mine]}
        >
          <Text style={[s.text, { flex: 1 }]}>Champion pilote</Text>
          <Text
            style={[
              s.text,
              {
                color: data?.mine?.driver ? team(driver(data.mine.driver)?.teamId ?? "") : c.muted,
              },
            ]}
          >
            {driver(data?.mine?.driver)?.name ?? (open ? "Choisir" : "—")}
          </Text>
        </Pressable>
        {picking === "driver" && (
          <DriverPicker
            onPick={(id) => {
              setPicking(null);
              save({ driver: id });
            }}
          />
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!open}
          onPress={() => setPicking(picking === "team" ? null : "team")}
          style={[s.rank, picking === "team" && s.mine]}
        >
          <Text style={[s.text, { flex: 1 }]}>Champion constructeur</Text>
          <Text style={[s.text, { color: data?.mine?.team ? team(data.mine.team) : c.muted }]}>
            {teamOf(data?.mine?.team)?.name ?? (open ? "Choisir" : "—")}
          </Text>
        </Pressable>
        {picking === "team" && (
          <View style={s.pills}>
            {season.teams.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => {
                  setPicking(null);
                  save({ team: t.id });
                }}
                style={[s.pill, { borderColor: team(t.id) }]}
              >
                <Text style={[s.text, { color: team(t.id) }]}>{t.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {data?.champions && !hidden && (
          <Text style={s.text}>
            Champions : {driver(data.champions.driver)?.name} et {teamOf(data.champions.team)?.name}{" "}
            · vos points : +{data.points ?? 0}
          </Text>
        )}
        {data?.friends.map((f) => (
          <Text key={f.pseudo} style={s.small}>
            {f.pseudo} : {driver(f.driver)?.name ?? "—"} · {teamOf(f.team)?.name ?? "—"}
          </Text>
        ))}
        {!!error && <Text style={s.error}>{error}</Text>}
      </View>

      <Text style={s.heading}>Palmarès</Text>
      {hidden ? (
        <View style={s.lock}>
          <Text style={s.text}>Palmarès masqué : il dévoilerait une session protégée.</Text>
        </View>
      ) : (
        <>
          {current && <Podium entry={current} />}
          {(boards?.palmares ?? [])
            .filter((p) => p !== current)
            .map((p) => (
              <View key={p.season} style={s.card}>
                <Text style={s.label}>SAISON {p.season}</Text>
                <Text style={s.text}>
                  🏆 {p.podium[0]?.pseudo} ({p.podium[0]?.points} pts) · votre place :{" "}
                  {p.myRank ? ordinal(p.myRank) : "—"} sur {p.players}
                </Text>
              </View>
            ))}
          {boards && !boards.palmares.length && (
            <Text style={s.small}>Le palmarès se remplit avec les premiers résultats.</Text>
          )}
        </>
      )}
    </>
  );
}

function Podium({ entry }: { entry: Boards["palmares"][number] }) {
  const { s, c } = useTheme();
  const steps = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    steps.forEach((v) => v.setValue(0));
    // Révélation du 3e au 1er, comme pour le podium des courses.
    Animated.stagger(
      350,
      [2, 1, 0].map((i) =>
        Animated.timing(steps[i], { toValue: 1, duration: 500, useNativeDriver: true }),
      ),
    ).start();
  }, [entry.season]);
  const heights = [120, 90, 70];
  const order = [1, 0, 2]; // 2e, 1er, 3e
  return (
    <View style={[s.card, { gap: 12 }]}>
      <Text style={s.label}>
        SAISON {entry.season} ·{" "}
        {entry.done ? "PODIUM FINAL" : `PROVISOIRE · ENCORE ${entry.left} GP`}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        {order.map((i) => {
          const p = entry.podium[i];
          return (
            <Animated.View
              key={i}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 4,
                opacity: steps[i],
                transform: [
                  {
                    translateY: steps[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
                  },
                ],
              }}
            >
              <Text style={{ fontSize: i === 0 ? 34 : 26 }}>{["🏆", "🥈", "🥉"][i]}</Text>
              <Text style={[s.cardTitle, p?.me && { color: c.accent }]} numberOfLines={1}>
                {p?.pseudo ?? "—"}
              </Text>
              <Text style={s.small}>{p ? `${p.points} pts` : ""}</Text>
              <View
                style={{
                  height: heights[i],
                  alignSelf: "stretch",
                  borderRadius: 8,
                  backgroundColor: i === 0 ? c.accentBg : c.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[s.title, { marginTop: 0, color: i === 0 ? "#fff" : c.accent }]}>
                  {i + 1}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
      <Text style={s.text}>
        Votre place : {entry.myRank ? ordinal(entry.myRank) : "—"} sur {entry.players} joueurs.
      </Text>
      {entry.leagues.map((l) => (
        <Text key={l.name} style={s.small}>
          {entry.done ? "Champion" : "En tête"} de « {l.name} » : {l.pseudo} ({l.points} pts)
        </Text>
      ))}
    </View>
  );
}
