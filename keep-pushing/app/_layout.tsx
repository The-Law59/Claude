import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { installCrashReporting, reportCrash } from "../src/crash";
import { StoreProvider, useStore } from "../src/store";
import { useTheme } from "../src/ui";

function Gate() {
  const { c, s } = useTheme();
  const { ready } = useStore();
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={c.accent} />
        <Text style={s.small}>Votre paddock se prépare…</Text>
      </View>
    );
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}

installCrashReporting();

// Écran de secours si un écran plante : l'erreur part au tableau de bord admin.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => reportCrash(error, "écran"), [error]);
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Oups, sortie de piste.</Text>
      <Text style={{ fontSize: 15, textAlign: "center", color: "#626c79" }}>
        Un problème est survenu. Il a été signalé à l’équipe.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{
          backgroundColor: "#b64025",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Gate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
