// Génère src/tracks.json : tracé de chaque circuit en chemin SVG (repère
// 1000 × 1000 au plus), à partir des données ouvertes f1-circuits
// (third_party/f1-circuits, licence MIT, © Tomislav Bacinger).
//   node scripts/build-tracks.mjs
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
// circuitId Jolpica -> id f1-circuits.
const IDS = {
  albert_park: "au-1953",
  shanghai: "cn-2004",
  suzuka: "jp-1962",
  miami: "us-2022",
  villeneuve: "ca-1978",
  monaco: "mc-1929",
  catalunya: "es-1991",
  red_bull_ring: "at-1969",
  silverstone: "gb-1948",
  spa: "be-1925",
  hungaroring: "hu-1986",
  zandvoort: "nl-1948",
  monza: "it-1922",
  madring: "es-2026",
  baku: "az-2016",
  sepang: "my-1999",
  marina_bay: "sg-2008",
  americas: "us-2012",
  rodriguez: "mx-1962",
  interlagos: "br-1940",
  vegas: "us-2023",
  losail: "qa-2004",
  yas_marina: "ae-2009",
  bahrain: "bh-2002",
  jeddah: "sa-2021",
  imola: "it-1953",
  ricard: "fr-1969",
  hockenheimring: "de-1932",
  portimao: "pt-2008",
  istanbul: "tr-2005",
  nurburgring: "de-1927",
  mugello: "it-1914",
  sochi: "ru-2014",
};

export function toTrack(feature, size = 1000, pad = 40) {
  const pts = feature.geometry.coordinates;
  const lat0 = (pts.reduce((a, p) => a + p[1], 0) / pts.length) * (Math.PI / 180);
  // Projection équirectangulaire locale (y vers le bas).
  const xy = pts.map(([lon, lat]) => [lon * Math.cos(lat0), -lat]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const scale = (size - 2 * pad) / Math.max(maxX - minX, maxY - minY);
  const w = Math.round((maxX - minX) * scale + 2 * pad);
  const h = Math.round((maxY - minY) * scale + 2 * pad);
  const p = xy.map(([x, y]) => [
    Math.round((x - minX) * scale + pad),
    Math.round((y - minY) * scale + pad),
  ]);
  const path = `M${p.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
  // Ligne de départ : premier point ; sens : vers le point suivant assez éloigné.
  const next = p.find(([x, y]) => Math.hypot(x - p[0][0], y - p[0][1]) > 25) ?? p[1];
  const angle = Math.round((Math.atan2(next[1] - p[0][1], next[0] - p[0][0]) * 180) / Math.PI);
  const props = feature.properties;
  return { w, h, path, start: p[0], angle, length: props.length, firstGp: props.firstgp };
}

const geo = JSON.parse(
  await readFile(join(root, "third_party/f1-circuits/f1-circuits.geojson"), "utf8"),
);
const out = {};
for (const [circuitId, id] of Object.entries(IDS)) {
  const feature = geo.features.find((f) => f.properties.id === id);
  if (!feature) throw new Error(`Tracé introuvable : ${id}`);
  out[circuitId] = toTrack(feature);
}
await writeFile(join(root, "src/tracks.json"), JSON.stringify(out));
console.log(`${Object.keys(out).length} tracés écrits dans src/tracks.json`);
