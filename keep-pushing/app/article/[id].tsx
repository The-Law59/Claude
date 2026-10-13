import { Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { articleVisible } from "../../src/model.mjs";
import { useStore } from "../../src/store";
import { Button, Screen, SourceBadge, formatDate, useTheme } from "../../src/ui";

export default function Article() {
  const { s } = useTheme();
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
          <SourceBadge kind={article.kind} lang={article.lang} />
          <Text style={s.title}>{article.title}</Text>
          <View style={s.card}>
            <Text style={s.text}>
              {article.summary || "Pas de résumé fourni par la source : lisez l’article d’origine."}
            </Text>
            <Text style={s.small}>
              {article.link
                ? `Source : ${article.source}${article.via ? ` (trouvé via ${article.via})` : ""} · ${formatDate(article.publishedAt!)}`
                : "Article fictif de démonstration."}
            </Text>
          </View>
          {article.kind === "unofficial" && (
            <View style={[s.lock, { backgroundColor: "#fbeedd" }]}>
              <Text style={s.text}>
                Source non officielle : information à vérifier, elle peut être inexacte ou
                relever de la rumeur.
              </Text>
            </View>
          )}
          {article.kind === "official" && (
            <Text style={s.small}>
              Publié par la Formule 1, la FIA ou une écurie : source officielle.
            </Text>
          )}
          {!!article.link && (
            <Button
              label={`Lire l’article sur ${article.source} →`}
              onPress={() => Linking.openURL(article.link!)}
            />
          )}
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
