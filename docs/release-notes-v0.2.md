# AeroTwin 0.2.0 — 3 November 2026

## Local distribution

- Compiled frontend + API from one loopback server, with readiness, occupied-port diagnostics and graceful shutdown.
- Source + compiled-asset ZIP with SHA-256 and per-file manifest. Python is required; Node is required only to build source.
- AEROTWIN_HOME separates private writable state from source. Backup/update guidance and an in-app Italian guide explain operation, interpretation and limits.

## Real user workflows

- Browser CSV import (20 MiB) with IANA timezone mapping and visible quality/errors; CLI retained for larger files.
- Monthly immutable Parquet snapshots with atomic active-data manifest; previous snapshots retained. Imports replace, not append.
- Dataset-aware airport controls, SQL count/pagination and preserved null aggregates.
- Background model fitting/evaluation with persisted status and interruption recovery; browser job status survives a page reload within the session.
- Train-support metadata and per-origin test metrics; reject stale/incompatible/damaged models and unseen airports/carriers, warn on numerical extrapolation.
- Versioned local artifacts with checksum and atomic report publication; bootstrap can repair demo readiness.
- Durable SQLite history for imports, training, jobs and simulations, replacing process-only simulation history.

## Boundaries and verification

Trusted local Host policy, external-origin write rejection, bounded uploads, strict JSON bodies and isolated test state. Actual software checks cover distribution assets, model integrity, persistence, training/import UI and offline behavior. These do not independently validate real-world delay accuracy or operational simulation assumptions. No official BTS dataset was independently obtained; generated test fixtures are not real benchmarks. No public-hosted/multiuser deployment or signed native installer is claimed.

## Upgrade from 0.1

Back up state with the server stopped. Bootstrap and rebuild source (`--source-build`), or extract the new ZIP and point to the same AEROTWIN_HOME. Legacy single-file BTS data is readable. Retrain legacy models; bootstrap does so for the demo. Never delete an old snapshot/artifact referenced by its active manifest. Retention cleanup remains manual.
