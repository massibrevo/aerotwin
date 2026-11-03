import type { Aircraft } from "../../types";
export type TrackPoint = { lat: number; lon: number; at: string };
export const PLANE_PATH =
  "M0-16 3-5 15 3 15 6 3 2 3 10 7 14 7 16 0 13 -7 16 -7 14 -3 10 -3 2 -15 6 -15 3 -3-5Z";
export const clampLatitude = (lat: number) => Math.max(-85, Math.min(85, lat));
export function coverageRing(
  lat: number,
  lon: number,
  radius: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const angular = (radius * 1.852) / 6371;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  const coordinates = Array.from({ length: 97 }, (_, i) => {
    const bearing = (i / 96) * 2 * Math.PI;
    const p = Math.asin(
      Math.sin(phi) * Math.cos(angular) +
        Math.cos(phi) * Math.sin(angular) * Math.cos(bearing),
    );
    const l =
      lambda +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(phi),
        Math.cos(angular) - Math.sin(phi) * Math.sin(p),
      );
    return [(l * 180) / Math.PI, (p * 180) / Math.PI];
  });
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };
}
export function bearingLabel(a: Aircraft) {
  return a.track_deg == null
    ? "Unknown track"
    : `${Math.round(a.track_deg)}° track`;
}

export function visibleLabels(
  points: { id: string; x: number; y: number; text: string }[],
  selected?: string,
) {
  type Box = { x: number; y: number; width: number; height: number };
  const grid = new Map<string, Box[]>();
  const cells = (b: Box) => {
    const keys: string[] = [];
    for (
      let x = Math.floor(b.x / 64);
      x <= Math.floor((b.x + b.width) / 64);
      x++
    )
      for (
        let y = Math.floor(b.y / 64);
        y <= Math.floor((b.y + b.height) / 64);
        y++
      )
        keys.push(`${x}:${y}`);
    return keys;
  };
  const visible = new Set<string>();
  const ordered = [...points].sort(
    (a, b) => Number(b.id === selected) - Number(a.id === selected),
  );
  for (const p of ordered) {
    const box = {
      x: p.x + 20,
      y: p.y - 24,
      width: Math.min(105, p.text.length * 6.4 + 16),
      height: 26,
    };
    const keys = cells(box);
    const neighbours = new Set(keys.flatMap((key) => grid.get(key) ?? []));
    const overlaps = [...neighbours].some(
      (b) =>
        box.x < b.x + b.width &&
        box.x + box.width > b.x &&
        box.y < b.y + b.height &&
        box.y + box.height > b.y,
    );
    if (p.id === selected || !overlaps) {
      for (const key of keys) grid.set(key, [...(grid.get(key) ?? []), box]);
      visible.add(p.id);
    }
  }
  return visible;
}
