from datetime import UTC, datetime, timedelta
import httpx
import pytest
from aerotwin import recordings, storage
from aerotwin.providers.airports import AirportWeather, details, search
from aerotwin.providers.aircraft import SyntheticProvider


def live_frame(index=0):
    data = SyntheticProvider().snapshot(41.297, 2.078, 100, index)
    data.update(
        mode="live", status="live", source="ADSB.lol", received_at=f"2026-11-03T12:00:{index:02d}+00:00"
    )
    for row in data["aircraft"]:
        row["provider"] = "ADSB.lol"
    return data


@pytest.fixture
def clean_recordings():
    with storage.connection() as db:
        recordings.setup(db)
        db.execute("DELETE FROM recording_frames")
        db.execute("DELETE FROM recordings")
    yield


def test_recording_source_dedup_replay_and_delete(clean_recordings):
    created = recordings.start("Test session", 41.297, 2.078, 100, 7)
    key = created["id"]
    fake = SyntheticProvider().snapshot(41.297, 2.078, 100)
    assert recordings.capture(key, fake, 41.297, 2.078, 100)["status"] == "not_captured"
    frame = live_frame()
    assert recordings.capture(key, frame, 41.297, 2.078, 100)["frames"] == 1
    assert recordings.capture(key, frame, 41.297, 2.078, 100)["duplicate"]
    recordings.capture(key, live_frame(1), 41.297, 2.078, 100)
    played = recordings.frame(key, 1)
    assert played["mode"] == "recorded" and "NOT LIVE" in played["source"]
    assert played["aircraft"] == live_frame(1)["aircraft"]
    assert played["received_at"] == live_frame(1)["received_at"]
    recordings.stop(key)
    assert recordings.capture(key, live_frame(2), 41.297, 2.078, 100)["status"] == "stopped"
    recordings.delete(key)
    assert not recordings.inventory()["sessions"]
    with pytest.raises(ValueError):
        recordings.frame(key, 0)


def test_recording_quota_geography_retention_and_recovery(clean_recordings, monkeypatch):
    key = recordings.start("Limits", 41.297, 2.078, 100, 1)["id"]
    assert recordings.capture(key, live_frame(), 0, 0, 100)["status"] == "stopped"
    key = recordings.start("Frames", 41.297, 2.078, 100, 1)["id"]
    monkeypatch.setattr(recordings, "MAX_FRAMES", 1)
    recordings.capture(key, live_frame(), 41.297, 2.078, 100)
    assert recordings.capture(key, live_frame(1), 41.297, 2.078, 100)["status"] == "stopped"
    key = recordings.start("Recovery", 41.297, 2.078, 100, 1)["id"]
    recordings.recover()
    assert not next(s for s in recordings.inventory()["sessions"] if s["id"] == key)["active"]
    with storage.connection() as db:
        db.execute(
            "UPDATE recordings SET expires_at=?", ((datetime.now(UTC) - timedelta(days=1)).isoformat(),)
        )
    assert not recordings.inventory()["sessions"]
    key = recordings.start("Bytes", 41.297, 2.078, 100, 1)["id"]
    monkeypatch.setattr(recordings, "MAX_BYTES", 1)
    assert recordings.capture(key, live_frame(), 41.297, 2.078, 100)["status"] == "stopped"
    with pytest.raises(ValueError):
        recordings.start("Bad", 1, 1, 100, 2)


def test_airport_reference_coverage_search_and_timezone():
    result = search("BCN")
    assert result["airports"][0]["ident"] == "LEBL"
    airport = details("BCN")["airport"]
    assert airport["timezone"] == "Europe/Madrid" and len(airport["runways"]) >= 2
    assert any(r["length_ft"] > 5000 for r in airport["runways"])
    assert search("Heathrow")["matches"] > 0
    with pytest.raises(ValueError):
        details("../bad")


async def test_weather_exact_station_units_timestamp_and_cache():
    now = datetime.now(UTC)
    calls = []

    def handler(req):
        calls.append(req)
        return httpx.Response(
            200,
            json=[
                {
                    "icaoId": "LEBL",
                    "obsTime": int(now.timestamp()),
                    "rawOb": "METAR LEBL fixture",
                    "temp": 14,
                    "wspd": 8,
                    "wdir": "VRB",
                    "visib": "6+",
                    "altim": 1016,
                    "fltCat": "VFR",
                }
            ],
        )

    p = AirportWeather(httpx.MockTransport(handler))
    r = await p.lookup("BCN")
    assert r["status"] == "available" and r["observation"]["wind_speed_kt"] == 8
    assert r["observation"]["visibility_lower_bound"] and r["observation"]["visibility_sm"] == 6
    assert r["observation"]["wind_direction"] == "VRB"
    await p.lookup("LEBL")
    assert len(calls) == 1
    assert calls[0].url.params["ids"] == "LEBL"


@pytest.mark.parametrize(
    "status,payload", [(204, None), (503, None), (200, []), (200, [{"icaoId": "WRONG", "obsTime": 1}])]
)
async def test_missing_weather_never_becomes_synthetic(status, payload):
    p = AirportWeather(httpx.MockTransport(lambda _: httpx.Response(status, json=payload)))
    r = await p.lookup("LEBL")
    assert r["status"] == "unavailable" and r["observation"] is None


def test_recording_http_flow_captures_only_server_provider_results(clean_recordings, monkeypatch):
    from fastapi.testclient import TestClient
    from aerotwin.api import app as api

    async def snapshot(*args):
        return live_frame()

    monkeypatch.setattr(api.live, "snapshot", snapshot)
    c = TestClient(api.app, base_url="http://localhost")
    started = c.post(
        "/api/v1/recordings",
        json={"label": "HTTP fixture", "lat": 41.297, "lon": 2.078, "radius_nm": 100, "retention_days": 1},
    )
    assert started.status_code == 200
    key = started.json()["id"]
    assert c.get(f"/api/v1/aircraft?mode=live&recording_id={key}").json()["recording_state"]["frames"] == 1
    assert c.post(f"/api/v1/recordings/{key}/stop").status_code == 200
    played = c.get(f"/api/v1/recordings/{key}/frames?index=0")
    assert played.status_code == 200 and played.json()["mode"] == "recorded"
    assert (
        c.delete(f"/api/v1/recordings/{key}", headers={"origin": "https://external.example"}).status_code
        == 403
    )
    assert c.delete(f"/api/v1/recordings/{key}").status_code == 200
    assert (
        c.post(
            "/api/v1/recordings", json={"label": "bad", "lat": 0, "lon": 0, "radius_nm": 100, "frames": []}
        ).status_code
        == 422
    )
