# AeroTwin 0.4 verification · 3 November 2026

The compiled single-server application was tested with isolated schedule/model state on port 5189; read-only discovery/analytics browser flows also ran against the user's production server on port 5188. Test imports/training never touch the user's datasets or imported models.

| Check | Executed local result |
| --- | --- |
| Backend pytest | **62 passed**; physical source matching, lookup failures, date validation, histogram counts, cancellation/missing-label denominators, mix standardisation, bootstrap, coverage bounds and actual model sensitivity recomputation |
| Ruff | **All checks passed** |
| Frontend Vitest | **15 passed**; unit conversion, API errors, radar geometry/trails and validated mode-separated favourites without position retention |
| TypeScript + Vite production build | **PASS**; existing large MapLibre vendor-chunk warning remains |
| Deterministic browser workflows | **18 passed**; original 14 plus favourites persistence, registration/worldwide locate, sourced unverified metadata, analytics/export/date errors and forecast diagnostics |
| New UI capture | **1 passed**, recording Analytics studio, model diagnostics and favourites with explicitly synthetic data; screenshots visually inspected |
| Production browser confirmation | **4 passed** for the new discovery/analytics workflows; no imported test data/training on the user's server |
| Production verifier | **10/10 passed** |
| Actual optional-provider integration | Local details API returned Boeing metadata for ICAO 0200EA; live exact-hex lookup returned an explicit positioned-match count (zero), without synthetic substitution |

Visual QA caught and fixed a duplicate React sibling key that could leave a photo placeholder behind in the favourites view. Regression checks now assert that traffic/favourites panels contain no observation photo. Other verified fixes include direct /analytics reloads, phone-width provenance hashes, medium-width header spacing and distance-unit conversion in model ranges. Model provenance is retained in cropped diagnostic screenshots.

The scientific regression fixture deliberately changes group composition: raw mean-delay change is 17 minutes while each group's change is 2 minutes. Standardisation recovers 2 minutes. Perfect-prediction fixtures validate error signs, interval coverage and paired date-bootstrap arithmetic. Per-flight sensitivity is checked against separate actual inference calls, rather than copied expected implementation values.

The refreshed **synthetic example model** has 768 held-out flights. Measured MAE is 7.171 minutes; coverage is 91.67% for the nominal 90% residual interval. Improvement against the training-median baseline has a paired date-block bootstrap 95% interval of [2.140, 3.220] minutes. These numbers test a seeded synthetic process, not aviation forecasting accuracy. The complete report is in demo-evaluation.json. No authentic real-data benchmark is claimed.

Release CI retains Linux/macOS/Windows source build, unit checks and extracted-ZIP bootstrap; Linux additionally runs the deterministic browser suite. Check the exact GitHub run outcome rather than treating workflow configuration as proof of completion. New provider-dependent screenshots are not required by CI.

Limitations: favourites belong to a browser, live searches cover received positioned observations, metadata/routes can be absent or stale, and route references are unverified for the observed flight. Period comparison is descriptive. Daily-block bootstrap assumes date-block exchangeability; Wilson coverage intervals assume flight independence. Existing models need explicit retraining for extended diagnostics. Larger imports are limited by the existing local-memory scientific pipeline; this release does not establish performance at full national/multiyear scale.
