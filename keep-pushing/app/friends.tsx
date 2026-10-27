import { useCallback, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useStore } from "../src/store";
import { Button, Screen, useCall, useTheme } from "../src/ui";

type Person = { id: string; pseudo: string };
type Friends = { me: Person; friends: Person[]; incoming: Person[]; outgoing: Person[] };

// Amis : ouverts depuis le bouton 👥 de l'en-tête (demandes reçues en pastille).
export default function FriendsScreen() {
  const { s } = useTheme();
  const { prefs, markRead } = useStore();
  const router = useRouter();
  useFocusEffect(useCallback(() => markRead("/friends"), []));
  return (
    <Screen>
      <Button
        label="← Retour"
        secondary
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      />
      <Text style={s.title}>Mes amis.</Text>
      {prefs.account ? (
        <>
          <Text style={s.subtitle}>
            Vos amis apparaissent dans le classement « Entre amis » et vous voyez leurs paris une
            fois les sessions fermées.
          </Text>
          <FriendsList />
        </>
      ) : (
        <Button label="Se connecter ou créer un compte" onPress={() => router.push("/login")} />
      )}
    </Screen>
  );
}

function FriendsList() {
  const { s, c } = useTheme();
  const call = useCall();
  const [data, setData] = useState<Friends | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState("");
  const run = (p: Promise<Friends>) =>
    p
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  useFocusEffect(useCallback(() => void run(call("/api/me")), [call]));
  const add = (who: string) => run(call("/api/friends", { method: "POST", body: { pseudo: who } }));
  const remove = (id: string) => run(call(`/api/friends/${id}`, { method: "DELETE" }));
  const input = {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.card,
  };
  const Row = ({ p, children }: { p: Person; children: React.ReactNode }) => (
    <View style={[s.rank, { gap: 8 }]}>
      <Text style={[s.text, { flex: 1 }]}>{p.pseudo}</Text>
      {children}
    </View>
  );
  return (
    <>
      <View style={s.card}>
        <Text style={s.text}>Ajouter un ami par son pseudo</Text>
        <TextInput
          style={input}
          value={pseudo}
          onChangeText={setPseudo}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Pseudo"
        />
        <Button
          label="Ajouter"
          onPress={() => {
            if (!pseudo.trim()) return;
            add(pseudo).then(() => setPseudo(""));
          }}
        />
        {!!error && <Text style={s.error}>{error}</Text>}
      </View>
      {!!data?.incoming.length && (
        <>
          <Text style={s.heading}>Demandes reçues</Text>
          <View style={s.card}>
            {data.incoming.map((p) => (
              <Row key={p.id} p={p}>
                <Button label="Accepter" onPress={() => add(p.pseudo)} />
                <Button label="Refuser" secondary onPress={() => remove(p.id)} />
              </Row>
            ))}
          </View>
        </>
      )}
      <Text style={s.heading}>Mes amis</Text>
      <View style={s.card}>
        {data?.friends.map((p) => (
          <Row key={p.id} p={p}>
            <Button label="Retirer" secondary onPress={() => remove(p.id)} />
          </Row>
        ))}
        {data?.outgoing.map((p) => (
          <Row key={p.id} p={p}>
            <Text style={s.small}>En attente</Text>
            <Button label="Annuler" secondary onPress={() => remove(p.id)} />
          </Row>
        ))}
        {data && !data.friends.length && !data.outgoing.length && (
          <Text style={s.small}>Pas encore d’amis : ajoutez-les par leur pseudo.</Text>
        )}
      </View>
    </>
  );
}
