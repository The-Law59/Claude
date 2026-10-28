import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PARTS } from "../src/bets.mjs";
import { useStore } from "../src/store";
import { Button, Screen, formatDate, useCall, useTheme } from "../src/ui";

type Part = keyof typeof PARTS;
type Bet = Partial<Record<Part, string[]>> & {
  fastest?: string;
  dnf?: number;
  answer?: boolean;
  joker?: boolean;
};
type View_ = {
  parts: Part[];
  opens: Record<string, number>;
  closes: Record<string, number>;
  mine: Bet | null;
  question: { text: string };
  jokerOn: string | null;
};
// Une étape = une question : une place d'un classement, ou un bonus.
type Step =
  | { kind: "slot"; part: Part; i: number }
  | { kind: "fastest" }
  | { kind: "dnf" }
  | { kind: "answer" }
  | { kind: "joker" };

const ASK: Record<Part, (i: number) => string> = {
  quali: (i) => (i === 0 ? "Qui fait la pole position ?" : `Qui est ${i + 1}e des qualifs ?`),
  sprint: (i) => (i === 0 ? "Qui gagne le sprint ?" : `Qui finit ${i + 1}e du sprint ?`),
  race: (i) => (i === 0 ? "Qui gagne la course ?" : `Qui finit ${i + 1}e de la course ?`),
};
const PART_LABEL: Record<Part, string> = {
  quali: "Qualifications",
  sprint: "Sprint",
  race: "Course",
};

