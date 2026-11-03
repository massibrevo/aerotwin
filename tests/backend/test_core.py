import json
from datetime import UTC, datetime

import httpx
import numpy as np
import pandas as pd
import pytest
from aerotwin.api.app import app
from aerotwin.data import store
from aerotwin.ml import engine
from aerotwin.providers.aircraft import (
    AdsbLolProvider,
    RecordedReplayProvider,
    SyntheticProvider,
    parse_response,
)
from aerotwin.simulation.engine import _queue, network, simulate
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def prepared(sandbox_data):
    store.generate()
    engine.train()


def test_parser_missing_null_bad_positions():
    fixture = json.loads((__import__("pathlib").Path(__file__).parent / "fixtures/adsblol.json").read_text())
    rows, rejected = parse_response(fixture, datetime(2025, 1, 1, tzinfo=UTC))
    assert len(rows) == 2 and rejected == 2
    assert rows[0]["callsign"] == "BAW123" and rows[0]["altitude_ft"] == 35000
    assert rows[1]["altitude_ft"] is None and rows[1]["ground"]
    assert rows[0]["data_age_seconds"] == 3
    assert rows[0]["observed_at_utc"] == "2024-12-31T23:59:57+00:00"


async def test_live_429_cooldown_and_no_fake_fallback():
    calls = []

    def respond(req):
        calls.append(req)
        return httpx.Response(429, headers={"Retry-After": "120"})

    provider = AdsbLolProvider(httpx.MockTransport(respond))
    a = await provider.snapshot(41.3, 2.1, 100)
    b = await provider.snapshot(42, 3, 100)
    assert len(calls) == 1
    assert a["mode"] == b["mode"] == "live"
    assert a["status"] == "unavailable" and a["aircraft"] == []
    assert a["retry_after_seconds"] == 120


async def test_timeout_is_honest_and_backs_off():
    def respond(req):
        raise httpx.ReadTimeout("test", request=req)

    provider = AdsbLolProvider(httpx.MockTransport(respond))
    a = await provider.snapshot(41, 2, 100)
    assert not a["aircraft"] and a["mode"] == "live" and a["status"] == "unavailable"
    assert a["retry_after_seconds"] >= 30


async def test_provider_shares_cache_across_requests():
    calls = []

    def respond(req):
        calls.append(req)
        return httpx.Response(200, json={"ac": []})

    p = AdsbLolProvider(httpx.MockTransport(respond))
    await p.snapshot(41, 2, 100)
    cached = await p.snapshot(41, 2, 100)
    assert len(calls) == 1 and cached["cached"]


def test_demo_and_recorded_replay_have_fixed_epochs():
    a = SyntheticProvider().snapshot(41, 2, 100, 1)
    b = SyntheticProvider().snapshot(41, 2, 100, 2)
    assert a["aircraft"][0]["lat"] != b["aircraft"][0]["lat"]
    assert a["aircraft"][0]["observed_at_utc"].startswith("2025-01-01")
    assert RecordedReplayProvider().snapshot(2)["source"].startswith("REPLAY · SYNTHETIC")


def bts_csv(tmp_path, **overrides):
    row = dict(
        FL_DATE="2025-01-01",
        OP_UNIQUE_CARRIER="DL",
        ORIGIN="ATL",
        DEST="JFK",
        CRS_DEP_TIME=1800,
        DEP_DELAY=12,
        CANCELLED=0,
        DIVERTED=0,
        DISTANCE=760,
        OP_CARRIER_FL_NUM=123,
    )
    row.update(overrides)
    p = tmp_path / "bts.csv"
    pd.DataFrame([row, row]).to_csv(p, index=False)
    return p


