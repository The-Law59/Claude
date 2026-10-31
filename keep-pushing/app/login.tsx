import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/api.mjs";
import { useStore } from "../src/store";
import { Button, Pills, Screen, useTheme } from "../src/ui";

// Portail de connexion : affiché au premier lancement, puis depuis Pronos
// et Réglages. L'app reste utilisable sans compte (actus, saison).
export default function Login() {
  const { s, c } = useTheme();
  const { update } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const leave = () => router.replace("/pronos");

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { token, user } = await api(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        body: { pseudo, password },
      });
      update({ account: { token, id: user.id, pseudo: user.pseudo }, welcomed: true });
      leave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la connexion.");
    } finally {
      setBusy(false);
    }
  };
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  return (
    <Screen>
      <Text style={s.title}>Bienvenue.</Text>
      <Text style={s.subtitle}>
        Un compte sert aux pronos : vos paris, vos amis et le classement général vous suivent sur
        tous vos téléphones.
      </Text>
      <Pills
        options={[
          ["login", "J’ai un compte"],
          ["register", "Créer un compte"],
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError("");
        }}
      />
      <View style={s.card}>
        <Text style={s.text}>Pseudo</Text>
        <TextInput
          style={input}
          value={pseudo}
          onChangeText={setPseudo}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          placeholder="ex. Quentin"
        />
        <Text style={s.text}>Mot de passe</Text>
        <TextInput
          style={input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "login" ? "" : "8 caractères minimum"}
          onSubmitEditing={submit}
        />
        {mode === "register" && (
          <Text style={s.small}>
            Pas d’e-mail demandé. Mot de passe oublié : demandez à l’administrateur du serveur de le
            réinitialiser.
          </Text>
        )}
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button
          label={busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          onPress={submit}
        />
      </View>
      <Button
        label="Continuer sans compte"
        secondary
        onPress={() => {
          update({ welcomed: true });
          router.canGoBack() ? router.back() : router.replace("/");
        }}
      />
    </Screen>
  );
}
