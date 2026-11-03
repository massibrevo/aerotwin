# Synthetic example model card · AeroTwin 0.4

Model: **SYNTHETIC DEMO MODEL / gradient_boosting**. Trained UTC: 2026-11-03T11:16:14.658498+00:00.

Target: departure delay in minutes at T−120. Features: origin, dest, carrier, hour, month, dow, distance. Seed 42. Cancelled/diverted flights and missing labels are excluded. Chronological 60/20/20 issuance boundaries and actual departure +24h label availability preserve an embargo; validation MAE selects the model, never test performance.

Measured split counts: {'train': 2272, 'validation': 736, 'test': 768}. Held-out MAE **7.171 min**, RMSE **8.983 min**. Measured nominal-90% interval coverage **91.67%**. Residual bias **-0.302 min**; P90 absolute error **14.583 min**.

MAE improvement against the training-median baseline: **2.676 min**. Paired daily-block bootstrap 95% interval **[2.140, 3.220] min**, 24 test-date blocks, 500 resamples, seed 42. Dates must be exchangeable; cross-day dependence can invalidate this interval. Wilson coverage intervals assume independent flights and may be too narrow under correlation.

Global importance is measured on validation data. Per-flight sensitivity recomputes single-feature training-reference substitutions; changes are not additive explanations or causal effects. Group reliability and input support shift are descriptive diagnostics.

These are **seeded synthetic examples**, covering five US airports and three carriers with a simplified target process. Scores demonstrate software behavior and are **not a real aviation benchmark, real airline assessment or operational validation**. No inference about other regions, disruptions or demographics follows. Imported BTS models require separate authentic data, chronological evaluation, source-quality checks and measured baselines.

The [measured JSON report](demo-evaluation.json) contains full diagnostics and dataset revision; model binaries are generated locally and excluded from distribution. [Methods and limitations](intelligence-v0.4.md).
