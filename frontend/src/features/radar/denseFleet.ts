import type { Aircraft } from "../../types";
import { PLANE_PATH, clampLatitude } from "./geometry";
import type { Map as MapLibreMap } from "maplibre-gl";
export function fleetFeatures(aircraft: Aircraft[], selected?: string) {
  return {
    type: "FeatureCollection" as const,
    features: aircraft.map((a) => ({
      type: "Feature" as const,
      id: a.icao24,
      geometry: {
        type: "Point" as const,
        coordinates: [a.lon, clampLatitude(a.lat)],
      },
      properties: {
        id: a.icao24,
        label: a.callsign ?? a.icao24.toUpperCase(),
        heading: a.track_deg ?? 0,
        selected: a.icao24 === selected,
      },
    })),
  };
}
export function addFleetLayers(map: MapLibreMap) {
  for (const [name, fill] of [
    ["fleet-plane", "#f5bc3b"],
    ["fleet-picked", "#2089c8"],
  ]) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 72;
    const context = canvas.getContext("2d")!;
    context.translate(36, 36);
    context.scale(1.7, 1.7);
    const path = new Path2D(PLANE_PATH);
    context.fillStyle = fill;
    context.fill(path);
    context.strokeStyle = name === "fleet-picked" ? "#ffffff" : "#704b0b";
    context.lineWidth = 1.1;
    context.stroke(path);
    map.addImage(name, context.getImageData(0, 0, 72, 72), { pixelRatio: 2 });
  }
  map.addSource("fleet", { type: "geojson", data: fleetFeatures([]) });
  for (const picked of [false, true])
    map.addLayer({
      id: picked ? "fleet-selected" : "fleet-planes",
      type: "symbol",
      source: "fleet",
      filter: ["==", ["get", "selected"], picked],
      layout: {
        "icon-image": picked ? "fleet-picked" : "fleet-plane",
        "icon-rotate": ["get", "heading"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-size": picked ? 1.2 : 1,
      },
    });
  if (map.getStyle().glyphs)
    map.addLayer({
      id: "fleet-labels",
      type: "symbol",
      source: "fleet",
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-offset": [0, 1.8],
        "text-padding": 8,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#19304a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
}
export const wrappedLongitudeDelta = (from: number, to: number) =>
  ((to - from + 540) % 360) - 180;
