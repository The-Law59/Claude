import test from "node:test";
import assert from "node:assert/strict";
import { localTime, parseWeather, sky } from "../src/weather.mjs";
import { parseCircuitHistory } from "../src/jolpica.mjs";

test("Météo par session : heure locale du circuit retrouvée dans les prévisions", () => {
  const json = {
    timezone: "America/Chicago",
    utc_offset_seconds: -5 * 3600,
    hourly: {
      time: ["2026-10-24T15:00", "2026-10-24T16:00"],
      temperature_2m: [24.4, 23.6],
      precipitation_probability: [10, 60],
      weather_code: [1, 63],
    },
  };
  const w = parseWeather(json, [
    { id: "q", startsAt: "2026-10-24T21:00:00Z" }, // 16:00 à Austin
    { id: "r", startsAt: "2026-11-25T19:00:00Z" }, // hors prévisions
  ]);
  assert.deepEqual(w.bySession, { q: { temp: 24, rain: 60, icon: "🌧️", label: "Pluie" } });
  assert.equal(sky(0)[2], "Ensoleillé");
  assert.equal(sky(96)[2], "Orage");
  assert.match(localTime("2026-10-24T21:00:00Z", w.timezone), /16:00/);
});

test("Vainqueurs passés d'un circuit, plus récent d'abord", () => {
  const win = (season, givenName, familyName, name) => ({
    season,
    Results: [{ Driver: { givenName, familyName }, Constructor: { name } }],
  });
  const history = parseCircuitHistory({
    RaceTable: { Races: [win("2024", "Charles", "Leclerc", "Ferrari"), win("2025", "Max", "Verstappen", "Red Bull")] },
  });
  assert.deepEqual(history[0], { season: "2025", driver: "Max Verstappen", team: "Red Bull" });
});
