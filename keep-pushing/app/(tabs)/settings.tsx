import { useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { protectWeekend, setProtected } from "../../src/model.mjs";
import { syncReminders } from "../../src/reminders";
import { useStore } from "../../src/store";
import { Pills, Screen, Toggle, s } from "../../src/ui";

export default function Settings() {
  const { prefs, setPrefs, update, focus } = useStore();
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const setReminder = async (value: boolean, minutes = prefs.reminderMinutes) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = { ...prefs, reminders: value, reminderMinutes: minutes };
      setNotice(await syncReminders(next, focus.current));
      update({ reminders: value && Platform.OS !== "web", reminderMinutes: minutes });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Échec de programmation des rappels.");
    } finally {
      busy.current = false;
    }
  };
  return (
    <Screen>
      <Text style={s.title}>À votre rythme.</Text>
      <Text style={s.heading}>Anti-spoil</Text>
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
        Préférences préparées pour le futur service d’alertes. Aucune alerte
        d’actualité ou de résultat n’est envoyée dans cette version.
      </Text>
      <Text style={s.heading}>Rappels de sessions</Text>
      <Toggle
        label="Activer les rappels locaux"
        value={prefs.reminders}
        onChange={(on) => void setReminder(on)}
        detail={`Pour les sessions du ${focus.current.name}.`}
      />
      <Pills
        options={[10, 30, 60].map((m) => [m, `${m} min`] as [number, string])}
        value={prefs.reminderMinutes}
        onChange={(m) =>
          prefs.reminders ? void setReminder(true, m) : update({ reminderMinutes: m })
        }
      />
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {notice}
        </Text>
      )}
      <Text style={s.heading}>Keep Pushing · 0.2</Text>
      <Text style={s.small}>
        Sans compte. Aucune affiliation à Formula 1. Calendrier et résultats fournis
        par l’API publique Jolpica quand le réseau est disponible, sinon données de
        démonstration.
      </Text>
    </Screen>
  );
}
