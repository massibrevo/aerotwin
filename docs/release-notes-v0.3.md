# AeroTwin 0.3.0 — Map-first radar and a new workspace

A visual and interaction redesign across the application, with a full-height radar, free OpenFreeMap/OSM street maps, readable track-rotated aircraft, collision-aware labels, focused observation inspector, follow controls and bounded observation trails. Offline fallback and explicit synthetic/live/replay semantics remain.

The workspace adds larger type, more readable charts/tables, light/dark themes, distinct section colours, reduced-motion-aware transitions, accessible tooltips and Ctrl/⌘ K navigation. UI libraries upgraded to the currently resolved Motion, Radix Tooltip, cmdk, Lucide and Recharts versions; all are recorded in the lockfile.

Registration/type are displayed only if supplied by the provider. No bundled proprietary photos, fabricated schedules, inferred verified routes or real-world forecasting accuracy claim is introduced. Data import, temporal ML and persistent simulations retain their existing functionality.

Download/extract the ZIP, use Python 3.12, run `python scripts/bootstrap.py`, then `python scripts/serve.py`. Open http://127.0.0.1:5188. Node is unnecessary for the compiled ZIP. See `docs/guida-italiano.md` and `docs/radar-ui-v0.3.md` for controls, limitations and upgrade guidance.

Live aircraft cards now display real Planespotters reference photographs matched by ICAO hex, with visible photographer credits and original-photo links. Photo lookup failures have a clear fallback; synthetic/replay examples never receive unrelated real aircraft photos. Only short-lived metadata is cached in memory; images are loaded directly from the provider.

A persistent **Units** menu converts the workspace instantly: ft/m, kt/km/h/mph, NM/km/mi and ft/min/m/s. It updates cards, map tooltips, traffic rows, radius, filters and altitude charts without resetting selection/follow mode. Custom-radius and forecast-distance inputs convert back to canonical API units; source datasets and CSV exports retain their documented units.
