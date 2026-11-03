"""Descriptive, denominator-explicit comparison of non-overlapping schedule periods."""

from datetime import date

import numpy as np
import pandas as pd

from aerotwin.data.store import load, dataset_revision


def summarize(frame):
    eligible = frame[~frame.cancelled & ~frame.diverted]
    delay = eligible.dep_delay.dropna()
    return {
        "rows": len(frame),
        "eligible": len(eligible),
        "labelled": len(delay),
        "missing_labels": int(eligible.dep_delay.isna().sum()),
        "cancelled": int(frame.cancelled.sum()),
        "diverted": int(frame.diverted.sum()),
        "cancel_rate": float(frame.cancelled.mean()) if len(frame) else None,
        "mean_delay": float(delay.mean()) if len(delay) else None,
        "median_delay": float(delay.median()) if len(delay) else None,
        "p90_delay": float(delay.quantile(0.9)) if len(delay) else None,
        "delayed_15_rate": float((delay >= 15).mean()) if len(delay) else None,
    }


def compare(dataset="synthetic", a_start=None, a_end=None, b_start=None, b_end=None, group="carrier"):
    if group not in ("carrier", "origin", "dest", "route"):
        raise ValueError("Unsupported grouping")
    revision = dataset_revision(dataset)
    frame = load(dataset).copy()
    frame["date"] = pd.to_datetime(frame.date).dt.strftime("%Y-%m-%d")
    days = sorted(frame.date.unique())
    if len(days) < 2:
        raise ValueError("Comparison requires at least two distinct schedule dates")
    supplied = [a_start, a_end, b_start, b_end]
    if any(supplied) and not all(supplied):
        raise ValueError("Provide all four period dates")
    if not any(supplied):
        mid = len(days) // 2
        a_start, a_end, b_start, b_end = days[0], days[mid - 1], days[mid], days[-1]
    for value in [a_start, a_end, b_start, b_end]:
        date.fromisoformat(value)
    if not a_start <= a_end < b_start <= b_end:
        raise ValueError("Periods must be ordered and non-overlapping: A start ≤ A end < B start ≤ B end")
    a = frame[frame.date.between(a_start, a_end)].copy()
    b = frame[frame.date.between(b_start, b_end)].copy()
    if not len(a) or not len(b):
        raise ValueError("Both periods must contain schedule rows")
    for part in [a, b]:
        part["route"] = part.origin + " → " + part.dest
    buckets = {}
    edges = [-np.inf, 0, 15, 30, 60, 120, np.inf]
    labels = ["Early (<0)", "0–<15", "15–<30", "30–<60", "60–<120", "120+"]
    for name, part in [("a", a), ("b", b)]:
        delay = part.loc[~part.cancelled & ~part.diverted, "dep_delay"].dropna()
        counts = pd.cut(delay, bins=edges, labels=labels, right=False).value_counts(sort=False)
        buckets[name] = [int(counts[label]) for label in labels]
    groups = []
    grouped_a = {str(key): summarize(chunk) for key, chunk in a.groupby(group)}
    grouped_b = {str(key): summarize(chunk) for key, chunk in b.groupby(group)}
    empty = summarize(a.iloc[:0])
    for key in sorted(set(grouped_a) | set(grouped_b)):
        left, right = grouped_a.get(key, empty), grouped_b.get(key, empty)
        delta = (
            right["mean_delay"] - left["mean_delay"]
            if left["mean_delay"] is not None and right["mean_delay"] is not None
            else None
        )
        groups.append(
            {
                "group": str(key),
                "a": left,
                "b": right,
                "delta_mean": delta,
                "small_sample": min(left["labelled"], right["labelled"]) < 30,
            }
        )
    groups.sort(key=lambda row: row["a"]["rows"] + row["b"]["rows"], reverse=True)
    daily = []
    for name, part in [("a", a), ("b", b)]:
        for day, chunk in part.groupby("date"):
            daily.append({"date": str(day), "period": name.upper(), **summarize(chunk)})
    # Mix-standardised contrast only uses shared, adequately populated groups.
    usable = [g for g in groups if not g["small_sample"]]
    weight = sum(g["a"]["labelled"] for g in usable)
    standardised = sum(g["a"]["labelled"] * g["delta_mean"] for g in usable) / weight if weight else None
    if dataset_revision(dataset) != revision:
        raise ValueError("Dataset changed during analysis; retry")
    return {
        "data_class": dataset,
        "dataset_revision": revision,
        "coverage": [days[0], days[-1]],
        "periods": {
            "a": {"start": a_start, "end": a_end, **summarize(a)},
            "b": {"start": b_start, "end": b_end, **summarize(b)},
        },
        "group_by": group,
        "groups": groups[:100],
        "total_groups": len(groups),
        "daily": daily,
        "distribution": [
            {"band": label, "a": buckets["a"][i], "b": buckets["b"][i]} for i, label in enumerate(labels)
        ],
        "standardised_delta": standardised,
        "standardised_groups": len(usable),
        "standardised_a_label_coverage": weight / max(1, summarize(a)["labelled"]),
        "quality": {
            "duplicate_flight_ids": int(frame.flight_id.duplicated().sum()),
            "rows": len(frame),
            "missing_delay_labels": int(frame.dep_delay.isna().sum()),
        },
        "caveat": "Descriptive comparison, not a causal effect. Delay statistics exclude cancelled/diverted and missing labels. Cancellation denominator is all rows; ≥15-minute delay denominator is labelled eligible rows. Standardised change uses A labelled-flight weights on shared groups with ≥30 labels per period. Different periods, seasonal patterns and route mix affect comparisons.",
    }
