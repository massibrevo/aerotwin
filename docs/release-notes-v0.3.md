# AeroTwin 0.3.0 — Map-first radar and a new workspace

A visual and interaction redesign across the application, with a full-height radar, free OpenFreeMap/OSM street maps, readable track-rotated aircraft, collision-aware labels, focused observation inspector, follow controls and bounded observation trails. Offline fallback and explicit synthetic/live/replay semantics remain.

The workspace adds larger type, more readable charts/tables, light/dark themes, distinct section colours, reduced-motion-aware transitions, accessible tooltips and Ctrl/⌘ K navigation. UI libraries upgraded to the currently resolved Motion, Radix Tooltip, cmdk, Lucide and Recharts versions; all are recorded in the lockfile.

Registration/type are displayed only if supplied by the provider. No commercial imagery, fabricated schedules, inferred verified routes or real-world forecasting accuracy claim is introduced. Data import, temporal ML and persistent simulations retain their existing functionality.

Download/extract the ZIP, use Python 3.12, run `python scripts/bootstrap.py`, then `python scripts/serve.py`. Open http://127.0.0.1:5188. Node is unnecessary for the compiled ZIP. See `docs/guida-italiano.md` and `docs/radar-ui-v0.3.md` for controls, limitations and upgrade guidance.
