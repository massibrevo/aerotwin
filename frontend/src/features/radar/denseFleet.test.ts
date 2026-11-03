import { describe, it, expect } from "vitest";
import { fleetFeatures, wrappedLongitudeDelta } from "./denseFleet";
import { visibleLabels } from "./geometry";
import type { Aircraft } from "../../types";
describe("dense radar geometry", () => {
  it("encodes a large fleet without creating DOM markers", () => {
    const rows = Array.from(
      { length: 5000 },
      (_, i) =>
        ({
          icao24: i.toString(16).padStart(6, "0"),
          callsign: `TEST${i}`,
          lat: 40 + i / 100000,
          lon: 2,
          track_deg: i % 360,
        }) as Aircraft,
    );
    const data = fleetFeatures(rows, "000001");
    expect(data.features).toHaveLength(5000);
    expect(data.features[1].properties.selected).toBe(true);
    expect(data.features[0].geometry.coordinates).toEqual([2, 40]);
  });
  it("uses the short longitude transition and prioritises selection in dense labels", () => {
    expect(wrappedLongitudeDelta(179, -179)).toBe(2);
    expect(wrappedLongitudeDelta(-179, 179)).toBe(-2);
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      id: String(i),
      x: 10,
      y: 10,
      text: `TEST${i}`,
    }));
    const visible = visibleLabels(rows, "4999");
    expect([...visible]).toEqual(["4999"]);
  });
});
