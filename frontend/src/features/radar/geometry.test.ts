import { describe, it, expect } from "vitest";
import { coverageRing, clampLatitude } from "./geometry";
describe("geographic radar coverage", () => {
  it("uses nautical miles, closes its ring and does not invent a flight route", () => {
    const points = coverageRing(41.3, 2.1, 100).geometry.coordinates[0];
    expect(points).toHaveLength(97);
    expect(points[0][0]).toBeCloseTo(points.at(-1)![0], 8);
    const north = (((points[0][1] - 41.3) * Math.PI) / 180) * 6371;
    expect(north).toBeCloseTo(185.2, 3);
  });
  it("keeps Mercator coordinates finite at the polar limits", () => {
    expect(clampLatitude(90)).toBe(85);
    expect(clampLatitude(-90)).toBe(-85);
  });
});

import { visibleLabels } from "./geometry";
it("reduces label collisions while retaining the selected aircraft label", () => {
  const points = [
    { id: "a", x: 100, y: 100, text: "ABC123" },
    { id: "b", x: 102, y: 101, text: "DEF456" },
    { id: "c", x: 200, y: 200, text: "GHI789" },
  ];
  expect([...visibleLabels(points)]).toEqual(["a", "c"]);
  expect([...visibleLabels(points, "b")]).toEqual(["b", "c"]);
});
