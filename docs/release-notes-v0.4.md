# AeroTwin 0.4.0 — Aircraft discovery and analytics studio

Find aircraft by callsign, registration, ICAO hex or supplied type in current coverage. Live mode adds exact worldwide ADSB.lol lookup and safe recenter/selection. Save up to 100 browser-local favourites, with explicit live/demo/replay separation and no persisted positions.

Live observation cards add sourced manufacturer/model, registered owner and operator-code references. HexDB route associations display their source dates and are explicitly unverified for the current flight; unavailable data stays unknown.

Analytics studio compares non-overlapping schedule periods, with explicit denominators, quality checks, delay distributions, group comparisons, mix-standardised changes and provenance-bearing JSON export. It supports both seeded examples and user-imported BTS data.

Forecast lab adds residual bias/P90, date-block bootstrap evidence against the historical-median baseline, coverage uncertainty, subgroup reliability and input-distribution/support shift. Per-flight sensitivity recomputes hypothetical training-reference substitutions; it is neither additive nor causal. Temporal embargoes and validation-based model selection remain intact.

The one-click Metric toggle and credited aircraft photos remain. Unit settings also apply to newly displayed model distance ranges. Existing models can still predict; retrain to generate new diagnostics. No new credentials or hosted services are required. All synthetic results remain labelled; free providers' availability and reference accuracy are not guaranteed.

Download/extract the ZIP, use Python 3.12, run `python scripts/bootstrap.py`, then `python scripts/serve.py`, and open http://127.0.0.1:5188. The compiled ZIP does not require Node. See `docs/intelligence-v0.4.md` and `docs/guida-italiano.md` for use and limitations.