def test_bts_mapping_dedup_cancel_timezone(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DATA", tmp_path)
    report = store.ingest_bts(bts_csv(tmp_path, CANCELLED=1, DEP_DELAY=None))
    assert report["rows"] == 1 and report["duplicates_removed"] == 1
    assert report["null_delay"] == 1 and report["cancelled"] == 1
    loaded = store.load("bts")
    assert pd.Timestamp(loaded.iloc[0].scheduled_utc).hour == 23
    assert pd.isna(loaded.iloc[0].dep_delay)


@pytest.mark.parametrize(
    "change",
    [
        {"CRS_DEP_TIME": 2365},
        {"ORIGIN": "XYZ"},
        {"DISTANCE": -2},
        {"FL_DATE": "not-a-date"},
        {"CANCELLED": 4},
        {"FL_DATE": "2025-03-09", "CRS_DEP_TIME": 230},
    ],
)
def test_bts_invalid_rows_fail(tmp_path, monkeypatch, change):
    monkeypatch.setattr(store, "DATA", tmp_path)
    with pytest.raises(Exception):
        store.ingest_bts(bts_csv(tmp_path, **change))


def test_bts_malformed_schema(tmp_path):
    p = tmp_path / "bad.csv"
    p.write_text("hello,world\n1,2\n")
    with pytest.raises(ValueError, match="Missing BTS columns"):
        store.ingest_bts(p)


def test_historical_filter_and_sql_parameters():
    r = store.query(origin="ATL", search="DL", page_size=10)
    assert r["total"] > 0
    assert all(x["origin"] == "ATL" and x["carrier"] == "DL" for x in r["rows"])
    assert store.query(search="' OR 1=1 --")["total"] == 0


def test_training_embargo_and_feature_allowlist():
    f = engine.prepare(store.load())
    tr, val, test = engine.splits(f)
    assert tr.label_available_utc.max() < val.issuance_utc.min()
    assert val.label_available_utc.max() < test.issuance_utc.min()
    assert not set(tr.flight_id) & set(test.flight_id)
    assert not set(engine.FEATURES) & {
        "dep_delay",
        "cancelled",
        "diverted",
        "scheduled_utc",
        "label_available_utc",
    }
    report = engine.reports()[0]
    assert report["n"]["test"] > 0 and report["rolling_origin"]
    assert report["metrics"]["historical_median"]["test"]["mae"] > 0


def test_actual_saved_model_predicts_and_is_reproducible():
    a = engine.predict(
        "synthetic", dict(origin="ATL", dest="JFK", carrier="DL", hour=18, month=4, dow=4, distance=760)
    )
    b = engine.predict(
        "synthetic", dict(origin="ATL", dest="JFK", carrier="DL", hour=6, month=4, dow=4, distance=760)
    )
    assert np.isfinite(a["prediction_minutes"])
    assert a["prediction_minutes"] != b["prediction_minutes"]
    assert a["interval_minutes"][0] < a["prediction_minutes"] < a["interval_minutes"][1]
    old = engine.reports()[0]
    new = engine.train()
    assert old["metrics"] == new["metrics"] and old["dataset_sha256"] == new["dataset_sha256"]


def test_network_real_calculation():
    g = network()
    assert len(g["nodes"]) == 5 and len(g["edges"]) == 20
    assert sum(e["flights"] for e in g["edges"]) == len(store.load())


def test_simulation_pairing_reproducibility_and_service_capacity():
    a = simulate(repetitions=3, reduction=0.4)
    assert a == simulate(repetitions=3, reduction=0.4)
    zero = simulate(repetitions=3, reduction=0)
    assert zero["additional_delay_minutes"] == 0 and zero["downstream_mean_minutes"] == 0
    assert a["additional_delay_minutes"] > 0
    arrivals = np.array([0.0, 0.0, 0.0])
    waits, completions = _queue(arrivals, np.array([2.0, 2.0, 2.0]), 0, 120)
    assert list(waits) == [0, 2, 4] and list(completions) == [2, 4, 6]
    with pytest.raises(ValueError):
        simulate(repetitions=101)


@pytest.fixture
def client():
    return TestClient(app, base_url="http://127.0.0.1")


@pytest.mark.parametrize(
    "endpoint",
    [
        "/health",
        "/airports",
        "/providers/status",
        "/aircraft?mode=demo",
        "/aircraft?mode=replay",
        "/historical/flights?origin=ATL",
        "/historical/summary",
        "/network",
        "/models",
        "/models/synthetic/metrics",
        "/data/sources",
        "/airports/ATL/pulse",
    ],
)
def test_api_gets(client, endpoint):
    assert client.get("/api/v1" + endpoint).status_code == 200


def test_api_post_and_error_contract(client):
    prediction = client.post("/api/v1/predict", json={})
    assert prediction.status_code == 200 and prediction.json()["label"] == "SYNTHETIC DEMO MODEL"
    result = client.post("/api/v1/simulations", json={"repetitions": 2}).json()
    assert client.get("/api/v1/simulations/" + result["id"]).json() == result
    assert client.post("/api/v1/predict", json={"hour": 25}).status_code == 422
    assert client.post("/api/v1/predict", json={"origin": "BCN"}).status_code == 400
    assert client.post("/api/v1/simulations", json={"reduction": 1}).status_code == 422
    assert client.get("/api/v1/aircraft?radius_nm=251").status_code == 422
    assert client.get("/api/v1/models/../../etc/passwd/metrics").status_code == 404
    assert client.get("/api/v1/historical/flights?start=nope").status_code == 422
    assert client.get("/api/v1/historical/flights?dataset=bts").status_code in (200, 400)
    assert "ATL" in client.get("/api/v1/historical/export?origin=ATL").text


def test_bts_prefers_unique_carrier_alias(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DATA", tmp_path)
    path = bts_csv(tmp_path, OP_CARRIER="AA")
    store.ingest_bts(path)
    assert store.load("bts").iloc[0].carrier == "DL"


@pytest.mark.parametrize(
    "change", [{"DEP_DELAY": float("inf")}, {"CRS_DEP_TIME": 1800.5}, {"OP_UNIQUE_CARRIER": None}]
)
def test_bts_rejects_nonfinite_and_invalid_schedule_inputs(tmp_path, monkeypatch, change):
    monkeypatch.setattr(store, "DATA", tmp_path)
    with pytest.raises(ValueError):
        store.ingest_bts(bts_csv(tmp_path, **change))
