# AeroTwin 0.5 verification · 3 November 2026

Executed locally against the compiled single-server app with separate test state. Test imports, captured fixtures and deletion checks use isolated temporary/QA state; the user's live data and imported models are not overwritten.

| Check | Result |
| --- | --- |
| Backend pytest | **71 passed** including live-only recording, duplicate suppression, stored timestamp preservation, quota/region stops, retention/recovery, permanent deletion and cross-origin rejection; airport lookup, timezone/reference parsing and METAR availability/cache/units |
| Ruff | **All checks passed** |
| Frontend Vitest | **17 passed** including 5,000-feature GeoJSON generation, 5,000 collocated collision candidates and short dateline transitions, alongside existing unit/API/trail/favourite tests |
| TypeScript/Vite build | **PASS**; existing large MapLibre vendor-chunk warning remains |
| Deterministic browser flows | **21 passed**: original workflows plus 1,200-aircraft GPU/list/offline limits, opt-in recording/replay/confirmation, airport/weather-unit display and mathematical documentation |
| Visual capture | **1 new capture passed** (25/25 browser flows with all optional captures enabled), airport reference with weather explicitly unavailable, recording library on synthetic radar and mathematical-methods page; no real positions/weather reports bundled |
| Production verification | **10/10 passed**; new browser flows also pass against the primary server |

The dense browser fixture verifies that online rendering creates no per-aircraft DOM markers, traffic rows initially number 200 with pagination, and offline drawing caps at 500 while search can still select aircraft outside the initial subset. These are structural/functional checks, not an FPS or national-scale performance benchmark.

Recording HTTP integration stubs the backend provider in an isolated test and then exercises start → live query capture → stop → recorded-frame retrieval → protected deletion. The real API accepts no uploaded frames. Browser replay checks distinguish historic frames from LIVE, preserve the source clock and avoid further live-provider requests. Original timestamps and payloads are tested without substituting synthetic data in the user app.

Airport references were built from the documented OurAirports and OpenFlights sources; input SHA-256 digests and data licences are included. Search coverage is 6,146 airport references and 6,676 timezone references. METAR parsing is tested against fixed official-schema fixtures, including missing/error results. Actual optional weather integration is displayed with its provider timestamp; network uptime is not an automated-test requirement.

The mathematical appendix was checked against implementation paths, including the specific NumPy `higher` quantile convention, flight-weighted paired-date bootstrap, Wilson assumptions, directed betweenness normalisation and in-system (not waiting-only) simulation counts. No forecasting algorithm or synthetic performance claim was silently changed.

CI checks source/unit/build and extracted-ZIP bootstrap on Linux/macOS/Windows, with deterministic browser flows on Linux. Refer to the exact release run for final CI results. Live/recording state, models and original downloaded source CSVs are excluded from Git and release packages.

Limits remain explicit: display-only animation is available only for online small fleets and respects reduced motion; recording requires the open visible app and has finite retention/payload limits; runway/timezone references may be stale; METARs are observations, not operational forecasts; no recorded ADS-B data is used as a historical delay-model feature.
