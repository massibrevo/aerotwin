import { useEffect, useMemo, useRef } from "react";
import type { Snapshot } from "../../types";
import type { TrackPoint } from "./geometry";
export function useObservedTrail(
  snapshot: Snapshot | undefined,
  selected: string | undefined,
  context: string,
) {
  const store = useRef<{ context: string; tracks: Map<string, TrackPoint[]> }>({
    context,
    tracks: new Map(),
  });
  // Snapshot objects are immutable; only actual returned observations enter this bounded session history.
  useEffect(() => {
    if (store.current.context !== context)
      store.current = { context, tracks: new Map() };
    if (!snapshot) return;
    for (const a of snapshot.aircraft) {
      let history = store.current.tracks.get(a.icao24) ?? [];
      const last = history.at(-1);
      if (last && Date.parse(a.observed_at_utc) < Date.parse(last.at))
        history = [];
      if (!last || last.at !== a.observed_at_utc) {
        history.push({ lat: a.lat, lon: a.lon, at: a.observed_at_utc });
        store.current.tracks.set(a.icao24, history.slice(-120));
      }
    }
    if (store.current.tracks.size > 1000) {
      const current = new Set(snapshot.aircraft.map((a) => a.icao24));
      for (const id of store.current.tracks.keys())
        if (!current.has(id)) store.current.tracks.delete(id);
    }
  }, [snapshot, context]);
  // React runs the effect after render; derive the current point too so the selected trail never lags a refresh.
  return useMemo(() => {
    if (!selected || store.current.context !== context) return [];
    const history = store.current.tracks.get(selected) ?? [];
    const a = snapshot?.aircraft.find((a) => a.icao24 === selected);
    if (!a) return history;
    if (
      history.length &&
      Date.parse(a.observed_at_utc) < Date.parse(history.at(-1)!.at)
    )
      return [{ lat: a.lat, lon: a.lon, at: a.observed_at_utc }];
    return history.at(-1)?.at === a.observed_at_utc
      ? history
      : [...history, { lat: a.lat, lon: a.lon, at: a.observed_at_utc }].slice(
          -120,
        );
  }, [snapshot, selected, context]);
}
