# AeroTwin 0.6 verification · 3 November 2026

The bilingual release preserves the 0.5 radar, local recording, airport-reference and mathematics implementations. Validation uses isolated QA data; browser CSV fixtures and model training do not overwrite the user's primary datasets or models.

| Check | Result |
| --- | --- |
| Backend pytest | 71 passed |
| Ruff | All checks passed |
| Frontend Vitest | 21 passed, including language/state preservation, source/formula invariants, unavailable storage and static translation coverage |
| TypeScript/Vite | Pass; existing large MapLibre vendor-chunk warning remains |
| Browser workflows | **24 passed** deterministic flows, including all twelve routes in Italian and the existing English baseline |
| Optional Italian screenshots | **1 passed** capture: analytics, synthetic observation card and mathematical explanations; no real ADS-B positions are redistributed |

Localization checks exercise persisted choice after navigation/reload, translated command search, mobile overflow, selected-aircraft and metric-unit preservation, and changing an existing error without fetching the analysis again. The source-coverage check requires catalog entries for static presentation prose and maintains an explicit invariant list for source credits, code examples, units and scientific notation.

Original numeric values, formulas, raw aviation reports, personal labels, model inputs and exported payloads remain in source representation. Unit conversion remains independent of locale. Unknown external diagnostics remain verbatim. Native browser date-picker text follows browser/OS settings; the selected app locale controls app-owned text and rendered session dates.

The source CI matrix also bootstraps the extracted compiled ZIP on Linux, macOS and Windows, with the deterministic browser suite on Linux. Refer to the release commit's workflow for final results. Software tests establish application behavior, not operational aviation validity or forecasting accuracy on future real flights.
