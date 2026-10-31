import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { PARTS } from "../src/bets.mjs";
import { useStore } from "../src/store";
import { Button, Screen, formatDate, useCall, useTheme } from "../src/ui";

type Stats = {
  players: { total: number; active7: number; active30: number; new7: number };
  signups: { week: string; count: number }[];
  bets: { eventId: string; name: string; round: number; players: number }[];
  forum: { topics: number; posts: number; posts7: number; reported: number };
  leagues: { count: number; members: number; messages7: number };
  feedback: { count: number; average: number | null };
  errors: { total: number; last24h: number };
  health: { ok: boolean; version: string; uptime: number; checks: Record<string, string> };
  latestErrors: {
    signature: string;
    source: string;
    message: string;
    where: string;
    platform: string;
    count: number;
    last: number;
    stack: string;
  }[];
};
const EXPORTS: [string, string][] = [
  ["players", "Joueurs"],
  ["bets", "Paris"],
  ["feedback", "Avis"],
  ["errors", "Erreurs"],
];

// Tableau de bord des admins : l'appli prend-elle ? Le serveur va-t-il bien ?
export default function Admin() {
  const { s, c } = useTheme();
  const router = useRouter();
  const call = useCall();
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useFocusEffect(
    useCallback(() => {
      call("/api/admin/stats")
        .then(setData)
        .catch((e) => setError(e.message));
    }, [call]),
  );
  const download = async (type: string) => {
    try {
      const { filename, csv } = await call(`/api/admin/export/${type}`);
      if (Platform.OS === "web") {
        // BOM : accents corrects à l'ouverture dans Excel.
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else await Share.share({ message: csv, title: filename });
      setNotice(`${filename} prêt.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export impossible.");
    }
  };
  const resolve = async (signature: string | null) => {
    try {
      const r = await call("/api/admin/errors/resolve", {
        method: "POST",
        body: signature ? { signature } : { all: true },
      });
      setData(
        (d) => d && { ...d, latestErrors: r.errors, errors: { ...d.errors, total: r.total } },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    }
  };
  const back = (
    <Button
      label="← Retour"
      secondary
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
    />
  );
  if (!data)
    return (
      <Screen>
        {back}
        <Text style={error ? s.error : s.small}>{error || "Chargement…"}</Text>
      </Screen>
    );
  const tile = (value: string | number, label: string, color = c.ink) => (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={[s.cardTitle, { color }]}>{value}</Text>
      <Text style={[s.small, { textAlign: "center" }]}>{label}</Text>
    </View>
  );
  const bar = (label: string, value: number, max: number, right: string) => (
    <View key={label} style={{ gap: 4, paddingVertical: 3 }}>
      <View style={{ flexDirection: "row" }}>
        <Text style={[s.small, { flex: 1 }]}>{label}</Text>
        <Text style={s.time}>{right}</Text>
      </View>
      <View
        style={{
          width: `${max ? (value / max) * 100 : 0}%`,
          minWidth: value ? 4 : 0,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.accent,
        }}
      />
    </View>
  );
  const h = data.health;
  const hours = Math.floor(h.uptime / 3600);
  const maxSignup = Math.max(1, ...data.signups.map((w) => w.count));
  return (
    <Screen>
      {back}
      <Text style={s.title}>Tableau de bord.</Text>
      {!!error && <Text style={s.error}>{error}</Text>}

      <View style={[s.card, { borderWidth: 2, borderColor: h.ok ? c.green : c.error }]}>
        <Text style={s.label}>SERVEUR · VERSION {h.version}</Text>
        <Text style={s.cardTitle}>
          {h.ok ? "✓ En ligne" : "⚠ Problème"} · depuis{" "}
          {hours >= 24 ? `${Math.floor(hours / 24)} j` : `${hours} h`}
        </Text>
        <Text style={s.small}>
          Saison : {h.checks.season} · actus : {h.checks.news} · sauvegarde : {h.checks.save}
        </Text>
      </View>

      <Text style={s.heading}>Joueurs</Text>
      <View style={[s.card, { flexDirection: "row" }]}>
        {tile(data.players.total, "inscrits")}
        {tile(data.players.active7, "actifs 7 j", c.accent)}
        {tile(data.players.active30, "actifs 30 j")}
        {tile(`+${data.players.new7}`, "nouveaux 7 j")}
      </View>
      <View style={s.card}>
        <Text style={s.label}>INSCRIPTIONS PAR SEMAINE</Text>
        {data.signups.map((w) =>
          bar(
            `semaine du ${w.week.slice(8)}/${w.week.slice(5, 7)}`,
            w.count,
            maxSignup,
            String(w.count),
          ),
        )}
      </View>

      <PlayersAdmin />

      <Text style={s.heading}>Pronos</Text>
      <View style={s.card}>
        <Text style={s.label}>JOUEURS AYANT PARIÉ, PAR GP</Text>
        {data.bets.map((b) =>
          bar(
            `${b.round}. ${b.name.replace(" Grand Prix", "")}`,
            b.players,
            data.players.total,
            `${b.players} (${Math.round((b.players / Math.max(1, data.players.total)) * 100)} %)`,
          ),
        )}
        {!data.bets.length && <Text style={s.small}>Aucun pari cette saison.</Text>}
      </View>
      <BetsAdmin />

      <Text style={s.heading}>Communauté</Text>
      <View style={[s.card, { flexDirection: "row" }]}>
        {tile(data.forum.topics, "sujets")}
        {tile(data.forum.posts7, "messages forum 7 j")}
        {tile(data.leagues.count, "ligues")}
        {tile(data.leagues.messages7, "messages ligues 7 j")}
      </View>
      <View style={[s.card, { flexDirection: "row" }]}>
        {tile(data.feedback.average ?? "—", `note moyenne (${data.feedback.count} avis)`, c.accent)}
        {tile(data.forum.reported, "messages signalés", data.forum.reported ? c.error : c.ink)}
      </View>
      <Button label="Voir les avis" secondary onPress={() => router.push("/feedback")} />

      <Text style={s.heading}>Erreurs</Text>
      <Text style={s.small}>
        {data.errors.last24h} sur les dernières 24 h · {data.errors.total} erreur
        {data.errors.total > 1 ? "s différentes gardées" : " gardée"}.
      </Text>
      {data.latestErrors.length > 1 && (
        <Button label="✓ Tout marquer comme réglé" secondary onPress={() => resolve(null)} />
      )}
      {data.latestErrors.map((e) => (
        <Pressable
          key={e.signature}
          accessibilityRole="button"
          onPress={() => setOpen(open === e.signature ? null : e.signature)}
          style={s.card}
        >
          <Text style={s.label}>
            {e.source === "app"
              ? `APPLI${e.platform ? ` · ${e.platform.toUpperCase()}` : ""}`
              : "SERVEUR"}{" "}
            · {e.count}× · {formatDate(e.last)}
          </Text>
          <Text style={s.text} numberOfLines={open === e.signature ? undefined : 2}>
            {e.message}
          </Text>
          {!!e.where && <Text style={s.small}>{e.where}</Text>}
          {open === e.signature && !!e.stack && (
            <Text style={[s.small, { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
              {e.stack}
            </Text>
          )}
          {open === e.signature && (
            <Button
              label="✓ Réglée : retirer de la liste"
              secondary
              onPress={() => resolve(e.signature)}
            />
          )}
        </Pressable>
      ))}
      {!data.latestErrors.length && <Text style={s.small}>Aucune erreur enregistrée. 🎉</Text>}

      <Text style={[s.small, { marginTop: 24 }]}>
        Exporter en CSV (Excel, sauvegarde) :{" "}
        {EXPORTS.map(([type, label], i) => (
          <Text
            key={type}
            accessibilityRole="link"
            onPress={() => download(type)}
            style={{ color: c.accent, textDecorationLine: "underline" }}
          >
            {label.toLowerCase()}
            {i < EXPORTS.length - 1 ? " · " : ""}
          </Text>
        ))}
      </Text>
      {!!notice && <Text style={s.small}>{notice}</Text>}
    </Screen>
  );
}

// --- Joueurs : recherche, nouveau mot de passe, suppression.
type Player = {
  id: string;
  pseudo: string;
  createdAt: number;
  lastSeen: number | null;
  friends: number;
  leagues: number;
  bets: number;
  points: number;
  admin: boolean;
};
function PlayersAdmin() {
  const { s, c } = useTheme();
  const call = useCall();
  const [list, setList] = useState<Player[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);
  const load = useCallback(() => {
    call("/api/admin/players")
      .then(setList)
      .catch(() => setList([]));
  }, [call]);
  useEffect(load, [load]);
  if (!list) return <Text style={s.small}>Chargement des joueurs…</Text>;
  const shown = list.filter((p) => p.pseudo.toLowerCase().includes(query.trim().toLowerCase()));
  const act = async (p: Player, kind: "password" | "delete") => {
    try {
      if (kind === "password") {
        const r = await call(`/api/admin/players/${p.id}/password`, { method: "POST" });
        setMessage({ id: p.id, text: `Nouveau mot de passe de ${r.pseudo} : ${r.password}` });
      } else {
        await call(`/api/admin/players/${p.id}`, { method: "DELETE" });
        setMessage(null);
        setOpen(null);
        load();
      }
    } catch (e) {
      setMessage({ id: p.id, text: e instanceof Error ? e.message : "Action impossible." });
    }
    setConfirm(null);
  };
  return (
    <View style={s.card}>
      <Text style={s.label}>LISTE DES JOUEURS ({list.length})</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un pseudo"
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 10,
          padding: 12,
          fontSize: 16,
          color: c.ink,
          backgroundColor: c.card,
        }}
      />
      {shown.slice(0, 50).map((p) => (
        <View key={p.id} style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(open === p.id ? null : p.id)}
            style={{ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.text}>
                {p.pseudo}
                {p.admin ? " · admin" : ""}
              </Text>
              <Text style={s.small}>
                vu {p.lastSeen ? formatDate(p.lastSeen) : "jamais"} · {p.bets} GP pariés
              </Text>
            </View>
            <Text style={s.time}>{p.points} pts</Text>
            <Text style={s.small}>{open === p.id ? "▴" : "▾"}</Text>
          </Pressable>
          {open === p.id && (
            <View style={{ gap: 8, paddingBottom: 12 }}>
              <Text style={s.small}>
                Inscrit le {formatDate(p.createdAt)} · {p.friends} ami(s) · {p.leagues} ligue(s)
              </Text>
              {message?.id === p.id && (
                <Text selectable style={[s.text, { color: c.accent }]}>
                  {message.text}
                </Text>
              )}
              <Button
                label="🔑 Nouveau mot de passe"
                secondary
                onPress={() => act(p, "password")}
              />
              {!p.admin &&
                (confirm === p.id ? (
                  <View style={{ gap: 8 }}>
                    <Text style={s.error}>
                      Supprimer {p.pseudo} ? Paris, amitiés et messages seront effacés.
                    </Text>
                    <Button
                      label="Oui, supprimer définitivement"
                      onPress={() => act(p, "delete")}
                    />
                    <Button label="Annuler" secondary onPress={() => setConfirm(null)} />
                  </View>
                ) : (
                  <Button
                    label="🗑 Supprimer ce compte"
                    secondary
                    onPress={() => setConfirm(p.id)}
                  />
                ))}
            </View>
          )}
        </View>
      ))}
      {shown.length > 50 && (
        <Text style={s.small}>50 premiers affichés : affinez la recherche.</Text>
      )}
      {!shown.length && <Text style={s.small}>Aucun joueur trouvé.</Text>}
    </View>
  );
}

// --- Pronos d'un GP : qui a parié, et saisie d'un prono oublié.
type Part = keyof typeof PARTS;
type BetRow = {
  id: string;
  pseudo: string;
  bet: Partial<Record<Part, string[]>> | null;
  byAdmin: string[];
};
const PART_LABEL: Record<Part, string> = { quali: "Qualifs", sprint: "Sprint", race: "Course" };
function BetsAdmin() {
  const { s, c, team } = useTheme();
  const { season, focus } = useStore();
  const call = useCall();
  const events = season.events;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      events.findIndex((e) => e.id === focus.current.id),
    ),
  );
  const event = events[index];
  const [data, setData] = useState<{ parts: Part[]; rows: BetRow[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ userId: string; part: Part; ids: string[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!event) return;
    setData(null);
    setEdit(null);
    call(`/api/admin/bets/${event.id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [event?.id, call]);
  if (!event) return null;
  const last = (id: string) =>
    season.drivers
      .find((d) => d.id === id)
      ?.name.split(" ")
      .at(-1) ?? id;
  const save = async () => {
    if (!edit) return;
    try {
      setData(
        await call(`/api/admin/bets/${event.id}/${edit.userId}`, {
          method: "PUT",
          body: { part: edit.part, ids: edit.ids },
        }),
      );
      setEdit(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };
  const done = data?.rows.filter((r) => r.bet).length ?? 0;
  return (
    <View style={s.card}>
      <Text style={s.label}>PRONOS PAR JOUEUR</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Button label="‹" secondary onPress={() => setIndex(Math.max(0, index - 1))} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {event.round}. {event.name.replace(" Grand Prix", "")}
          </Text>
          {data && (
            <Text style={s.small}>
              {done} joueur(s) sur {data.rows.length} ont parié
            </Text>
          )}
        </View>
        <Button
          label="›"
          secondary
          onPress={() => setIndex(Math.min(events.length - 1, index + 1))}
        />
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      {!data && <Text style={s.small}>Chargement…</Text>}
      {data?.rows.map((r) => (
        <View key={r.id} style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpen(open === r.id ? null : r.id);
              setEdit(null);
            }}
            style={{ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8 }}
          >
            <Text style={[s.text, { flex: 1 }]}>{r.pseudo}</Text>
            {data.parts.map((p) => (
              <Text key={p} style={[s.small, { color: r.bet?.[p] ? c.green : c.muted, width: 58 }]}>
                {r.bet?.[p] ? "✓" : "—"} {PART_LABEL[p]}
              </Text>
            ))}
          </Pressable>
          {open === r.id && (
            <View style={{ gap: 8, paddingBottom: 12 }}>
              {data.parts.map((p) => (
                <View key={p} style={{ gap: 4 }}>
                  <Text style={s.small}>
                    {PART_LABEL[p].toUpperCase()}
                    {r.byAdmin.includes(p) ? " · saisi par un admin" : ""}
                  </Text>
                  <Text style={s.text}>
                    {r.bet?.[p]?.map((id, i) => `${i + 1}. ${last(id)}`).join("  ") ||
                      "Pas de prono."}
                  </Text>
                  {edit?.userId !== r.id && (
                    <Button
                      label={`✏️ Saisir ${PART_LABEL[p].toLowerCase()} pour ${r.pseudo}`}
                      secondary
                      onPress={() => setEdit({ userId: r.id, part: p, ids: r.bet?.[p] ?? [] })}
                    />
                  )}
                </View>
              ))}
              {edit?.userId === r.id && (
                <View style={{ gap: 8 }}>
                  <Text style={s.label}>
                    {PART_LABEL[edit.part].toUpperCase()} · {edit.ids.length}/
                    {PARTS[edit.part].size}
                  </Text>
                  <Text style={s.small}>
                    Touchez les pilotes dans l’ordre (1er, 2e…) ; retouchez un pilote pour le
                    retirer.
                  </Text>
                  <Text style={s.text}>
                    {edit.ids.map((id, i) => `${i + 1}. ${last(id)}`).join("  ") || "—"}
                  </Text>
                  <View style={s.pills}>
                    {season.drivers.map((d) => {
                      const at = edit.ids.indexOf(d.id);
                      return (
                        <Pressable
                          key={d.id}
                          accessibilityRole="button"
                          accessibilityLabel={d.name}
                          onPress={() =>
                            setEdit({
                              ...edit,
                              ids:
                                at !== -1
                                  ? edit.ids.filter((x) => x !== d.id)
                                  : edit.ids.length < PARTS[edit.part].size
                                    ? [...edit.ids, d.id]
                                    : edit.ids,
                            })
                          }
                          style={[
                            s.pill,
                            { borderColor: team(d.teamId) },
                            at !== -1 && { backgroundColor: c.soft, borderWidth: 2 },
                          ]}
                        >
                          <Text style={[s.text, { color: team(d.teamId) }]}>
                            {at !== -1 ? `${at + 1}. ` : ""}
                            {d.name.split(" ").at(-1)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Vider"
                        secondary
                        onPress={() => setEdit({ ...edit, ids: [] })}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label="Annuler" secondary onPress={() => setEdit(null)} />
                    </View>
                  </View>
                  {edit.ids.length === PARTS[edit.part].size && (
                    <Button label={`✅ Enregistrer pour ${r.pseudo}`} onPress={save} />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      ))}
      <Text style={s.small}>
        Un prono saisi ici compte même si la partie est fermée : réservez-le aux joueurs qui vous
        ont donné leur liste avant la fermeture.
      </Text>
    </View>
  );
}