// Assistant de paris : une question par écran, grande grille de pilotes,
// retour en arrière, raccourci « compléter le reste », résumé puis envoi.
export default function BetWizard() {
  const { s, c, team } = useTheme();
  const { season } = useStore();
  const router = useRouter();
  const call = useCall();
  const { event: eventId } = useLocalSearchParams<{ event: string }>();
  const event = season.events.find((e) => e.id === eventId);
  const [view, setView] = useState<View_ | null>(null);
  const [bet, setBet] = useState<Bet>({});
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!event) return;
    call(`/api/bets/${event.id}`)
      .then((v: View_) => {
        setView(v);
        setBet(v.mine ?? {});
      })
      .catch((e) => setError(e.message));
  }, [event?.id, call]);

  const now = Date.now();
  const open = (k: string) => !!view && now >= view.opens[k] && now < view.closes[k];
  const steps: Step[] = useMemo(() => {
    if (!view) return [];
    const parts = view.parts.filter(open).sort((a, b) => view.closes[a] - view.closes[b]);
    const out: Step[] = parts.flatMap((part) =>
      Array.from({ length: PARTS[part].size }, (_, i) => ({ kind: "slot" as const, part, i })),
    );
    if (open("fastest")) out.push({ kind: "fastest" }, { kind: "dnf" }, { kind: "answer" });
    if (open("joker") && !view.jokerOn) out.push({ kind: "joker" });
    return out;
  }, [view]);

  const back = (
    <Button
      label="← Quitter l’assistant"
      secondary
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/pronos"))}
    />
  );
  if (!event || error)
    return (
      <Screen>
        {back}
        <Text style={s.error}>{error || "Grand Prix introuvable."}</Text>
      </Screen>
    );
  if (!view)
    return (
      <Screen>
        {back}
        <Text style={s.small}>Chargement…</Text>
      </Screen>
    );
  if (!steps.length)
    return (
      <Screen>
        {back}
        <View style={s.card}>
          <Text style={s.text}>Aucun pari ouvert pour l’instant sur ce Grand Prix.</Text>
        </View>
      </Screen>
    );

  const last = (id?: string) =>
    season.drivers
      .find((d) => d.id === id)
      ?.name.split(" ")
      .at(-1) ?? "—";
  // Avance d'une étape, une seule fois même en cas de double appui.
  const next = () => setStep((n) => (n === step ? n + 1 : n));
  const pickDriver = (id: string) => {
    const cur = steps[step];
    if (cur.kind === "fastest") setBet((b) => ({ ...b, fastest: id }));
    else if (cur.kind === "slot") {
      // Un pilote déjà placé ailleurs dans ce classement n'est pas sélectionnable :
      // pour le déplacer, revenir à sa place avec « Retour ».
      const placed = (bet[cur.part] ?? []).indexOf(id);
      if (placed !== -1 && placed !== cur.i) return;
      setBet((b) => {
        const list = [...(b[cur.part] ?? Array(PARTS[cur.part].size).fill(""))];
        if (list.some((x, i) => x === id && i !== cur.i)) return b;
        list[cur.i] = id;
        return { ...b, [cur.part]: list };
      });
    }
    next();
  };
  // Compléter les places restantes d'un classement avec l'ordre du championnat.
  const fillRest = (part: Part) => {
    const list = [...(bet[part] ?? Array(PARTS[part].size).fill(""))];
    const rest = season.drivers.map((d) => d.id).filter((id) => !list.includes(id));
    const filled = list.map((x) => x || rest.shift()!);
    setBet({ ...bet, [part]: filled });
    // On saute à la fin de ce classement.
    setStep(
      steps.findIndex(
        (st) => st.kind === "slot" && st.part === part && st.i === PARTS[part].size - 1,
      ) + 1,
    );
  };
  const save = async () => {
    const body: Record<string, unknown> = {};
    for (const part of view.parts.filter(open)) {
      const list = bet[part] ?? [];
      if (list.length && list.some((x) => !x))
        return setError(`Il manque des places en ${PART_LABEL[part]}.`);
      if (new Set(list).size !== list.length)
        return setError(`Un pilote est en double en ${PART_LABEL[part]}.`);
      body[part] = list.length ? list : null;
    }
    if (open("fastest")) {
      body.fastest = bet.fastest ?? null;
      body.dnf = bet.dnf ?? null;
      body.answer = bet.answer ?? null;
    }
    if (open("joker")) body.joker = !!bet.joker;
    try {
      await call(`/api/bets/${event.id}`, { method: "PUT", body });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l’enregistrement.");
    }
  };

  const progress = (
    <View style={{ gap: 6 }}>
      <Text style={s.small}>
        {event.name} · étape {Math.min(step + 1, steps.length)} / {steps.length}
      </Text>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.line }}>
        <View
          style={{
            width: `${(Math.min(step, steps.length) / steps.length) * 100}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: c.accent,
          }}
        />
      </View>
    </View>
  );
  const nav = (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {step > 0 && (
        <View style={{ flex: 1 }}>
          <Button label="← Retour" secondary onPress={() => setStep(step - 1)} />
        </View>
      )}
    </View>
  );

  // --- Résumé final.
  if (step >= steps.length)
    return (
      <Screen>
        {back}
        {progress}
        <Text style={s.title}>{saved ? "C’est enregistré ! 🏁" : "Votre résumé"}</Text>
        {view.parts.filter(open).map((part) => (
          <View key={part} style={s.card}>
            <Text style={s.label}>{PART_LABEL[part].toUpperCase()}</Text>
            <Text style={s.text}>
              {(bet[part] ?? []).map((id, i) => `${i + 1}. ${last(id)}`).join("   ") || "—"}
            </Text>
          </View>
        ))}
        {open("fastest") && (
          <View style={s.card}>
            <Text style={s.text}>Meilleur tour : {bet.fastest ? last(bet.fastest) : "—"}</Text>
            <Text style={s.text}>Abandons : {bet.dnf ?? "—"}</Text>
            <Text style={s.text}>
              {view.question.text} {bet.answer === undefined ? "—" : bet.answer ? "Oui" : "Non"}
            </Text>
            {open("joker") && !view.jokerOn && (
              <Text style={s.text}>Joker : {bet.joker ? "posé 🃏" : "non"}</Text>
            )}
          </View>
        )}
        {!!error && <Text style={s.error}>{error}</Text>}
        {saved ? (
          <Button label="Voir mes pronos" onPress={() => router.replace("/pronos")} />
        ) : (
          <>
            <Button label="✅ Enregistrer mes pronos" onPress={save} />
            <Button label="← Modifier" secondary onPress={() => setStep(steps.length - 1)} />
          </>
        )}
        <Text style={s.small}>
          Modifiable jusqu’à la fermeture :{" "}
          {formatDate(Math.min(...view.parts.filter(open).map((p) => view.closes[p])))}.
        </Text>
      </Screen>
    );

  const cur = steps[step];
  const choice = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.card,
        { flex: 1, alignItems: "center", padding: 16 },
        selected && { borderWidth: 2, borderColor: c.accent },
      ]}
    >
      <Text style={s.cardTitle}>{label}</Text>
    </Pressable>
  );

  let title = "";
  let body: React.ReactNode = null;
  if (cur.kind === "slot" || cur.kind === "fastest") {
    title = cur.kind === "slot" ? ASK[cur.part](cur.i) : "Qui fait le meilleur tour en course ?";
    const taken = cur.kind === "slot" ? (bet[cur.part] ?? []) : [];
    const current = cur.kind === "slot" ? taken[cur.i] : bet.fastest;
    body = (
      <>
        {cur.kind === "slot" && (
          <Text style={s.small}>
            {PART_LABEL[cur.part]} · place {cur.i + 1} sur {PARTS[cur.part].size}
            {current ? ` · choix actuel : ${last(current)}` : ""}
          </Text>
        )}
        {cur.kind === "slot" && (
          <Text style={s.small}>
            Les pilotes grisés sont déjà placés : « Retour » pour changer leur place.
          </Text>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {season.drivers.map((d) => {
            const placed = taken.indexOf(d.id);
            const mine = d.id === current;
            // Déjà placé ailleurs dans ce classement : grisé et désactivé.
            const locked = cur.kind === "slot" && placed !== -1 && !mine;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={d.name}
                accessibilityState={{ disabled: locked, selected: mine }}
                disabled={locked}
                onPress={() => pickDriver(d.id)}
                style={{
                  width: "48%",
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: mine ? 3 : 1,
                  borderColor: team(d.teamId),
                  backgroundColor: c.card,
                  opacity: placed !== -1 && !mine ? 0.45 : 1,
                }}
              >
                <Text style={[s.cardTitle, { color: team(d.teamId) }]}>
                  {d.name.split(" ").at(-1)}
                </Text>
                <Text style={s.small}>
                  {d.team}
                  {placed !== -1 && !mine ? ` · déjà ${placed + 1}e` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {cur.kind === "slot" && cur.i > 0 && cur.i < PARTS[cur.part].size - 1 && (
          <Button
            label="⚡ Compléter le reste avec le classement du championnat"
            secondary
            onPress={() => fillRest(cur.part)}
          />
        )}
        {cur.kind === "fastest" && <Button label="Passer" secondary onPress={next} />}
      </>
    );
  } else if (cur.kind === "dnf") {
    title = "Combien d’abandons en course ?";
    body = (
      <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: 9 }, (_, n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              onPress={() => {
                setBet({ ...bet, dnf: n });
                next();
              }}
              style={[
                s.card,
                { width: "30%", alignItems: "center", padding: 16 },
                bet.dnf === n && { borderWidth: 2, borderColor: c.accent },
              ]}
            >
              <Text style={s.title}>{n === 8 ? "8+" : n}</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Passer" secondary onPress={next} />
      </>
    );
  } else if (cur.kind === "answer") {
    title = view.question.text;
    body = (
      <>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {choice("Oui", bet.answer === true, () => {
            setBet({ ...bet, answer: true });
            next();
          })}
          {choice("Non", bet.answer === false, () => {
            setBet({ ...bet, answer: false });
            next();
          })}
        </View>
        <Button label="Passer" secondary onPress={next} />
      </>
    );
  } else {
    title = "Poser votre joker sur ce Grand Prix ?";
    body = (
      <>
        <Text style={s.text}>
          Tous vos points du week-end compteront double. Un seul par saison.
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {choice("🃏 Oui", bet.joker === true, () => {
            setBet({ ...bet, joker: true });
            next();
          })}
          {choice("Pas cette fois", !bet.joker, () => {
            setBet({ ...bet, joker: false });
            next();
          })}
        </View>
      </>
    );
  }
  return (
    <Screen>
      {back}
      {progress}
      <Text style={s.title}>{title}</Text>
      {body}
      {nav}
    </Screen>
  );
}
