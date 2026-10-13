import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { articleVisible } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, Screen, s } from "../../src/ui";

export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { prefs, season } = useStore();
  const router = useRouter();
  const article = season.articles.find((a) => a.id === id);
  // Revérifié à chaque rendu : un lien direct ne contourne pas l'anti-spoil.
  const readable = article && articleVisible(article, prefs, false);
  return (
    <Screen>
      <Button
        label="← Retour aux actualités"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        secondary
      />
      {readable ? (
        <>
          <Text style={s.title}>{article.title}</Text>
          <View style={s.card}>
            <Text style={s.text}>{article.summary}</Text>
            <Text style={s.small}>
              Article fictif. Les sources seront reliées dans la prochaine étape.
            </Text>
          </View>
        </>
      ) : (
        <View style={s.lock}>
          <Text style={s.cardTitle}>Article indisponible</Text>
          <Text style={s.text}>
            Il n’existe pas ou il est masqué pour protéger une session.
          </Text>
        </View>
      )}
    </Screen>
  );
}
