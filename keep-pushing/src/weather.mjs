// Météo des sessions et fuseau horaire du circuit, via Open-Meteo (sans clé,
// gratuit pour un usage non commercial). Prévisions sur 16 jours.
import { timedFetch } from "./jolpica.mjs";

const API = "https://api.open-meteo.com/v1/forecast";
const SKY = [
  [0, "☀️", "Ensoleillé"],
  [3, "⛅", "Nuageux"],
  [48, "🌫️", "Brouillard"],
  [67, "🌧️", "Pluie"],
  [77, "❄️", "Neige"],
  [82, "🌦️", "Averses"],
  [99, "⛈️", "Orage"],
];
export const sky = (code) => SKY.find(([max]) => code <= max) ?? SKY.at(-1);

/** @typedef {{ temp: number, rain: number, icon: string, label: string }} SessionWeather */
// json : réponse Open-Meteo (timezone=auto, heures locales du circuit).
/** @returns {{ timezone: string, bySession: Record<string, SessionWeather> }} */
export function parseWeather(json, sessions) {
  const offset = json.utc_offset_seconds * 1000;
  const hours = json.hourly?.time ?? [];
  /** @type {Record<string, SessionWeather>} */
  const bySession = {};
  for (const s of sessions) {
    const local = new Date(Date.parse(s.startsAt) + offset).toISOString().slice(0, 13) + ":00";
    const i = hours.indexOf(local);
    if (i === -1) continue;
    const [, icon, label] = sky(json.hourly.weather_code[i]);
    bySession[s.id] = {
      temp: Math.round(json.hourly.temperature_2m[i]),
      rain: json.hourly.precipitation_probability[i],
      icon,
      label,
    };
  }
  return { timezone: json.timezone, bySession };
}

export async function loadWeather(event, fetchFn = fetch) {
  const { lat, long } = event.location;
  const url = `${API}?latitude=${lat}&longitude=${long}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=16`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return parseWeather(await res.json(), event.sessions);
}

// Heure locale du circuit (fuseau IANA, heure d'été comprise).
export const localTime = (iso, timezone) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
