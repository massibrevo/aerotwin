# Contributing

Use Python 3.12+ and Node 20+. Run bootstrap, then create a focused branch. Keep changes local-first, keyless, and CPU-safe. Preserve `LIVE`, `REPLAY`, `SYNTHETIC DEMO` and `SIMULATION` semantics. Never infer verified destinations, airline identity or flight delays from an ADS-B callsign.

Before a PR, run pytest, Ruff, frontend unit tests, the production build and Playwright against running local servers. Add meaningful regression tests for changed behavior. External feeds must be mocked in CI. Document feature availability timestamps and embargoes whenever changing ML. Report computed metrics with data class, windows and sample sizes.

Do not commit credentials, downloaded BTS files, observed ADS-B databases, generated model pickles or caches. Source code, seeded examples and public-domain geography belong in Git. Use provenance and license documentation for new data. Research outputs must not be presented as certified operational predictions.
