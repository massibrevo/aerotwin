import { afterEach, describe, expect, it } from "vitest";
import { readFavourites } from "./favourites";
afterEach(() => localStorage.clear());
describe("local favourites", () => {
  it("keeps synthetic and live identities distinct and stores no positions", () => {
    localStorage.setItem(
      "aerotwin:favourites",
      JSON.stringify([
        { icao24: "A00000", label: "SYN101", mode: "demo", lat: 41, lon: 2 },
        { icao24: "a00000", label: "Real aircraft", mode: "live" },
        { icao24: "A00000", label: "Duplicate", mode: "demo" },
      ]),
    );
    expect(readFavourites()).toEqual([
      { icao24: "a00000", label: "SYN101", mode: "demo" },
      { icao24: "a00000", label: "Real aircraft", mode: "live" },
    ]);
  });
  it("rejects corrupt or unsafe stored identities", () => {
    for (const value of [
      "invalid",
      "{}",
      '[{"icao24":"../bad","label":"Test","mode":"live"}]',
      '[{"icao24":"0200ea","label":"Test","mode":"unknown"}]',
    ]) {
      localStorage.setItem("aerotwin:favourites", value);
      expect(readFavourites()).toEqual([]);
    }
  });
});
