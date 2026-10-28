import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { hasApi } from "../src/api.mjs";
import { useStore } from "../src/store";
import { Button, Pills, Screen, formatDate, useCall, useTheme } from "../src/ui";

type Official = {
  driverId: string;
  teamId: string;
  source: string;
  at: number;
  share: number;
  points: number;
};
type Rumor = {
  id: string;
  driverId: string;
  teamId: string;
  text: string;
  source: string;
  at: number;
  status: "open" | "confirmed" | "denied";
  mine: boolean | null;
  votes: number;
  credible: number | null;
  points: number | null;
};
type Game = {
  year: number;
  teams: { id: string; name: string; today: string[] }[];
  drivers: { id: string; name: string }[];
  mine: Record<string, string[]>;
  official: Official[];
  rumors: Rumor[];
  score: { seats: number; rumors: number; total: number; exact: number };
  admin: boolean;
};
type Grid = Record<string, string[]>;
type Tab = "grid" | "rumors" | "rank" | "admin";

const last = (name = "") => name.split(" ").at(-1);

// Jeu Mercato : deviner la grille de la saison suivante au fil des rumeurs.
export default function Mercato() {
  const { s } = useTheme();
  const { prefs } = useStore();
  const router = useRouter();
  const call = useCall();
  const [game, setGame] = useState<Game | null>(null);
  const [tab, setTab] = useState<Tab>("grid");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    call("/api/mercato")
      .then((g) => {
        setGame(g);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [call]);
  useFocusEffect(
    useCallback(() => {
      if (prefs.account && hasApi()) load();
    }, [load, prefs.account]),
  );
  const back = (
    <Button
      label="← Retour"
      secondary
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/pronos"))}
    />
  );
  if (!hasApi() || !prefs.account)
    return (
      <Screen>
        {back}
        <Text style={s.title}>Mercato.</Text>
        <Text style={s.subtitle}>
          Devinez qui pilotera où la saison prochaine, au fil des rumeurs.
        </Text>
        <Button label="Se connecter ou créer un compte" onPress={() => router.push("/login")} />
      </Screen>
    );
  if (!game)
    return (
      <Screen>
        {back}
        <Text style={error ? s.error : s.small}>{error || "Chargement…"}</Text>
      </Screen>
    );
  // Toute action renvoie l'état complet du jeu.
  const act = async (path: string, method: string, body?: unknown) => {
    try {
      setGame(await call(path, { method, body }));
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
      return false;
    }
  };
  const tabs: [Tab, string][] = [
    ["grid", "Ma grille"],
    ["rumors", `Rumeurs (${game.rumors.filter((r) => r.status === "open").length})`],
    ["rank", "Classement"],
  ];
  if (game.admin) tabs.push(["admin", "Admin"]);
  return (
    <Screen>
      {back}
      <Text style={s.title}>Mercato {game.year}.</Text>
      <View style={s.card}>
        <Text style={s.label}>MES POINTS MERCATO</Text>
        <Text style={s.cardTitle}>{game.score.total} pts</Text>
        <Text style={s.small}>
          {game.score.exact} transfert(s) vu(s) venir · {game.score.rumors} pts de rumeurs ·{" "}
          {game.official.length} pilote(s) officialisé(s) sur {game.teams.length * 2}
        </Text>
      </View>
      <Pills options={tabs} value={tab} onChange={setTab} />
      {!!error && <Text style={s.error}>{error}</Text>}
      {tab === "grid" && <MyGrid game={game} act={act} />}
      {tab === "rumors" && <Rumors game={game} act={act} />}
      {tab === "rank" && <Ranking />}
      {tab === "admin" && game.admin && <Admin game={game} act={act} />}
    </Screen>
  );
}

type Act = (path: string, method: string, body?: unknown) => Promise<boolean>;

// --- Ma grille : deux baquets par écurie, enregistrés à chaque choix.
function MyGrid({ game, act }: { game: Game; act: Act }) {
  const { s, c, team } = useTheme();
  const [editing, setEditing] = useState<{ teamId: string; seat: number } | null>(null);
  const [grid, setGrid] = useState<Grid>(game.mine);
  useEffect(() => setGrid(game.mine), [game.mine]);
  const name = (id?: string) => game.drivers.find((d) => d.id === id)?.name;
  const teamName = (id: string) => game.teams.find((t) => t.id === id)?.name ?? id;
  const officialOf = (driverId?: string) => game.official.find((o) => o.driverId === driverId);
  const teamOf = (driverId: string) =>
    Object.entries(grid).find(([, l]) => l.includes(driverId))?.[0];
  const send = (next: Grid) => {
    setGrid(next);
    const body = Object.fromEntries(Object.entries(next).map(([t, l]) => [t, l.filter((x) => x)]));
    act("/api/mercato/picks", "PUT", body);
  };
  const pick = (teamId: string, seat: number, driverId: string) => {
    const next: Grid = {};
    // Un pilote n'est que dans une écurie : on le retire de son ancienne place.
    for (const [t, l] of Object.entries(grid)) next[t] = l.map((x) => (x === driverId ? "" : x));
    const list = [...(next[teamId] ?? ["", ""])];
    while (list.length < 2) list.push("");
    list[seat] = driverId;
    next[teamId] = list;
    setEditing(null);
    send(next);
  };
  const clear = (teamId: string, seat: number) => {
    const list = [...(grid[teamId] ?? ["", ""])];
    list[seat] = "";
    setEditing(null);
    send({ ...grid, [teamId]: list });
  };
  // Départ rapide : chaque écurie garde ses pilotes actuels (baquets vides seulement).
  const fromToday = () => {
    const next: Grid = { ...grid };
    const used = new Set(Object.values(grid).flat().filter(Boolean));
    for (const t of game.teams) {
      const list = [...(next[t.id] ?? ["", ""])];
      while (list.length < 2) list.push("");
      for (const d of t.today)
        if (!used.has(d) && !officialOf(d) && list.includes("")) {
          list[list.indexOf("")] = d;
          used.add(d);
        }
      next[t.id] = list;
    }
    send(next);
  };
  const filled = Object.values(grid).flat().filter(Boolean).length;
  return (
    <>
      <Text style={s.small}>
        Placez deux pilotes par écurie pour {game.year}. Modifiable jusqu’à l’annonce officielle :
        10 pts par pilote bien placé, +5 si moins de 40 % des joueurs l’avaient vu, +10 sous 20 %.
      </Text>
      {filled === 0 && <Button label="⚡ Partir de la grille actuelle" onPress={fromToday} />}
      {game.teams.map((t) => {
        const list = grid[t.id] ?? [];
        const officials = game.official.filter((o) => o.teamId === t.id);
        return (
          <View key={t.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: team(t.id) }]}>
            <Text style={[s.cardTitle, { color: team(t.id) }]}>{t.name}</Text>
            <Text style={s.small}>
              Aujourd’hui : {t.today.map((d) => last(name(d))).join(", ") || "—"}
              {officials.length
                ? ` · officiel ${game.year} : ${officials.map((o) => last(name(o.driverId))).join(", ")}`
                : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1].map((seat) => {
                const id = list[seat];
                const o = officialOf(id);
                const good = o && o.teamId === t.id;
                const active = editing?.teamId === t.id && editing.seat === seat;
                return (
                  <Pressable
                    key={seat}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.name}, baquet ${seat + 1} : ${name(id) ?? "à choisir"}`}
                    disabled={!!o}
                    onPress={() => setEditing(active ? null : { teamId: t.id, seat })}
                    style={{
                      flex: 1,
                      minHeight: 56,
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: active ? 2 : 1,
                      borderColor: o ? (good ? c.green : c.error) : active ? c.accent : c.line,
                      backgroundColor: good ? c.lockOn : c.card,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={[s.text, { fontWeight: "700" }]}>
                      {id ? last(name(id)) : "＋ Choisir"}
                    </Text>
                    {o && (
                      <Text style={[s.small, { color: good ? c.green : c.error }]}>
                        {good ? `✓ Officiel · +${o.points}` : `✗ chez ${teamName(o.teamId)}`}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {editing?.teamId === t.id && (
              <View style={{ gap: 8 }}>
                <View style={s.pills}>
                  {game.drivers.map((d) => {
                    const o = officialOf(d.id);
                    const where = teamOf(d.id);
                    const here = where === t.id;
                    return (
                      <Pressable
                        key={d.id}
                        accessibilityRole="button"
                        accessibilityLabel={d.name}
                        disabled={!!o || here}
                        onPress={() => pick(t.id, editing.seat, d.id)}
                        style={[s.pill, { opacity: o || here ? 0.4 : 1 }]}
                      >
                        <Text style={s.text}>{last(d.name)}</Text>
                        {(o || where) && (
                          <Text style={s.tiny}>
                            {o ? "officiel" : here ? "ici" : `chez ${teamName(where!)}`}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {!!list[editing.seat] && (
                  <Button
                    label="Vider ce baquet"
                    secondary
                    onPress={() => clear(t.id, editing.seat)}
                  />
                )}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

// --- Rumeurs : crédible ou bidon ?
function Rumors({ game, act }: { game: Game; act: Act }) {
  const { s, c, team } = useTheme();
  const name = (id: string) => last(game.drivers.find((d) => d.id === id)?.name);
  const teamName = (id: string) => game.teams.find((t) => t.id === id)?.name ?? id;
  if (!game.rumors.length)
    return (
      <View style={s.card}>
        <Text style={s.text}>
          Pas encore de rumeur. Elles arrivent au fil de l’actualité : votez « crédible » ou « bidon
          », 3 pts si vous avez vu juste, +2 si vous aviez raison contre la majorité.
        </Text>
      </View>
    );
  return (
    <>
      <Text style={s.small}>
        3 pts si vous avez vu juste, +2 si vous aviez raison contre la majorité. Votes modifiables
        tant que la rumeur n’est pas tranchée.
      </Text>
      {game.rumors.map((r) => (
        <View
          key={r.id}
          style={[
            s.card,
            r.status !== "open" && {
              borderWidth: 2,
              borderColor: r.status === "confirmed" ? c.green : c.line,
            },
          ]}
        >
          <Text style={s.label}>
            {r.status === "open"
              ? `RUMEUR · ${formatDate(r.at)}`
              : r.status === "confirmed"
                ? "✓ CONFIRMÉE"
                : "✗ DÉMENTIE"}
          </Text>
          <Text style={s.cardTitle}>
            🔥 {name(r.driverId)} →{" "}
            <Text style={{ color: team(r.teamId) }}>{teamName(r.teamId)}</Text> ?
          </Text>
          {!!r.text && <Text style={s.text}>{r.text}</Text>}
          {!!r.source && (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(r.source)}>
              <Text style={[s.small, { color: c.accent }]}>Lire la source ↗</Text>
            </Pressable>
          )}
          {r.credible !== null && (
            <View style={{ gap: 4 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line }}>
                <View
                  style={{
                    width: `${r.credible * 100}%`,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: c.accentBg,
                  }}
                />
              </View>
              <Text style={s.small}>
                {Math.round(r.credible * 100)} % y croient · {r.votes} vote(s)
              </Text>
            </View>
          )}
          {r.status === "open" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[true, false].map((v) => (
                <Pressable
                  key={String(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: r.mine === v }}
                  onPress={() => act(`/api/mercato/rumors/${r.id}/vote`, "POST", { credible: v })}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: r.mine === v ? 2 : 1,
                    borderColor: r.mine === v ? c.accent : c.line,
                    backgroundColor: r.mine === v ? c.soft : c.card,
                  }}
                >
                  <Text style={[s.text, { fontWeight: "700" }]}>
                    {v ? "👍 Crédible" : "👎 Bidon"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={s.text}>
              {r.mine === null
                ? "Vous n’aviez pas voté."
                : r.points
                  ? `Bien vu : +${r.points} pts 🎯`
                  : "Raté cette fois."}
            </Text>
          )}
        </View>
      ))}
    </>
  );
}

// --- Classement Mercato : général et entre amis.
type RankRow = {
  rank: number;
  pseudo: string;
  points: number;
  exact: number;
  rumors: number;
  me: boolean;
};
function Ranking() {
  const { s } = useTheme();
  const call = useCall();
  const [data, setData] = useState<{
    general: RankRow[];
    friends: RankRow[];
    players: number;
  } | null>(null);
  const [who, setWho] = useState<"general" | "friends">("general");
  useEffect(() => {
    call("/api/mercato/leaderboard")
      .then(setData)
      .catch(() => setData(null));
  }, [call]);
  if (!data) return <Text style={s.small}>Chargement…</Text>;
  const rows = data[who];
  return (
    <>
      <Pills
        options={[
          ["general", `Général (${data.players})`],
          ["friends", "Entre amis"],
        ]}
        value={who}
        onChange={setWho}
      />
      <View style={s.card}>
        {rows.map((r) => (
          <View key={r.pseudo} style={[s.rank, r.me && s.mine]}>
            <Text style={s.position}>{r.rank}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.text}>{r.pseudo}</Text>
              <Text style={s.small}>
                {r.exact} transfert(s) vu(s) · {r.rumors} pts rumeurs
              </Text>
            </View>
            <Text style={s.time}>{r.points} pts</Text>
          </View>
        ))}
        {!rows.length && (
          <Text style={s.small}>
            Personne n’a encore joué : remplissez votre grille pour entrer au classement.
          </Text>
        )}
      </View>
    </>
  );
}

// --- Admin : rumeurs depuis la veille actus, officialisations, pilotes.
type Suggestion = {
  title: string;
  link: string;
  source: string;
  publishedAt: number;
  driverIds: string[];
  teamIds: string[];
};
function Admin({ game, act }: { game: Game; act: Act }) {
  const { s, c } = useTheme();
  const call = useCall();
  const [suggest, setSuggest] = useState<Suggestion[] | null>(null);
  const [driverId, setDriverId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [newDriver, setNewDriver] = useState("");
  useEffect(() => {
    call("/api/mercato/suggestions")
      .then(setSuggest)
      .catch(() => setSuggest([]));
  }, [call, game.rumors.length]);
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  const name = (id: string) => game.drivers.find((d) => d.id === id)?.name ?? id;
  const teamName = (id: string) => game.teams.find((t) => t.id === id)?.name ?? id;
  const reset = () => {
    setDriverId("");
    setTeamId("");
    setText("");
    setSource("");
  };
  const body = { driverId, teamId, text, source };
  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.pill, selected && { borderColor: c.accent, backgroundColor: c.soft }]}
    >
      <Text style={s.text}>{label}</Text>
    </Pressable>
  );
  return (
    <>
      <Text style={s.heading}>Pilote + écurie</Text>
      <View style={s.card}>
        <Text style={s.label}>PILOTE</Text>
        <View style={s.pills}>
          {game.drivers.map((d) => chip(last(d.name)!, driverId === d.id, () => setDriverId(d.id)))}
        </View>
        <Text style={s.label}>ÉCURIE EN {game.year}</Text>
        <View style={s.pills}>
          {game.teams.map((t) => chip(t.name, teamId === t.id, () => setTeamId(t.id)))}
        </View>
        <TextInput
          style={input}
          value={text}
          onChangeText={setText}
          placeholder="Texte de la rumeur (facultatif)"
          maxLength={280}
        />
        <TextInput
          style={input}
          value={source}
          onChangeText={setSource}
          placeholder="Lien de la source (https://…)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          label="📣 Publier la rumeur"
          onPress={() => act("/api/mercato/rumors", "POST", body).then((ok) => ok && reset())}
        />
        <Button
          label="✅ Officialiser ce transfert"
          secondary
          onPress={() => act("/api/mercato/official", "POST", body).then((ok) => ok && reset())}
        />
        <Text style={s.small}>
          Officialiser tranche aussi les rumeurs sur ce pilote et prévient les joueurs.
        </Text>
      </View>

      <Text style={s.heading}>À partir de l’actu</Text>
      {suggest === null ? (
        <Text style={s.small}>Recherche des articles sur les transferts…</Text>
      ) : !suggest.length ? (
        <Text style={s.small}>Aucun article récent ne parle de transfert.</Text>
      ) : (
        suggest.map((a) => (
          <View key={a.link} style={s.card}>
            <Text style={s.label}>
              {a.source.toUpperCase()} · {formatDate(a.publishedAt)}
            </Text>
            <Text style={s.text}>{a.title}</Text>
            <Text style={s.small}>
              {[...a.driverIds.map(name), ...a.teamIds.map(teamName)].join(", ")}
            </Text>
            <Button
              label="Préparer une rumeur ↑"
              secondary
              onPress={() => {
                setDriverId(a.driverIds[0] ?? "");
                setTeamId(a.teamIds[0] ?? "");
                setText(a.title.slice(0, 280));
                setSource(a.link);
              }}
            />
          </View>
        ))
      )}

      <Text style={s.heading}>Rumeurs en cours</Text>
      {game.rumors
        .filter((r) => r.status === "open")
        .map((r) => (
          <View key={r.id} style={s.card}>
            <Text style={s.text}>
              {name(r.driverId)} → {teamName(r.teamId)} · {r.votes} vote(s)
            </Text>
            <View style={s.pills}>
              {chip("✓ Confirmée", false, () =>
                act(`/api/mercato/rumors/${r.id}/resolve`, "POST", { status: "confirmed" }),
              )}
              {chip("✗ Démentie", false, () =>
                act(`/api/mercato/rumors/${r.id}/resolve`, "POST", { status: "denied" }),
              )}
              {chip("🗑 Supprimer", false, () => act(`/api/mercato/rumors/${r.id}`, "DELETE"))}
            </View>
          </View>
        ))}

      <Text style={s.heading}>Transferts officiels</Text>
      <View style={s.card}>
        {game.official.map((o) => (
          <View key={o.driverId} style={[s.rank, { gap: 8 }]}>
            <Text style={[s.text, { flex: 1 }]}>
              {name(o.driverId)} → {teamName(o.teamId)}
              {"\n"}
              <Text style={s.small}>
                {formatDate(o.at)} · {Math.round(o.share * 100)} % l’avaient vu
              </Text>
            </Text>
            {chip("Annuler", false, () => act(`/api/mercato/official/${o.driverId}`, "DELETE"))}
          </View>
        ))}
        {!game.official.length && <Text style={s.small}>Aucun pour l’instant.</Text>}
      </View>

      <Text style={s.heading}>Ajouter un pilote</Text>
      <View style={s.card}>
        <Text style={s.small}>Pour un pilote hors grille actuelle (F2, réserviste, retour…).</Text>
        <TextInput
          style={input}
          value={newDriver}
          onChangeText={setNewDriver}
          placeholder="Prénom Nom"
        />
        <Button
          label="Ajouter"
          onPress={() =>
            act("/api/mercato/drivers", "POST", { name: newDriver }).then(
              (ok) => ok && setNewDriver(""),
            )
          }
        />
      </View>
    </>
  );
}
