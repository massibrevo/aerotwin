import { useState } from "react";
import type { Aircraft, Mode } from "../../types";
export type Favourite = {
  icao24: string;
  label: string;
  registration?: string;
  mode: Mode;
};
export function readFavourites(): Favourite[] {
  try {
    const rows: unknown = JSON.parse(
      localStorage.getItem("aerotwin:favourites") ?? "[]",
    );
    if (!Array.isArray(rows)) return [];
    const seen = new Set<string>();
    return rows
      .filter((r): r is Favourite => {
        if (
          !r ||
          typeof r !== "object" ||
          typeof r.icao24 !== "string" ||
          !/^[a-f\d]{6}$/i.test(r.icao24) ||
          typeof r.label !== "string" ||
          r.label.length > 80 ||
          !["live", "demo", "replay"].includes(r.mode) ||
          (r.registration !== undefined && typeof r.registration !== "string")
        )
          return false;
        const key = `${r.mode}:${r.icao24.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100)
      .map((r) => ({
        icao24: r.icao24.toLowerCase(),
        label: r.label,
        mode: r.mode,
        ...(r.registration
          ? { registration: r.registration.slice(0, 20) }
          : {}),
      }));
  } catch {
    return [];
  }
}
export function useFavourites() {
  const [favourites, setFavourites] = useState(readFavourites);
  const [error, setError] = useState("");
  const save = (next: Favourite[]) => {
    setFavourites(next);
    setError("");
    try {
      localStorage.setItem("aerotwin:favourites", JSON.stringify(next));
    } catch {
      setError(
        "Browser storage unavailable. Favourites will last only for this session.",
      );
    }
  };
  const has = (a: Aircraft, mode: Mode) =>
    favourites.some(
      (f) => f.icao24 === a.icao24.toLowerCase() && f.mode === mode,
    );
  const remove = (f: Favourite) =>
    save(favourites.filter((x) => x.icao24 !== f.icao24 || x.mode !== f.mode));
  const toggle = (a: Aircraft, mode: Mode) => {
    if (!/^[a-f\d]{6}$/i.test(a.icao24)) {
      setError(
        "This observation has no standard ICAO aircraft identity to save.",
      );
      return;
    }
    if (has(a, mode))
      return remove({ icao24: a.icao24.toLowerCase(), mode, label: "" });
    if (favourites.length >= 100) {
      setError("100 favourites saved. Remove one before adding another.");
      return;
    }
    save([
      ...favourites,
      {
        icao24: a.icao24.toLowerCase(),
        label: (a.registration ?? a.callsign ?? a.icao24).slice(0, 80),
        mode,
        ...(a.registration
          ? { registration: a.registration.slice(0, 20) }
          : {}),
      },
    ]);
  };
  return { favourites, has, toggle, remove, error };
}
