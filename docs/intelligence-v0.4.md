# AeroTwin 0.4 — Search, references and analytics

## Find and save aircraft

Radar's local search now filters callsign, registration, ICAO hex and supplied type. In **Live ADS-B**, choose an exact lookup type and press **Find worldwide** to query the documented ADSB.lol callsign/registration/hex endpoint. Only valid positioned observations are returned; lack of a match is not evidence that an aircraft is not flying. Results show position age at receipt and observation UTC time. **Locate on radar** moves the query region to the returned position and selects the aircraft only if it appears in the newly requested snapshot. A failure never substitutes a synthetic aircraft.

Use **Save aircraft** in an observation card, then **Favourites** in the traffic panel. At most 100 saved identities are retained in this browser's localStorage; no positions or trails are stored. Live, demo and replay favourites are separate. A live favourite outside the current snapshot can be looked up explicitly by hex. Callsigns and assignments can change; saved labels are not current flight identifications. Browser storage deletion clears favourites. If storage is blocked, a message explains the session-only fallback.

## Aircraft details and route references

Live cards optionally query HexDB's documented aircraft-by-hex and route-by-callsign APIs. Manufacturer, model, registered owner, operator code and database registration remain database references, separate from ADSB.lol observations. A registered owner is not necessarily the operating airline. A mismatch between supplied and database registrations is flagged.

Callsign route records are **unverified route references**, never confirmed origin/destination for the selected observation. The source update date is shown even when old or missing. Callsigns are reused; multi-stop records preserve the source's order and do not identify the current leg. No schedule, delay, airline identity or verified route is fabricated. Missing metadata leaves observations usable. Synthetic/replay aircraft never trigger real metadata lookups.

HexDB metadata is cached in memory for one hour, bounded to 256 responses, with shorter negative caching and 429 cooldown. Requests identify AeroTwin and use fixed provider hosts with validated identifiers. No credentials or persistent database mirror is added. Selected public hex/callsign identifiers are sent to the service. Source terms apply; metadata is not bundled or relicensed. Photo attribution and direct thumbnail loading retain the 0.3 behavior.

Sources verified against [ADSB.lol's official API schema](https://api.adsb.lol/api/openapi.json) and [HexDB's official documentation](https://hexdb.io/).

## Analytics studio

Choose Synthetic examples or Imported BTS in the shared dataset selector. The page analyzes schedule records, not live movements. Default periods split distinct schedule dates in half; custom periods must be ordered, inclusive and non-overlapping. Both must contain rows. Comparisons use carrier, origin, destination or route, showing at most 100 groups by combined volume. The JSON export records dates, source class, dataset revision, all displayed statistics and caveats.

Delay statistics use only noncancelled, nondiverted flights with a delay label. ≥15-minute delay rate uses those labelled flights as denominator. Cancellation rate uses all rows. Missing eligible labels, sample counts, duplicate flight IDs and full dataset missing labels remain explicit. P90 is a distribution percentile, not a confidence interval. Early departures retain negative delays. Histograms show counts rather than pretending unequal period sizes are comparable rates.

Raw mean-delay change is B minus A. Mix-standardised change averages within-group mean changes using A's labelled-flight shares, restricted to shared groups with at least 30 valid labels in each period. Coverage of A's labels is displayed. Small samples are hidden by default and can be inspected. Standardisation is descriptive: calendar seasonality, selection, omitted variables and missing groups prevent causal interpretation. Changes in flight composition can make the raw contrast very different from within-group contrasts.

## Forecast evaluation and sensitivity

Retraining computes extended diagnostics alongside the existing chronological splits, label-availability embargo, validation-based model selection and final holdout. Existing manifests remain compatible; older models show a retraining prompt for new diagnostics, rather than inventing missing measurements. Only the bundled synthetic model was refreshed locally; imported user models require explicit retraining.

* Residual = prediction minus observed delay. Bias is its mean; median/P90 absolute error describe error magnitude.
* Baseline improvement = historical-median test MAE minus selected-model test MAE. Positive values mean lower selected-model error. The 95% percentile interval uses 500 paired bootstrap resamples of whole schedule dates (seed 42), weighted by flight counts. It is unavailable below five test dates. It preserves within-day dependence but assumes daily blocks are exchangeable; serial correlation across days can invalidate it. It is an evaluation diagnostic and never participates in model selection.
* Approximate Wilson 95% interval surrounds measured interval-coverage frequency. Its flight-independence assumption can make the interval too narrow under correlated delays; it is not a coverage guarantee.
* Origin/carrier holdout groups show MAE, bias, interval coverage and n; groups below 30 are flagged/hidden by default. These are descriptive reliability checks, not fairness guarantees or post-test tuning targets.
* Category total variation compares training/test feature frequencies (0 same, 1 disjoint); unseen-category counts and numeric out-of-training-range counts measure input support shift. This is covariate shift, not proof of performance drift. Distance displays respect unit settings; model JSON retains statute miles.
* Per-flight sensitivity actually recomputes predictions after replacing one input at a time with a training reference (modal category/calendar value; median distance). Other inputs remain fixed; replacements producing equal origin/destination are omitted. Possible unsupported combinations are explicitly caveated. These are hypothetical prediction changes, not additive feature contributions, probabilities, SHAP values or causal effects.

Synthetic metrics test the implementation, not real aviation forecasting skill. Import an authentic BTS extract, train a separate model, inspect chronological coverage, baseline comparisons and diagnostics before assessing usefulness. No real-world benchmark or operational validation is claimed.
