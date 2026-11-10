// Cartes des circuits (tracé, drapeau, longueur), illustrations générées
// par IA fournies par l'équipe : sans logo ni marque. Clé : circuitId Jolpica.
// Un circuit sans carte (ex. un nouveau tracé) n'affiche simplement rien.
import type { ImageSourcePropType } from "react-native";

export const CIRCUIT_CARDS: Record<string, { source: ImageSourcePropType; ratio: number }> = {
  albert_park: { source: require("../assets/circuits/albert_park.jpg"), ratio: 1.5 },
  americas: { source: require("../assets/circuits/americas.jpg"), ratio: 2.259 },
  bahrain: { source: require("../assets/circuits/bahrain.jpg"), ratio: 2.246 },
  baku: { source: require("../assets/circuits/baku.jpg"), ratio: 2.246 },
  catalunya: { source: require("../assets/circuits/catalunya.jpg"), ratio: 2.259 },
  hungaroring: { source: require("../assets/circuits/hungaroring.jpg"), ratio: 2.246 },
  interlagos: { source: require("../assets/circuits/interlagos.jpg"), ratio: 2.259 },
  jeddah: { source: require("../assets/circuits/jeddah.jpg"), ratio: 2.246 },
  losail: { source: require("../assets/circuits/losail.jpg"), ratio: 2.994 },
  madring: { source: require("../assets/circuits/madring.jpg"), ratio: 2.246 },
  marina_bay: { source: require("../assets/circuits/marina_bay.jpg"), ratio: 2.259 },
  miami: { source: require("../assets/circuits/miami.jpg"), ratio: 2.259 },
  monaco: { source: require("../assets/circuits/monaco.jpg"), ratio: 2.259 },
  monza: { source: require("../assets/circuits/monza.jpg"), ratio: 2.246 },
  red_bull_ring: { source: require("../assets/circuits/red_bull_ring.jpg"), ratio: 2.246 },
  rodriguez: { source: require("../assets/circuits/rodriguez.jpg"), ratio: 2.259 },
  shanghai: { source: require("../assets/circuits/shanghai.jpg"), ratio: 2.246 },
  silverstone: { source: require("../assets/circuits/silverstone.jpg"), ratio: 2.246 },
  spa: { source: require("../assets/circuits/spa.jpg"), ratio: 2.246 },
  suzuka: { source: require("../assets/circuits/suzuka.jpg"), ratio: 2.246 },
  vegas: { source: require("../assets/circuits/vegas.jpg"), ratio: 2.994 },
  villeneuve: { source: require("../assets/circuits/villeneuve.jpg"), ratio: 2.259 },
  yas_marina: { source: require("../assets/circuits/yas_marina.jpg"), ratio: 2.994 },
  zandvoort: { source: require("../assets/circuits/zandvoort.jpg"), ratio: 2.246 },
};
export const circuitCard = (circuitId?: string) =>
  circuitId ? CIRCUIT_CARDS[circuitId] : undefined;
