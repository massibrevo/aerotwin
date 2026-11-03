import { it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useObservedTrail } from "./useObservedTrail";
import type { Snapshot, Aircraft } from "../../types";
const snapshot = (second: number): Snapshot => ({
  mode: "demo",
  status: "synthetic",
  source: "SYNTHETIC",
  received_at: `2025-01-01T12:00:${second.toString().padStart(2, "0")}Z`,
  attribution: "MIT",
  aircraft: [
    {
      icao24: "abc123",
      lat: 41 + second * 0.001,
      lon: 2,
      observed_at_utc: new Date(
        Date.UTC(2025, 0, 1, 12, 0, second),
      ).toISOString(),
    } as Aircraft,
  ],
});
it("only connects returned observations, deduplicates refresh and resets across data modes", () => {
  const h = renderHook(
    ({ data, context }) => useObservedTrail(data, "abc123", context),
    { initialProps: { data: snapshot(0), context: "demo" } },
  );
  expect(h.result.current).toHaveLength(1);
  h.rerender({ data: snapshot(1), context: "demo" });
  expect(h.result.current).toHaveLength(2);
  h.rerender({ data: snapshot(1), context: "demo" });
  expect(h.result.current).toHaveLength(2);
  h.rerender({ data: snapshot(2), context: "live" });
  expect(h.result.current).toHaveLength(0);
  h.rerender({ data: snapshot(3), context: "live" });
  expect(h.result.current).toHaveLength(2);
});

it("starts a new trail on rewind instead of drawing a false forward route", () => {
  const h = renderHook(
    ({ data }) => useObservedTrail(data, "abc123", "replay"),
    { initialProps: { data: snapshot(10) } },
  );
  h.rerender({ data: snapshot(11) });
  expect(h.result.current).toHaveLength(2);
  h.rerender({ data: snapshot(1) });
  expect(h.result.current).toHaveLength(1);
});
