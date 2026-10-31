import { useState } from "react";
import { Platform, Share, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../src/store";
import { Button, Screen, useCall, useTheme } from "../src/ui";

// Mon compte : pseudo, mot de passe, export des données, suppression.
export default function Account() {
  const { s, c } = useTheme();
  const { prefs, update } = useStore();
  const router = useRouter();
  const call = useCall();
  const [pseudo, setPseudo] = useState(prefs.account?.pseudo ?? "");
  const [pseudoPassword, setPseudoPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const back = (
    <Button
      label="← Retour"
      secondary
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
    />
  );
  if (!prefs.account)
    return (
      <Screen>
        {back}
        <Text style={s.text}>Vous n’êtes pas connecté.</Text>
      </Screen>
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
  const run = (p: Promise<unknown>, ok: string) =>
    p
      .then((r) => {
        setMessage({ ok: true, text: ok });
        return r;
      })
      .catch((e) => {
        setMessage({ ok: false, text: e.message });
        return null;
      });

  const exportData = async () => {
    const data = await run(call("/api/account/export"), "Vos données sont prêtes.");
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    if (Platform.OS === "web") {
      // Navigateur : téléchargement d'un fichier JSON.
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `keep-pushing-${prefs.account!.pseudo}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else await Share.share({ message: text });
  };

  return (
    <Screen>
      {back}
      <Text style={s.title}>Mon compte.</Text>
      {message && (
        <Text style={message.ok ? [s.text, { color: c.green }] : s.error}>{message.text}</Text>
      )}

      <Text style={s.heading}>Pseudo</Text>
      <View style={s.card}>
        <TextInput
          style={input}
          value={pseudo}
          onChangeText={setPseudo}
          maxLength={20}
          autoCapitalize="none"
        />
        <TextInput
          style={input}
          value={pseudoPassword}
          onChangeText={setPseudoPassword}
          secureTextEntry
          placeholder="Mot de passe actuel"
        />
        <Button
          label="Changer de pseudo"
          onPress={() =>
            run(
              call("/api/account/pseudo", {
                method: "POST",
                body: { pseudo, password: pseudoPassword },
              }),
              "Pseudo changé.",
            ).then((u) => {
              if (u)
                update({
                  account: { ...prefs.account!, pseudo: (u as { pseudo: string }).pseudo },
                });
              setPseudoPassword("");
            })
          }
        />
      </View>

      <Text style={s.heading}>Mot de passe</Text>
      <View style={s.card}>
        <TextInput
          style={input}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          placeholder="Mot de passe actuel"
        />
        <TextInput
          style={input}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Nouveau mot de passe (8 caractères minimum)"
        />
        <Button
          label="Changer de mot de passe"
          onPress={() =>
            run(
              call("/api/account/password", { method: "POST", body: { current, next } }),
              "Mot de passe changé. Vos autres appareils sont déconnectés.",
            ).then(() => {
              setCurrent("");
              setNext("");
            })
          }
        />
      </View>

      <Text style={s.heading}>Mes données</Text>
      <View style={s.card}>
        <Text style={s.text}>
          Récupérez tout ce que Keep Pushing garde sur vous : profil, amis, paris, ligues, messages,
          avis.
        </Text>
        <Button label="Télécharger mes données" secondary onPress={exportData} />
      </View>

      <Text style={s.heading}>Supprimer mon compte</Text>
      <View style={[s.card, { borderWidth: 1, borderColor: c.error }]}>
        <Text style={s.text}>
          Définitif : votre compte, vos paris, vos amis, vos messages de ligue et du forum sont
          effacés. Les ligues que vous avez créées passent au membre suivant.
        </Text>
        {confirmDelete ? (
          <>
            <TextInput
              style={input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Mot de passe pour confirmer"
            />
            <Button
              label="Supprimer définitivement"
              onPress={() =>
                run(
                  call("/api/account/delete", {
                    method: "POST",
                    body: { password: deletePassword },
                  }),
                  "Compte supprimé.",
                ).then((r) => {
                  if (!r) return;
                  update({ account: null });
                  router.replace("/");
                })
              }
            />
            <Button label="Annuler" secondary onPress={() => setConfirmDelete(false)} />
          </>
        ) : (
          <Button label="Supprimer mon compte…" secondary onPress={() => setConfirmDelete(true)} />
        )}
      </View>
    </Screen>
  );
}
