import time

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from aerotwin import jobs, storage
from aerotwin.api.app import app
from aerotwin.data import store
from aerotwin.ml import engine
from aerotwin.providers.aircraft import parse_response
from aerotwin.web import mount_frontend


def client():
    return TestClient(app, base_url="http://127.0.0.1")


def test_durable_history_and_recovery():
    identifier = storage.record("simulation", {"baseline": 1.0, "scenario": 2.0})
    assert storage.get(identifier, "simulation") == {"baseline": 1.0, "scenario": 2.0}
    jobs._save({"id": "interrupted-fixture", "status": "running", "created_at": "2025-01-01", "stage": "fit"})
    jobs.recover_interrupted()
    assert jobs.state("interrupted-fixture")["status"] == "failed"
    assert storage.recent("simulation", 1)[0]["id"] == identifier


def test_static_routes_assets_missing_api_and_traversal(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "data").mkdir()
    (tmp_path / "index.html").write_text("<html>AeroTwin release</html>")
    (tmp_path / "data/world.geojson").write_text("{}")
    (tmp_path / "assets/app.js").write_text("/* built */")
    local = FastAPI()
    mount_frontend(local, tmp_path)
    c = TestClient(local)
    for path in ["/", "/radar", "/analytics", "/airports", "/math", "/data", "/guide"]:
        assert "AeroTwin release" in c.get(path).text
    assert c.get("/assets/app.js").status_code == 200
    assert c.get("/api/v1/unknown").status_code == 404
    assert c.get("/assets/..%2f..%2fpyproject.toml").status_code == 404
    assert c.get("/assets/missing.js").status_code == 404
    assert c.get("/data/world.geojson").json() == {}


def test_invalid_import_preserves_existing_snapshot(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DATA", tmp_path)
    csv = tmp_path / "valid.csv"
    rows = [
        dict(
            FlightDate=date,
            Reporting_Airline="DL",
            Origin="ATL",
            Dest="JFK",
            CRSDepTime=1800,
            DepDelay=delay,
            Cancelled=0,
            Diverted=0,
            Distance=760,
            Flight_Number_Reporting_Airline=1,
        )
        for date, delay in [("2025-01-01", 5), ("2025-02-01", 8)]
    ]
    pd.DataFrame(rows).to_csv(csv, index=False)
    report = store.ingest_bts(csv)
    assert report["rows"] == 2
    assert len(store.parquet_files()) == 2
    assert set(store.load("bts").dep_delay) == {5, 8}
    csv.write_text("not,the,correct,schema\n1,2,3,4\n")
    with pytest.raises(ValueError):
        store.ingest_bts(csv)
    assert store.provenance()["snapshot_id"] == report["snapshot_id"]
    assert store.query("bts", page_size=1)["total"] == 2
    assert len(store.query("bts", page_size=1)["rows"]) == 1


def test_model_integrity_and_dataset_staleness(monkeypatch, tmp_path):
    original = engine.model_report("synthetic")
    path = engine.MODELS / original["artifact"]
    assert engine.checked_artifact(original) == path
    damaged = dict(original, artifact_sha256="0" * 64)
    with pytest.raises(ValueError, match="integrity"):
        engine.checked_artifact(damaged)
    monkeypatch.setattr(engine, "dataset_revision", lambda dataset: "changed")
    values = dict(origin="ATL", dest="JFK", carrier="DL", hour=18, month=4, dow=4, distance=760)
    with pytest.raises(ValueError, match="stale"):
        engine.predict("synthetic", values)


def test_model_support_and_extrapolation_warnings():
    values = dict(origin="ATL", dest="JFK", carrier="DL", hour=18, month=12, dow=4, distance=760)
    result = engine.predict("synthetic", values)
    assert any("month" in warning for warning in result["warnings"])
    with pytest.raises(ValueError, match="Carrier"):
        engine.predict("synthetic", {**values, "carrier": "ZZ"})


def test_security_boundary_and_ready():
    c = client()
    assert c.get("/api/v1/ready").status_code == 200
    assert c.get("/api/v1/health", headers={"Host": "attacker.example"}).status_code == 400
    assert (
        c.post("/api/v1/models/train", json={}, headers={"Origin": "https://attacker.example"}).status_code
        == 403
    )
    assert c.post("/api/v1/models/train", json={}, headers={"Origin": "null"}).status_code == 403
    assert c.post("/api/v1/predict", json={"unknown_field": 1}).status_code == 422
    assert c.get("/api/v1/health").headers["x-content-type-options"] == "nosniff"
    assert c.get("/api/v1/historical/flights?start=2025-03-01&end=2025-01-01").status_code == 400


def test_import_endpoint_malformed_csv_does_not_change_data():
    c = client()
    assert (
        c.post("/api/v1/data/import-bts", content=b"hello", headers={"Content-Type": "text/csv"}).status_code
        == 400
    )
    assert c.post("/api/v1/data/import-bts", json={}).status_code == 415
    assert (
        c.post(
            "/api/v1/data/import-bts?timezone_map=[]", content=b"", headers={"Content-Type": "text/csv"}
        ).status_code
        == 400
    )


def test_background_training_has_real_persisted_completion():
    c = client()
    response = c.post("/api/v1/models/train", json={"dataset": "synthetic"})
    assert response.status_code == 202
    identifier = response.json()["id"]
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        job = c.get("/api/v1/jobs/" + identifier).json()
        if job["status"] not in ("queued", "running"):
            break
        time.sleep(0.1)
    assert job["status"] == "succeeded", job
    assert job["result"]["n"]["test"] > 0
    assert storage.get(identifier, "job")["status"] == "succeeded"


def test_unknown_position_age_is_never_fabricated_as_fresh():
    rows, rejected = parse_response({"ac": [{"hex": "abc123", "lat": 41, "lon": 2}]})
    assert rows == [] and rejected == 1


def test_optional_provider_registry_metadata_is_observed_not_inferred():
    rows, rejected = parse_response(
        {"ac": [{"hex": "abc123", "lat": 41, "lon": 2, "seen_pos": 1, "r": "EC-TEST", "t": "A320"}]}
    )
    assert rejected == 0 and rows[0]["registration"] == "EC-TEST"
    assert rows[0]["aircraft_type"] == "A320"
    assert "origin" not in rows[0] and "dest" not in rows[0]
