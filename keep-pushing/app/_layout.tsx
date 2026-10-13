import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StoreProvider, useStore } from "../src/store";
import { c, s } from "../src/ui";

function Gate() {
  const { ready } = useStore();
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={c.accent} />
        <Text style={s.small}>Votre paddock se prépare…</Text>
      </View>
    );
  return <Stack screenOptions={{ headerShown: false }} />;
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
