import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { reminderPlan } from "./model.mjs";
export async function syncReminders(
  prefs: any,
  event: { name: string; sessions: { id: string; label: string; startsAt: string }[] },
) {
  if (Platform.OS === "web") return "Les rappels nécessitent un téléphone.";
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("sessions", {
      name: "Rappels de sessions",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  if (prefs.reminders) {
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted)
      permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Notifications refusées. Autorisez-les dans les réglages du téléphone.",
      );
  }
  // Toutes les notifications de cette V1 sont des rappels neutres, jamais des résultats.
  await Notifications.cancelAllScheduledNotificationsAsync();
  const plan = reminderPlan(event.sessions, prefs, Date.now(), event.name);
  for (const r of plan)
    await Notifications.scheduleNotificationAsync({
      identifier: `kp-${r.id}`,
      content: { title: r.title, body: r.body, data: { sessionId: r.id } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(r.date),
        channelId: "sessions",
      },
    });
  return plan.length
    ? `${plan.length} rappels programmés.`
    : "Aucun rappel à venir.";
}
