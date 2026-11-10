// Éléments graphiques du thème : bandeau aux couleurs de l'écurie (dégradé,
// lignes de vitesse, damier, bordure de piste), compte à rebours, badge
// d'écurie à initiales, vignettes. Dessinés en code : aucune image sous droits.
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { circuitCard } from "./circuits";
import { LinearGradient } from "expo-linear-gradient";
import { glowFor, initialsFor, mix } from "./teams.mjs";
import { useTheme } from "./ui";

const NIGHT = "#0b0e13";

// Lignes de vitesse en biais.
function SpeedLines({ count = 9 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: -40,
            bottom: -40,
            left: `${i * 14 - 10}%`,
            width: 2,
            backgroundColor: "rgba(255,255,255,0.06)",
            transform: [{ rotate: "20deg" }],
          }}
        />
      ))}
    </View>
  );
}

// Damier discret en haut à droite.
function Checker() {
  const size = 10;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: -6,
        top: 14,
        width: size * 12,
        flexDirection: "row",
        flexWrap: "wrap",
        opacity: 0.16,
        transform: [{ skewX: "-20deg" }],
      }}
    >
      {Array.from({ length: 12 * 6 }, (_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            backgroundColor: (Math.floor(i / 12) + i) % 2 ? "#fff" : "transparent",
          }}
        />
      ))}
    </View>
  );
}

// Bordure de piste rouge et blanche.
export function Kerb() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 7,
        flexDirection: "row",
      }}
    >
      {Array.from({ length: 40 }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? "#ffffff" : "#e10600" }} />
      ))}
    </View>
  );
}

// Bandeau aux couleurs de l'écurie, sombre aussi en thème clair (lisibilité du blanc).
export function Hero({
  label,
  title,
  children,
  onPress,
}: {
  label?: string;
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const content = (
    <LinearGradient
      colors={[mix(c.accentBg, "#000000", 0.15), NIGHT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        borderRadius: 20,
        padding: 16,
        paddingBottom: 22,
        gap: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: mix(c.glow, NIGHT, 0.4),
      }}
    >
      <SpeedLines />
      <Checker />
      {!!label && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.4,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {label.toUpperCase()}
        </Text>
      )}
      {!!title && (
        <Text style={{ fontSize: 27, lineHeight: 30, fontWeight: "800", color: "#fff" }}>
          {title}
        </Text>
      )}
      {children}
      <Kerb />
    </LinearGradient>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}
// Texte blanc dans le bandeau.
export const heroText = { fontSize: 14, color: "rgba(255,255,255,0.88)" } as const;

// Compte à rebours jours / heures / minutes, mis à jour chaque minute.
export function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, to - now);
  const parts: [number, string][] = [
    [Math.floor(left / 86400000), "j"],
    [Math.floor(left / 3600000) % 24, "h"],
    [Math.floor(left / 60000) % 60, "min"],
  ];
  return (
    <View
      style={{ flexDirection: "row", gap: 6 }}
      accessibilityLabel={`Dans ${parts.map(([n, u]) => `${n} ${u}`).join(" ")}`}
    >
      {parts.map(([n, unit]) => (
        <View
          key={unit}
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            backgroundColor: "rgba(0,0,0,0.45)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "#fff",
              fontVariant: ["tabular-nums"],
            }}
          >
            {String(n).padStart(2, "0")}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: "rgba(255,255,255,0.7)",
              marginLeft: 2,
            }}
          >
            {unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Badge d'écurie : ses initiales, bordure néon à sa couleur (pas de logo officiel).
export function TeamBadge({
  teamId,
  name,
  size = 64,
  selected = false,
}: {
  teamId: string;
  name?: string;
  size?: number;
  selected?: boolean;
}) {
  const glow = glowFor(teamId);
  return (
    <LinearGradient
      colors={[mix(glow, NIGHT, 0.62), NIGHT]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        borderWidth: selected ? 3 : 2,
        borderColor: glow,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: glow,
        shadowOpacity: selected ? 0.7 : 0.35,
        shadowRadius: selected ? 14 : 8,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Text
        style={{
          fontSize: initialsFor(teamId, name).length > 3 ? size * 0.24 : size * 0.3,
          fontWeight: "900",
          fontStyle: "italic",
          color: glow,
          letterSpacing: 0.5,
        }}
      >
        {initialsFor(teamId, name)}
      </Text>
    </LinearGradient>
  );
}

// Vignette d'article : dégradé de l'écurie et lignes de vitesse.
export function Thumb({ size = 72 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <LinearGradient
      colors={[c.accentBg, NIGHT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size * 0.86, borderRadius: 12, overflow: "hidden" }}
    >
      <SpeedLines count={6} />
    </LinearGradient>
  );
}

// Raccourcis de l'accueil (Pronos, Ma ligue, Forum).
export function Shortcuts({
  items,
}: {
  items: { icon: string; label: string; onPress: () => void; badge?: number }[];
}) {
  const { c, s } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {items.map((it, i) => (
        <Pressable
          key={it.label}
          accessibilityRole="button"
          accessibilityLabel={it.badge ? `${it.label} : ${it.badge} nouveauté(s)` : it.label}
          onPress={it.onPress}
          style={({ pressed }) => [
            s.card,
            { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, gap: 4 },
            i === 0 && { borderColor: c.glow },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={{ fontSize: 24 }}>{it.icon}</Text>
          <Text style={[s.text, { fontWeight: "700", fontSize: 13 }]}>{it.label}</Text>
          {!!it.badge && <Text style={s.dot}>{it.badge}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

// Carte du circuit (tracé, drapeau, longueur) si on en a une.
export function CircuitCard({ circuitId, onPress }: { circuitId?: string; onPress?: () => void }) {
  const { c } = useTheme();
  const card = circuitCard(circuitId);
  if (!card) return null;
  // Cadre au format de l'image (le web ignore aspectRatio sur une Image seule).
  const image = (
    <View
      style={{
        width: "100%",
        aspectRatio: card.ratio,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.line,
        overflow: "hidden",
      }}
    >
      <Image
        source={card.source}
        accessibilityIgnoresInvertColors
        accessible={false}
        resizeMode="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Fiche du circuit" onPress={onPress}>
      {image}
    </Pressable>
  ) : (
    image
  );
}
