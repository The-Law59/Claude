// Couleur d'accent selon l'écurie choisie. Teintes inspirées des livrées,
// assombries si besoin pour rester lisibles (contraste ≥ 4,5:1 avec le blanc).
export const DEFAULT_ACCENT = "#b64025";
export const TEAM_COLORS = {
  "team-ferrari": "#c8001e",
  "team-mercedes": "#00776c",
  "team-red_bull": "#1e41a0",
  "team-mclaren": "#b84f00",
  "team-aston_martin": "#00594f",
  "team-alpine": "#0062a8",
  "team-williams": "#0051c8",
  "team-rb": "#3a4fb8",
  "team-haas": "#4b4f54",
  "team-audi": "#b0002a",
  "team-cadillac": "#3b3b3b",
};
export const accentFor = (teamId) => TEAM_COLORS[teamId] ?? DEFAULT_ACCENT;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastWithWhite = (hex) => 1.05 / (luminance(hex) + 0.05);
// Fond pâle dérivé de l'accent (cartes surlignées, boutons secondaires).
export const tint = (hex, amount = 0.1) =>
  `#${rgb(hex)
    .map((v) =>
      Math.round(255 - (255 - v) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Mélange de deux couleurs (t = part de b).
export const mix = (a, b, t) =>
  `#${rgb(a)
    .map((v, i) =>
      Math.round(v + (rgb(b)[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
// Mode sombre : couleur éclaircie juste assez pour 4,5:1 sur le fond donné.
export function readableOn(hex, bg) {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(hex, "#ffffff", t);
    if (contrast(c, bg) >= 4.5) return c;
  }
  return "#ffffff";
}
