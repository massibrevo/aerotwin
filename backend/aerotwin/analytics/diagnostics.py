"""Held-out model diagnostics and paired daily-block bootstrap, never training selection."""

import numpy as np


def wilson(successes, n):
    if not n:
        return None
    z = 1.95996398454
    p = successes / n
    denominator = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denominator
    radius = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator
    return [
        float(0 if successes == 0 else max(0, center - radius)),
        float(1 if successes == n else min(1, center + radius)),
    ]


def evaluate(train, test, predicted, baseline, radius):
    y = test.dep_delay.to_numpy(dtype=float)
    residual = np.asarray(predicted) - y
    absolute = np.abs(residual)
    covered = absolute <= radius
    detail = test[["date", "origin", "carrier"]].copy()
    detail["error"] = residual
    detail["absolute"] = absolute
    detail["baseline_absolute"] = np.abs(np.asarray(baseline) - y)
    detail["covered"] = covered
    daily = detail.groupby("date").agg(
        n=("error", "size"),
        error_sum=("error", "sum"),
        absolute_sum=("absolute", "sum"),
        baseline_sum=("baseline_absolute", "sum"),
    )
    difference = float(np.mean(detail.baseline_absolute - detail.absolute))
    interval = None
    if len(daily) >= 5:
        rng = np.random.default_rng(42)
        samples = rng.integers(0, len(daily), size=(500, len(daily)))
        numerator = (daily.baseline_sum - daily.absolute_sum).to_numpy()[samples].sum(axis=1)
        denominator = daily.n.to_numpy()[samples].sum(axis=1)
        interval = [float(x) for x in np.quantile(numerator / denominator, [0.025, 0.975])]
    edges = [-np.inf, -60, -30, -15, -5, 5, 15, 30, 60, np.inf]
    counts = np.histogram(residual, bins=edges)[0]
    bands = ["<−60", "−60–<−30", "−30–<−15", "−15–<−5", "−5–<5", "5–<15", "15–<30", "30–<60", "60+"]
    drift = []
    for key in ["origin", "dest", "carrier"]:
        a, b = train[key].value_counts(normalize=True), test[key].value_counts(normalize=True)
        levels = a.index.union(b.index)
        tv = float(np.abs(a.reindex(levels, fill_value=0) - b.reindex(levels, fill_value=0)).sum() / 2)
        drift.append(
            {
                "feature": key,
                "total_variation": tv,
                "unseen_test_rows": int((~test[key].isin(train[key])).sum()),
            }
        )
    numeric = [
        {
            "feature": key,
            "train_min": float(train[key].min()),
            "train_max": float(train[key].max()),
            "test_outside_range": int(
                ((test[key] < train[key].min()) | (test[key] > train[key].max())).sum()
            ),
        }
        for key in ["hour", "month", "dow", "distance"]
    ]
    groups = []
    for dimension in ["origin", "carrier"]:
        for key, group in detail.groupby(dimension):
            groups.append(
                {
                    "dimension": dimension,
                    "group": str(key),
                    "n": len(group),
                    "mae": float(group.absolute.mean()),
                    "bias": float(group.error.mean()),
                    "coverage": float(group.covered.mean()),
                    "small_sample": len(group) < 30,
                }
            )
    return {
        "test_n": len(test),
        "bias_minutes": float(residual.mean()),
        "median_absolute_error": float(np.median(absolute)),
        "p90_absolute_error": float(np.quantile(absolute, 0.9)),
        "coverage_wilson_95": wilson(int(covered.sum()), len(test)),
        "coverage_caveat": "Wilson interval treats flight outcomes as independent; correlated delays can make it too narrow.",
        "baseline_mae_improvement_minutes": difference,
        "baseline_improvement_block_bootstrap_95": interval,
        "bootstrap_blocks": len(daily),
        "bootstrap_repetitions": 500 if interval else 0,
        "bootstrap_caveat": "Paired resampling of whole schedule dates, weighted by flights; assumes daily blocks are exchangeable. Serial dependence between days can invalidate this interval. Positive means lower MAE than the historical-median baseline. This is evaluation, not model selection.",
        "residual_histogram": [{"band": band, "flights": int(n)} for band, n in zip(bands, counts)],
        "daily_errors": [
            {
                "date": str(day),
                "n": int(row.n),
                "mae": float(row.absolute_sum / row.n),
                "baseline_mae": float(row.baseline_sum / row.n),
                "bias": float(row.error_sum / row.n),
            }
            for day, row in daily.iterrows()
        ],
        "categorical_shift": drift,
        "numeric_support": numeric,
        "subgroups": groups,
    }
