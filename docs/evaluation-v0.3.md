# AeroTwin 0.3 verification — 3 November 2026

The redesign was implemented and executed locally against the compiled single-server application. Test data uses a separate AEROTWIN_HOME. User imports/model state are not overwritten by tests.

| Check | Executed local result |
| --- | --- |
| Backend pytest | **45 passed**, including optional observed registration/type parsing without route inference |
| Python Ruff | **All checks passed** |
| Frontend Vitest | **10 passed**, including coverage units, Mercator bounds, label collision priority, observed-trail deduplication/reset/rewind |
| TypeScript / Vite production build | **PASS**; large MapLibre vendor chunk warning remains |
| Production endpoint verification | **10/10 passed**, health, readiness, demo radar/history, actual model inference, paired simulation and offline assets |
| Core Playwright browser flows | **11 passed**, original workflows plus themes/command menu, filters/follow/selection retention/expanded view and phone width |
| Visual QA | **2 passed**, real OpenFreeMap street tiles plus synthetic aircraft, overview, light/dark forecast screenshots; separate from deterministic CI |

Current npm versions were checked through the official registry before installation: Motion14.9.0, Radix Tooltip1.4.1, cmdk1.1.1, Lucide1.67.0, Recharts3.10.1. The npm lockfile preserves exact versions. Recharts was migrated from v2; API, model and simulator tests remain.

Screenshot review produced fixes for traffic-row width, label overlap, map attribution placement, mobile bottom-sheet placement, chart transitions and unnecessary clock-driven chart renders. Source data does not gain invented airline, origin/destination or schedule fields. Registration/type are only displayed when actually supplied. Trails are bounded observations while the radar view is open, not verified routes or interpolated tracks.

Known limitations: provider/tile uptime is not guaranteed; maps need Internet or explicit/failure-triggered coarse offline fallback. Panning the map does not expand the ADS-B query. Demo positions over real streets remain synthetic. Source authenticity, temporal ML and hypothetical simulator caveats are unchanged. No commercial imagery, real aviation performance benchmark, safety certification or public-hosting authentication is introduced.

CI retains Linux/macOS/Windows source/build/unit and ZIP bootstrap checks. Linux runs deterministic browser checks; opt-in real-tile screenshot capture is not an external-uptime CI dependency. Judge actual run results rather than the workflow configuration alone.
