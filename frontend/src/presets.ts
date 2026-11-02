import type { Airport } from "./types";
export const presets: Airport[] = [
  {
    iata: "BCN",
    name: "Barcelona",
    lat: 41.297,
    lon: 2.078,
    tz: "Europe/Madrid",
  },
  { iata: "LHR", name: "London", lat: 51.47, lon: -0.454, tz: "Europe/London" },
  {
    iata: "AMS",
    name: "Amsterdam",
    lat: 52.308,
    lon: 4.764,
    tz: "Europe/Amsterdam",
  },
  {
    iata: "JFK",
    name: "New York",
    lat: 40.641,
    lon: -73.778,
    tz: "America/New_York",
  },
  {
    iata: "ATL",
    name: "Atlanta",
    lat: 33.641,
    lon: -84.428,
    tz: "America/New_York",
  },
];
