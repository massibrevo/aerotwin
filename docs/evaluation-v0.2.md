# Verification record — AeroTwin 0.2.0

Release work performed 3 November 2026, macOS Apple Silicon, Python 3.12.14, Node 22.12.0. Dependencies are pinned by the committed Python constraints and npm lockfile. This record distinguishes software validation from aviation validity.

| Executed check | Local result |
| --- | --- |
| Backend `python -m pytest -q` | **44 passed**; upstream dependency warnings retained |
| Ruff backend/scripts/tests | **All checks passed** |
| Frontend Vitest | **5 passed** |
| TypeScript + production Vite build | **PASS**; optional MapLibre vendor-size warning retained |
| Single-server `verify.py --base-url http://127.0.0.1:5189` | **10/10 passed** |
| Production browser workflows | **9 passed**, ~36s, installed Chrome against compiled server |
| Extracted ZIP in a fresh `.venv` | **PASS bootstrap**, pinned dependencies + actual demo training; no npm/Node commands used |
| ZIP per-file SHA-256 manifest / private-file exclusions | **PASS**, all member digests match |
| Server launched from extracted ZIP on port 5190 | **10/10 checks passed**, independent of source environment |

New backend regression coverage: durable ledger/read-back, interrupted jobs, static assets/routes/404/traversal behavior, multi-month snapshots and invalid-import preservation, DuckDB pagination, artifact damage/stale revision, category support/extrapolation warnings, cross-origin/Host boundaries, malformed uploads, actual asynchronous training completion and rejection of unknown position ages. Existing scientific/provider/API tests remain.

Tests use an isolated state directory. Browser tests run against the compiled production server, not Vite, on a separate AEROTWIN_HOME. Generated BTS-schema fixtures exercise importing/training/prediction; they are **not independently acquired official data** and do not provide real aviation accuracy evidence. Local user-facing state is kept separate from these fixtures.

The actual demo metrics remain approximately test MAE 7.1707min / RMSE 8.9827min, median baseline MAE 9.8464min, nominal 90% interval measured test coverage 91.67%, train 2,272 / validation 736 / test 768. These are synthetic-process results. A real-data model must be separately trained/evaluated on genuine appropriate data, with source/authenticity and prospective availability checked.

CI configuration now checks bootstrap/build/unit tests and extracted-ZIP bootstrap on Linux/macOS/Windows; Linux additionally runs all production browser workflows. A configured matrix is not a passed matrix: judge actual run links/results. The ZIP smoke test is run after packaging and must use its own extracted source/environment; no local model or private import is bundled. Its per-file manifest and archive SHA-256 detect damage but are not cryptographic signatures of authorship.

Limitations retained: no certified aviation use; no calibrated real aircraft rotation propagation; no public authentication/hosting; no Python-bundled native installer; full-frame aggregate/training memory costs; manual old snapshot/artifact cleanup; no rollback selector; browser import max20MiB; source data authenticity remains the user's responsibility. See the Italian guide for operational steps and interpretation.
