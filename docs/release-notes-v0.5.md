# AeroTwin 0.5.0 — Radar, recordings, airports and mathematical methods

Crowded online traffic switches to GPU symbol layers above 250 aircraft; the traffic list pages in batches of 200, while offline drawing is capped at 500 with an explicit notice. Spatial-grid label placement and optional display-only transitions reduce map work without modifying observations.

Optional local LIVE recording adds bounded compressed storage, deduplication, retention choices, historical frame playback and explicit permanent-deletion controls. Recorded playback remains labelled NOT LIVE, uses original timestamps, stops at the final frame and makes no live metadata/photo requests.

Airport explorer adds 6,146 bundled airport references, runway reference flags, available IANA local time/DST and timestamped NOAA/NWS AWC METAR observations, with stale/unavailable states and unit conversion. OurAirports data is public domain; separate OpenFlights timezone references carry ODbL attribution and licence.

Mathematical documentation now defines the actual analytics and data-science formulas, denominators, quantile conventions, leakage controls, uncertainty assumptions, network/simulation equations and physical conversions. A readable in-app page links to the complete Markdown/LaTeX appendix.

Download/extract the ZIP, use Python 3.12, run `python scripts/bootstrap.py`, then `python scripts/serve.py` and open http://127.0.0.1:5188. Node is not required for the compiled ZIP. See `docs/radar-airports-v0.5.md`, `docs/mathematical-methods.md` and the Italian guide for controls and limitations. No recording data or model binaries are bundled. This remains a local research/education application, not an operational aviation tool.
