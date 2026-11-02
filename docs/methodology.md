# Methodology: learning from schedules, testing assumptions

## Target and issuance

For each scheduled US domestic flight, predict departure delay y (minutes, possibly negative for early departure) at scheduled UTC −120min. Local scheduled times use origin IANA zones; `2400` rolls to next-day midnight. Unknown zones and DST ambiguity/nonexistence fail instead of inventing an instant.

X contains only origin, destination, carrier, local hour/month/weekday and scheduled distance. Actual times, DepDelay/ArrDelay, delay causes, cancellation flags and future rolling aggregates never enter X. Cancelled/diverted rows remain in analytics but are excluded from this completed-flight delay target. These models do not estimate cancellation risk.

## Temporal validation and leakage

Rows are sorted by issuance. Boundaries are at 60% and 80%. Labels are conservatively assumed available at schedule UTC + max(delay,0) minutes +24h. Training labels must be available before validation issuance; validation labels before test issuance. Embargoed rows are omitted. For example a +40min delayed flight scheduled 18:00 UTC is not treated as a known training label until 18:40 UTC the next day. Realized delay is used only for conservative label eligibility, never as a model input. Actual BTS publication latency is not modeled as a verified feed.

Train a historical-median baseline, one-hot/standardized ridge and deterministic bounded gradient boosting. Select ridge or boosting using validation MAE, never final test performance. Test scores are computed from held-out arrays. Three expanding-origin ridge folds use 14-day future evaluation horizons and the same label-availability rule, when enough data exists.

MAE = Σ|y−ŷ| / n. RMSE = √(Σ(y−ŷ)²/n). MAE describes typical error in minutes; RMSE emphasizes large misses. Reports include counts, exact windows and data checksum. A poor model must remain visibly poor.

## Uncertainty and feature sensitivity

Compute absolute validation residuals r = |y−ŷ|. Use the higher residual quantile at ceil((n+1)×0.9)/n, clamped at 1. Return ŷ ± q. Negative interval endpoints are allowed because departure delay can be negative. Report measured test interval coverage next to the nominal 90% level. Time dependence and distribution shift can violate exchangeability, so this is an empirical residual interval, not a guaranteed operational confidence bound.

Permutation importance is validation MAE increase after shuffling one original feature, averaged over three seeded repeats. It measures global predictive sensitivity, not a causal effect or a per-flight explanation. This release is regression only: classification, SHAP and calibration curves are not claimed.

## Network science

Directed edges count loaded origin→destination schedule records over the displayed coverage. Cancelled schedule rows remain included: these are record frequencies rather than verified flown legs. Degree counts incoming/outgoing adjacency. Normalized unweighted betweenness measures the fraction of shortest paths through a node, not travel-time/capacity routing. The descriptive risk index is traffic share × (1+betweenness), a transparent heuristic rather than a learned probability.

## Bounded discrete-event twin

Each replication draws 150 uniform ready times over 360min and lognormal service requirements with mean 1.8min and sigma 0.15 (CV approximately 15%). A single equivalent-runway FCFS SimPy resource serves each flight. Shock begins at minute 60; service rate is multiplied by 1−reduction until the selected duration ends. Work in progress is split exactly at both shock boundaries.

Queue delay = service-start − ready-time. Paired baseline and scenario share arrivals/service/slack, so zero shock gives exactly zero added delay. Replication P10/P90 measures Monte Carlo variability under fixed assumptions, not uncertainty about real airport impact.

Stylized downstream delay = max(0, wait_shock−wait_baseline−slack), with assumed uniform 20–60min connection slack. No verified tail rotation exists. Imported data identifies airports/network, not calibrated capacity. This is contextual route visualization plus an airport queue model, not a calibrated multi-airport causal network. Weather, crews, sectors and recovery decisions are absent.

## Reproduction and honest evidence

Seed 42 generates 3,840 flight rows for 2025-01-01 through 2025-04-30. Synthetic radar/replay epochs start 2025-01-01T12:00Z. They are never labeled current LIVE observations. Bootstrap trains and saves actual CPU models locally, with feature schema, checksum, counts, windows, selection and measured reports. The live provider is independent of historical/model data selection. Synthetic demo accuracy is software evidence, not a real BTS aviation benchmark. Import an official extract spanning enough time, inspect quality/coverage, train `--dataset bts` and evaluate subgroup error/drift before drawing real-world conclusions.
