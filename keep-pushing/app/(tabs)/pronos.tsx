import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { api, hasApi } from "../../src/api.mjs";
import { PARTS, POINTS } from "../../src/bets.mjs";
import { CHAMPION_POINTS } from "../../src/seasons.mjs";
import { RecapCard } from "../../src/RecapCard";
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
  opens: Record<string, number>;
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
    qualiGrid?: boolean;
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

const LABELS: Record<Part, string> = { quali: "Qualifications", sprint: "Sprint", race: "Course" };

export default function Pronos() {
  const { s } = useTheme();
  const { prefs, season } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"bet" | "rank" | "season">("bet");
  // Lien d'une notification de ligue : …/pronos?league=<id>.
  const { league } = useLocalSearchParams<{ league?: string }>();
  useEffect(() => {
    if (league) setTab("rank");
  }, [league]);
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
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "bet" && <Weekend />}
      {tab === "rank" && <Rankings key={league} initial={league} />}
      {tab === "season" && <SeasonTab />}
    </Screen>
  );
}

function Weekend() {
  const { s, c, team } = useTheme();
  const { season, prefs } = useStore();
  const router = useRouter();
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
  const [fillNotice, setFillNotice] = useState("");
  // Mes paris du GP précédent, pour pré-remplir.
  const [prevBet, setPrevBet] = useState<Bet | null>(null);
  useEffect(() => {
    setPrevBet(null);
    if (index > 0)
      call(`/api/bets/${events[index - 1].id}`)
        .then((v: BetView) => setPrevBet(v.mine))
        .catch(() => {});
  }, [index, call]);

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
    setFillNotice("");
  }, [event.id]);

  const name = (id?: string) =>
    season.drivers
      .find((d) => d.id === id)
      ?.name.split(" ")
      .at(-1) ?? "—";
  const teamColor = (id?: string) => team(season.drivers.find((d) => d.id === id)?.teamId ?? "");
  const open = (part: string) =>
    !!view && Date.now() >= view.opens[part] && Date.now() < view.closes[part];
  const status = (part: string) =>
    !view
      ? ""
      : Date.now() < view.opens[part]
        ? `Ouvre le ${formatDate(view.opens[part])}`
        : open(part)
          ? `Ouvert jusqu’au ${formatDate(view.closes[part])}`
          : "Fermé";
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

  // Pré-remplissage : sources possibles pour une partie, de la plus utile à
  // la moins utile. Chaque source donne une liste complète et sans doublon.
  const standings = season.drivers.map((d) => d.id);
  const complete = (list: string[] | undefined, size: number) => {
    if (!list?.length) return null;
    const known = list.filter((id) => standings.includes(id));
    const rest = standings.filter((id) => !known.includes(id));
    return [...new Set([...known, ...rest])].slice(0, size);
  };
  const sources = (part: Part): [string, string[]][] => {
    const size = PARTS[part].size;
    const quali = shown("Qualifying") ? view?.results.Qualifying : undefined;
    const out: [string, string[] | null][] = [
      ["🏁 Grille des qualifs", part === "quali" ? null : complete(quali, size)],
      ["📝 Mon top des qualifs", part === "race" ? complete(draft.quali, size) : null],
      ["↺ Mon prono du GP précédent", complete(prevBet?.[part] ?? prevBet?.race, size)],
      ["🏆 Classement du championnat", complete(standings, size)],
    ];
    return out.filter((x): x is [string, string[]] => !!x[1]);
  };
  const fill = (part: Part, list: string[], label: string) => {
    setDraft((d) => ({ ...d, [part]: list }));
    setSlot(null);
    setFillNotice(
      `${LABELS[part]} pré-rempli (${label.slice(2).toLowerCase()}). Ajustez en touchant deux cases pour les échanger, puis enregistrez.`,
    );
  };
  const fillAll = () => {
    const parts = view!.parts.filter((p) => open(p) && !(draft[p] ?? []).some(Boolean));
    if (!parts.length) return setFillNotice("Tous les tableaux ouverts sont déjà remplis.");
    const next = { ...draft };
    for (const p of parts) next[p] = sources(p)[0][1];
    setDraft(next);
    setSlot(null);
    setFillNotice(
      `${parts.map((p) => LABELS[p]).join(", ")} pré-rempli(s). Ajustez puis enregistrez.`,
    );
  };
  // Toucher une case puis une autre de la même grille : les deux pilotes échangent.
  const tapSlot = (part: Part, i: number) => {
    const list = draft[part];
    if (slot && slot.part === part && slot.i !== i && list?.[slot.i] && list?.[i]) {
      const next = [...list];
      [next[slot.i], next[i]] = [next[i], next[slot.i]];
      setDraft({ ...draft, [part]: next });
      setSlot(null);
      return;
    }
    setSlot({ part, i });
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
          {sc && (
            <StepTotals score={sc} parts={parts} shown={shown} grid={!!view.results.qualiGrid} />
          )}
          {(parts.some(open) || open("fastest")) && (
            <Button
              label="🧭 Faire mes pronos pas à pas"
              onPress={() => router.push(`/bet-wizard?event=${event.id}`)}
            />
          )}
          {parts.some((p) => open(p) && !(draft[p] ?? []).some(Boolean)) && (
            <Button label="⚡ Tout pré-remplir en un geste" secondary onPress={fillAll} />
          )}
          {!!fillNotice && <Text style={s.small}>{fillNotice}</Text>}
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
                  {status(part)}
                  {real ? " · pronostic / réel / points" : ""}
                  {real && part === "quali"
                    ? view.results.qualiGrid
                      ? " · grille officielle (pénalités)"
                      : " · provisoire, corrigé avec la grille de départ"
                    : ""}
                </Text>
                {Array.from({ length: PARTS[part].size }, (_, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    disabled={!open(part)}
                    onPress={() => tapSlot(part, i)}
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
                          { width: 64, textAlign: "right" },
                          score.slots[i] >= POINTS.close && { color: c.accent },
                        ]}
                      >
                        {why(score.slots[i])}
                      </Text>
                    )}
                  </Pressable>
                ))}
                {score?.bonus ? (
                  <Text style={s.small}>Bonus sans-faute : +{score.bonus}</Text>
                ) : null}
                {slot?.part === part && (
                  <>
                    {!!list[slot.i] && (
                      <Text style={s.small}>
                        Touchez une autre case pour échanger, ou choisissez un pilote :
                      </Text>
                    )}
                    <DriverPicker onPick={choose} />
                  </>
                )}
                {open(part) && (
                  <View style={[s.pills, { marginVertical: 0 }]}>
                    {sources(part).map(([label, list]) => (
                      <Pressable
                        key={label}
                        accessibilityRole="button"
                        onPress={() => fill(part, list, label)}
                        style={[s.pill, { paddingVertical: 8, minHeight: 36 }]}
                      >
                        <Text style={s.small}>{label}</Text>
                      </Pressable>
                    ))}
                    {list.some(Boolean) && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setDraft({ ...draft, [part]: [] })}
                        style={[s.pill, { paddingVertical: 8, minHeight: 36 }]}
                      >
                        <Text style={s.small}>✕ Vider</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <View style={s.card}>
            <Text style={s.label}>BONUS COURSE</Text>
            <Text style={s.small}>{status("fastest")}</Text>
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
            <Text style={s.small}>{status("answer")}</Text>
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
            {!view.jokerOn && <Text style={s.small}>{status("joker")}</Text>}
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
          {!!view.mine && !!view.results.Race?.length && <RecapCard eventId={event.id} />}
          {!!notice && <Text style={s.small}>{notice}</Text>}
          <Text style={s.small}>
            Barème par case : place exacte {POINTS.exact} pts · à une place près {POINTS.close} pts
            · dans le top mais mal placé {POINTS.inTop} pts · sans-faute +{POINTS.perfect}. Meilleur
            tour {POINTS.fastest} pts. Abandons : exact {POINTS.dnfExact} pts, à 1 près{" "}
            {POINTS.dnfClose} pts. Question {POINTS.question} pts. Joker : total ×2. Ouverture :
            qualifs, sprint et joker le lundi qui suit le GP précédent ; course, meilleur tour,
            abandons et question 1 h après le début des qualifs.
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

function Rankings({ initial }: { initial?: string }) {
  const { s, c } = useTheme();
  const { prefs } = useStore();
  const call = useCall();
  const [scope, setScope] = useState(initial ?? "general");
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
              <Text style={s.small}>
                Ajoutez des amis depuis le menu ☰ (Amis) pour vous comparer.
              </Text>
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

// Discussion d'une ligue : messages, réactions rapides, effacement.
const REACTIONS = ["👏", "😂", "🔥", "😱", "🏆"];
type Chat = {
  owner: boolean;
  messages: { id: string; pseudo: string; mine: boolean; text: string; at: number }[];
};
function LeagueChat({ id }: { id: string }) {
  const { s, c } = useTheme();
  const call = useCall();
  const { markRead } = useStore();
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
    markRead(`/pronos?league=${id}`);
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

// Explication d'une case : pourquoi elle rapporte ses points.
const why = (p: number) =>
  p === POINTS.exact ? "✓ +10" : p === POINTS.close ? "±1 +5" : p === POINTS.inTop ? "top +2" : "0";

// Compte des points étape par étape (dans l'ordre des sessions), puis bonus
// et joker : chaque ligne donne le gain et le total cumulé.
function StepTotals({
  score,
  parts,
  shown,
  grid,
}: {
  score: NonNullable<BetView["score"]>;
  parts: Part[];
  shown: (session: string) => boolean;
  grid: boolean;
}) {
  const { s, c } = useTheme();
  const steps: [string, number][] = [];
  for (const p of parts) {
    const sc = score[p];
    if (!sc || !shown(PARTS[p].session)) continue;
    steps.push([
      p === "quali"
        ? `Qualifications${grid ? " (grille officielle)" : " (provisoire)"}`
        : LABELS[p],
      sc.total,
    ]);
  }
  if (shown("Race")) {
    if (score.fastest !== null) steps.push(["Meilleur tour", score.fastest]);
    if (score.dnf !== null) steps.push(["Abandons", score.dnf]);
    if (score.answer !== null) steps.push(["Question du week-end", score.answer]);
  }
  if (!steps.length) return null;
  let total = 0;
  const base = steps.reduce((a, [, p]) => a + p, 0);
  return (
    <View style={s.card}>
      <Text style={s.label}>MES POINTS, ÉTAPE PAR ÉTAPE</Text>
      {steps.map(([label, p]) => {
        total += p;
        return (
          <View key={label} style={s.rank}>
            <Text style={[s.text, { flex: 1 }]}>{label}</Text>
            <Text style={[s.time, { width: 50, textAlign: "right" }, p > 0 && { color: c.accent }]}>
              +{p}
            </Text>
            <Text style={[s.cardTitle, { width: 70, textAlign: "right" }]}>{total}</Text>
          </View>
        );
      })}
      {score.joker && (
        <View style={s.rank}>
          <Text style={[s.text, { flex: 1 }]}>🃏 Joker ×2</Text>
          <Text style={[s.time, { width: 50, textAlign: "right", color: c.accent }]}>+{base}</Text>
          <Text style={[s.cardTitle, { width: 70, textAlign: "right" }]}>{base * 2}</Text>
        </View>
      )}
      <Text style={s.small}>
        Par case : ✓ place exacte +{POINTS.exact} · ±1 à une place près +{POINTS.close} · top dans
        le top mais mal placé +{POINTS.inTop}.
      </Text>
    </View>
  );
}
