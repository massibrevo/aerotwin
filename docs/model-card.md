# Demo model card

Model: SYNTHETIC DEMO MODEL / gradient_boosting.

Target: departure delay minutes at T−120min. Training data class: synthetic; seed 42. Actual trained UTC: 2026-11-02T16:26:16.922803+00:00.

Training features: origin, dest, carrier, hour, month, dow, distance. Only schedule fields; no realized outcomes enter X. Cancelled/diverted rows excluded. Conservative actual-departure +24h label availability embargo. Chronological 60/20/20 boundaries; validation MAE selects the estimator.

Training/validation/test counts: {'train': 2272, 'validation': 736, 'test': 768}. Measured holdout 90% nominal residual interval coverage: 0.9167.

Intended use: offline software demonstration, teaching reproducible temporal regression. Not intended as a real aviation benchmark, operational prediction or certified dispatch system. Model performance outside synthetic feature support is unknown; imported BTS models require separate real temporal evaluation.

Fairness/coverage: examples cover only five US airports and three carriers, with an intentionally simplified target process. No claim about airlines, demographics, geography-wide representativeness or real disruptions.

Detailed measured report: [demo-evaluation.json](demo-evaluation.json). Artifacts are generated locally and ignored by Git; only trusted fixed-ID local files are loaded.
