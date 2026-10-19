import { useCallback, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, hasApi } from "../../src/api.mjs";
import { protectWeekend, setProtected } from "../../src/model.mjs";
import { syncReminders } from "../../src/reminders";
import { useStore } from "../../src/store";
import { Button, Pills, Screen, Toggle, useTheme } from "../../src/ui";

export default function Settings() {
  const { s } = useTheme();
  const { prefs, setPrefs, update, focus } = useStore();
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const router = useRouter();
  // Lien vers le tableau de bord pour les admins.
  const [isAdmin, setIsAdmin] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (!prefs.account || !hasApi()) return setIsAdmin(false);
      api("/api/me", { token: prefs.account.token })
        .then((me) => setIsAdmin(!!me.admin))
        .catch(() => setIsAdmin(false));
    }, [prefs.account?.token]),
  );
  const logout = () => {
    api("/api/logout", { method: "POST", token: prefs.account?.token }).catch(() => {});
    update({ account: null });
  };
  const setReminders = async (patch: Partial<typeof prefs>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = { ...prefs, ...patch };
      setNotice(await syncReminders(next, focus.current));
      const native = Platform.OS !== "web";
      update({
        ...patch,
        reminders: next.reminders && native,
        betReminders: next.betReminders && native,
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Échec de programmation des rappels.");
    } finally {
      busy.current = false;
    }
  };
  return (
    <Screen>
      <Text style={s.title}>À votre rythme.</Text>
      <Button label="💬 Donner mon avis sur l’appli" onPress={() => router.push("/feedback")} />
      {hasApi() && (
        <>
          <Text style={s.heading}>Compte</Text>
          {prefs.account ? (
            <>
              <Text style={s.text}>Connecté en tant que {prefs.account.pseudo}</Text>
              <Text style={s.small}>
                Favoris, anti-spoil, filtres d’actus et thème suivent votre compte sur tous vos
                téléphones.
              </Text>
              <Button
                label="⚙️ Mon compte (pseudo, mot de passe, données)"
                onPress={() => router.push("/account")}
              />
              {isAdmin && (
                <Button
                  label="📊 Tableau de bord admin"
                  secondary
                  onPress={() => router.push("/admin")}
                />
              )}
              <Button label="Se déconnecter" secondary onPress={logout} />
            </>
          ) : (
            <Button label="Se connecter ou créer un compte" onPress={() => router.push("/login")} />
          )}
        </>
      )}
      <Text style={s.heading}>Affichage</Text>
      <Pills
        options={[
          ["auto", "Comme le téléphone"],
          ["light", "Clair"],
          ["dark", "Sombre"],
        ]}
        value={prefs.theme}
        onChange={(theme) => update({ theme })}
      />
      <Text style={s.heading}>Anti-spoil</Text>
      <Text style={s.text}>Protection automatique</Text>
      <Pills
        options={[
          ["off", "Désactivée"],
          ["race", "Courses et sprints"],
          ["weekend", "Tout le week-end"],
        ]}
        value={prefs.autoProtect}
        onChange={(autoProtect) => update({ autoProtect })}
      />
      <Text style={s.small}>
        Les sessions choisies se protègent seules 5 minutes avant le départ (jusqu’à 48 h après).
        Une session marquée « regardée » reste visible.
      </Text>
      {[...new Set([focus.last, focus.current])].map((event) => (
        <View key={event.id}>
          <Text style={s.label}>{event.name.toUpperCase()}</Text>
          <Toggle
            label="Protéger tout le week-end"
            value={event.sessions.every((x) => prefs.protectedSessions.includes(x.id))}
            onChange={(on) => setPrefs((p) => protectWeekend(p, event.sessions, on))}
            detail="Les rappels restent neutres."
          />
          {event.sessions.map((x) => (
            <Toggle
              key={x.id}
              label={x.label}
              value={prefs.protectedSessions.includes(x.id)}
              onChange={(on) => setPrefs((p) => setProtected(p, x.id, on))}
              detail={
                prefs.protectedSessions.includes(x.id)
                  ? "Protégée · désactivez après visionnage"
                  : "Résultats et actualités visibles"
              }
            />
          ))}
        </View>
      ))}
      <Text style={s.heading}>Alertes d’actualités</Text>
      <Pills
        options={[
          ["important", "Importantes"],
          ["all", "Toutes"],
        ]}
        value={prefs.frequency}
        onChange={(frequency) => update({ frequency })}
      />
      <Toggle
        label="Inclure les rumeurs identifiées"
        value={prefs.rumors}
        onChange={(rumors) => update({ rumors })}
      />
      <Toggle
        label="Résultats après chaque session"
        value={prefs.results}
        onChange={(results) => update({ results })}
        detail="Bloqués pour les sessions protégées."
      />
      <Text style={s.small}>
        Préférences préparées pour le futur service d’alertes. Aucune alerte d’actualité ou de
        résultat n’est envoyée dans cette version.
      </Text>
      <Text style={s.heading}>Rappels de sessions</Text>
      <Toggle
        label="Activer les rappels locaux"
        value={prefs.reminders}
        onChange={(on) => void setReminders({ reminders: on })}
        detail={`Pour les sessions du ${focus.current.name}.`}
      />
      <Pills
        options={[10, 30, 60].map((m) => [m, `${m} min`] as [number, string])}
        value={prefs.reminderMinutes}
        onChange={(m) =>
          prefs.reminders
            ? void setReminders({ reminderMinutes: m })
            : update({ reminderMinutes: m })
        }
      />
      {!!prefs.account && (
        <Toggle
          label="Rappel avant la fermeture des paris"
          value={prefs.betReminders}
          onChange={(on) => void setReminders({ betReminders: on })}
          detail="1 h avant les qualifs, le sprint et la course."
        />
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {notice}
        </Text>
      )}
      <Text style={s.heading}>Keep Pushing · 0.2</Text>
      <Text style={s.small}>
        Aucune affiliation à Formula 1. Calendrier et résultats fournis par l’API publique Jolpica
        quand le réseau est disponible, sinon données de démonstration.
      </Text>
    </Screen>
  );
}
