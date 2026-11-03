import pandas as pd
import pytest
from fastapi.testclient import TestClient

from aerotwin.api.app import app
from aerotwin.analytics.comparison import summarize, compare
from aerotwin.analytics.diagnostics import evaluate, wilson
from aerotwin.ml import engine


def test_delay_denominators_exclude_cancelled_diverted_and_missing():
    frame = pd.DataFrame(
        {
            "dep_delay": [-5, 15, None, 100, 200],
            "cancelled": [False, False, False, True, False],
            "diverted": [False, False, False, False, True],
        }
    )
    result = summarize(frame)
    assert result["rows"] == 5 and result["eligible"] == 3 and result["labelled"] == 2
    assert result["missing_labels"] == 1
    assert result["mean_delay"] == 5 and result["delayed_15_rate"] == 0.5
    assert result["cancel_rate"] == 0.2
    assert summarize(frame.iloc[0:0])["mean_delay"] is None


def test_comparison_dates_quality_and_distribution():
    data = compare()
    assert data["periods"]["a"]["end"] < data["periods"]["b"]["start"]
    assert sum(r["a"] for r in data["distribution"]) == data["periods"]["a"]["labelled"]
    assert sum(r["b"] for r in data["distribution"]) == data["periods"]["b"]["labelled"]
    assert data["data_class"] == "synthetic"
    assert 0 <= data["standardised_a_label_coverage"] <= 1
    with pytest.raises(ValueError, match="non-overlapping"):
        compare(a_start="2025-01-01", a_end="2025-02-01", b_start="2025-02-01", b_end="2025-03-01")
    with pytest.raises(ValueError, match="all four"):
        compare(a_start="2025-01-01")
    with pytest.raises(ValueError, match="Both periods"):
        compare(a_start="2000-01-01", a_end="2000-01-02", b_start="2001-01-01", b_end="2001-01-02")


def test_mix_standardisation_recovers_within_group_difference(monkeypatch):
    from aerotwin.analytics import comparison

    rows = []
    # Composition changes, but both groups' delays rise by exactly two minutes.
    for day, groups in [
        ("2025-01-01", [("AA", 90, 0), ("BB", 30, 30)]),
        ("2025-01-02", [("AA", 30, 2), ("BB", 90, 32)]),
    ]:
        for carrier, n, delay in groups:
            rows.extend(
                {
                    "flight_id": f"{day}-{carrier}-{i}",
                    "date": day,
                    "carrier": carrier,
                    "origin": "ATL",
                    "dest": "JFK",
                    "dep_delay": delay,
                    "cancelled": False,
                    "diverted": False,
                }
                for i in range(n)
            )
    monkeypatch.setattr(comparison, "load", lambda _: pd.DataFrame(rows))
    monkeypatch.setattr(comparison, "dataset_revision", lambda _: "fixture")
    data = comparison.compare()
    assert data["standardised_delta"] == 2
    assert data["periods"]["b"]["mean_delay"] - data["periods"]["a"]["mean_delay"] == 17


def test_diagnostics_perfect_model_known_bias_and_bootstrap():
    frame = engine.prepare(__import__("aerotwin.data.store", fromlist=["load"]).load())
    tr, _, test = engine.splits(frame)
    y = test.dep_delay.to_numpy()
    result = evaluate(tr, test, y, y + 10, 1)
    assert result["bias_minutes"] == 0 and result["p90_absolute_error"] == 0
    assert result["baseline_mae_improvement_minutes"] == pytest.approx(10)
    assert result["baseline_improvement_block_bootstrap_95"] == pytest.approx([10, 10])
    assert sum(row["flights"] for row in result["residual_histogram"]) == len(test)
    assert all(row["coverage"] == 1 for row in result["subgroups"])
    assert evaluate(tr, test, y + 7, y, 1)["bias_minutes"] == pytest.approx(7)
    short = evaluate(tr, test.iloc[:2], y[:2], y[:2] + 10, 1)
    assert short["baseline_improvement_block_bootstrap_95"] is None
    assert wilson(0, 0) is None
    assert wilson(0, 10)[0] == 0 and wilson(10, 10)[1] == 1


def test_prediction_sensitivity_is_actual_model_recomputation():
    engine.train("synthetic")
    values = dict(origin="ATL", dest="JFK", carrier="DL", hour=18, month=4, dow=4, distance=760)
    result = engine.predict("synthetic", values)
    assert result["sensitivity"]
    for row in result["sensitivity"]:
        alternate = engine.predict("synthetic", {**values, row["feature"]: row["reference_value"]})
        assert row["change_minutes"] == pytest.approx(
            alternate["prediction_minutes"] - result["prediction_minutes"]
        )
    assert "not additive" in result["sensitivity_caveat"]


def test_analytics_api_validation():
    client = TestClient(app, base_url="http://localhost")
    assert client.get("/api/v1/analytics/comparison").status_code == 200
    assert client.get("/api/v1/analytics/comparison?group=arbitrary").status_code == 422
    assert client.get("/api/v1/analytics/comparison?a_start=invalid").status_code == 422
