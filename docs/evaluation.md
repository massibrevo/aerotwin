# Local release verification — 2 November 2026

All results below came from executed commands against this repository, not illustrative success output. macOS Apple Silicon; Python 3.12.14 and Node 22.12.0. Scientific dependencies are recorded in `requirements-lock.txt`; npm has a committed lockfile.

| Check | Executed result |
| --- | --- |
| `python scripts/bootstrap.py` using `.venv` Python | PASS, installation, 3,840-row generation and existing trained artifact |
| `python -m pytest -q` | **35 passed**, 14 visible upstream warnings, ~5s |
| `ruff check backend tests/backend scripts` | **All checks passed** |
| `npm --prefix frontend test` | **3 passed**, 1 file |
| `npm --prefix frontend run build` | **PASS**, TypeScript + Vite; MapLibre vendor chunk size warning remains |
| `python scripts/verify.py --frontend-port 5188` | **10/10 passed** |
| Playwright with installed Chrome and local port 5188 | **5 passed**, ~22s; no skipped tests |
| Actual ADSB.lol request through local API | **LIVE, 57 normalized aircraft, 0 rejected**, receipt `2026-11-02T16:13:24.891170Z`; no observed payload committed |

The backend suite tests missing/null/invalid provider fields, cache/429/timeout behavior, explicit live failure semantics, deterministic replay, strict BTS mappings/deduplication/null/cancelled/DST handling, historical parameterized filtering, label embargo and feature allowlist, reproducible trained artifacts/predictions, graph counts, paired/zero-shock/service-capacity simulation, API success/error paths and bounded inputs.

Browser coverage includes eight routed screens, locally bundled basemap with external requests blocked, actual map aircraft selection/details, filters, replay, history pagination, inference and simulation API calls, explicit live outage, optional online style loading, fallback to offline geometry and a 390px layout. Online style success is tested with a deterministic intercepted style; this is not a live tile service uptime claim.

The downloaded Chromium 156 headless shell stalled on action stability/rendering on this particular macOS host. Installed Chrome runs the flows successfully; tests are not skipped or force-clicked. Linux CI uses Playwright's standard Chromium and must be judged by its actual GitHub run. An initial real SVG hit-area defect discovered by Playwright was fixed and then passed normal click checks. The UI screenshot in README is from the actual app with synthetic data.

## Computed demo model result

Data: fixed-seed **SYNTHETIC**, 3,840 rows from 2025-01-01 to 2025-04-30. After label-availability embargo: train 2,272 / validation 736 / test 768. Selected estimator: gradient boosting, selected on validation MAE. Values are minutes:

| Model | Validation MAE | Test MAE | Test RMSE |
| --- | ---: | ---: | ---: |
| Historical median | 10.1409 | 9.8464 | 12.3954 |
| Ridge | 7.7394 | 7.2449 | 9.0165 |
| Gradient boosting | 7.3766 | 7.1707 | 8.9827 |

These scores describe a synthetic process constructed by the generator, **not a real BTS benchmark**. See `demo-evaluation.json` for exact UTC split windows, checksum, measured interval coverage, permutation importance, holdout arrays and expanding-origin ridge fold metrics. No real-data model has been trained because no official BTS extract was supplied/imported. The model card is generated from the actual local artifact report.

## Next three enhancements

1. Official multi-month BTS evaluation, airport-timezone catalog, subgroup error/drift reports and prospective feature availability audit.
2. Month-partitioned historical Parquet plus durable experiment history for repeated imports/training/simulation.
3. Calibrated multi-airport queue models and verified tail-rotation linkage, with sensitivity analysis before any propagation claim.
