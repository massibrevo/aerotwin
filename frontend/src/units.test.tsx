import { describe, expect, it } from "vitest";
import { aviation, metric, unitTools, validUnits } from "./units";

describe("source-unit conversions", () => {
  it("uses exact physical factors and preserves missing observations", () => {
    const u = unitTools(metric);
    expect(u.convert(10000, "altitude")).toBe(3048);
    expect(u.convert(100, "speed")).toBeCloseTo(185.2, 10);
    expect(u.convert(100, "distance")).toBeCloseTo(185.2, 10);
    expect(u.convert(600, "vertical")).toBeCloseTo(3.048, 10);
    expect(u.convert(100, "routeDistance")).toBeCloseTo(160.9344, 10);
    expect(u.number(null, "altitude")).toBe("—");
    expect(u.number(NaN, "speed")).toBe("—");
  });
  it("roundtrips input in each supported unit without changing canonical state", () => {
    for (const units of [
      aviation,
      metric,
      { altitude: "m", speed: "mph", distance: "mi", vertical: "m/s" } as const,
    ]) {
      const u = unitTools(units);
      for (const kind of [
        "altitude",
        "speed",
        "distance",
        "vertical",
        "routeDistance",
      ] as const) {
        expect(u.fromDisplay(u.convert(1234.567, kind), kind)).toBeCloseTo(
          1234.567,
          10,
        );
      }
    }
  });
  it("rejects malformed or partial persisted settings", () => {
    expect(validUnits(metric)).toBe(true);
    for (const value of [
      null,
      "metric",
      {},
      { ...metric, speed: "furlongs" },
      { ...metric, distance: null },
    ])
      expect(validUnits(value)).toBe(false);
  });
});
