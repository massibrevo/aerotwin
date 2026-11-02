"""Keyless ADSB.lol adapter. Never substitutes synthetic positions on live failure."""

import asyncio
import json
import math
import time
from datetime import UTC, datetime, timedelta
from typing import Protocol

import httpx
from aerotwin.config import DATA
from pydantic import BaseModel, Field, ValidationError


class Aircraft(BaseModel):
    icao24: str
    callsign: str | None = None
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lon: float = Field(ge=-180, le=180, allow_inf_nan=False)
    ground_speed_kt: float | None = Field(default=None, ge=0, le=1500, allow_inf_nan=False)
    altitude_ft: float | None = Field(default=None, ge=-2000, le=100000, allow_inf_nan=False)
    ground: bool = False
    track_deg: float | None = Field(default=None, ge=0, le=360, allow_inf_nan=False)
    vertical_rate_fpm: float | None = None
    observed_at_utc: str
    received_at_utc: str
    provider: str
    data_age_seconds: float = Field(ge=0, allow_inf_nan=False)


class AircraftProvider(Protocol):
    async def snapshot(self, lat: float, lon: float, radius_nm: float) -> dict: ...


def parse_response(payload, received=None):
    now = received or datetime.now(UTC)
    rows, rejected = [], 0
    for r in payload.get("ac", []):
        try:
            # seen_pos is the age of position, not the last transponder message.
            age = float(r.get("seen_pos", r.get("seen", 0)))
            a = Aircraft(
                icao24=r["hex"],
                callsign=(r.get("flight") or "").strip() or None,
                lat=r["lat"],
                lon=r["lon"],
                ground_speed_kt=r.get("gs"),
                altitude_ft=None if r.get("alt_baro") == "ground" else r.get("alt_baro"),
                ground=r.get("alt_baro") == "ground",
                track_deg=r.get("track"),
                vertical_rate_fpm=r.get("baro_rate"),
                provider="ADSB.lol",
                received_at_utc=now.isoformat(),
                observed_at_utc=(now - timedelta(seconds=age)).isoformat(),
                data_age_seconds=age,
            )
            rows.append(a.model_dump())
        except (KeyError, TypeError, ValueError, ValidationError):
            rejected += 1
    return rows, rejected


class AdsbLolProvider:
    def __init__(self, transport=None):
        self.transport = transport
        self.cache = {}
        self.lock = asyncio.Lock()
        self.next_request = 0.0
        self.failures = 0
        self.last_error = None
        self.last_received = None

    async def snapshot(self, lat, lon, radius_nm):
        key = (round(lat, 3), round(lon, 3), round(radius_nm, 1))
        async with self.lock:
            now = time.monotonic()
            if key in self.cache and now - self.cache[key][0] < 30:
                cached = dict(self.cache[key][1])
                cached["cached"] = True
                return cached
            if now < self.next_request:
                return self.unavailable(
                    "Provider cooldown; retry after the displayed interval.",
                    math.ceil(self.next_request - now),
                )
            try:
                async with httpx.AsyncClient(
                    timeout=10,
                    transport=self.transport,
                    headers={"User-Agent": "AeroTwin/0.1 local aviation research"},
                ) as client:
                    response = await client.get(
                        f"https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{radius_nm}"
                    )
                if response.status_code == 429:
                    try:
                        retry = min(600, max(30, float(response.headers.get("Retry-After", 60))))
                    except ValueError:
                        retry = 60
                    self.next_request = now + retry
                    self.last_error = "ADSB.lol rate limited (429)."
                    return self.unavailable(self.last_error, retry)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict) or not isinstance(payload.get("ac"), list):
                    raise ValueError("Unexpected ADSB.lol schema: missing ac array")
                rows, rejected = parse_response(payload)
                self.last_received = datetime.now(UTC).isoformat()
                self.failures, self.last_error = 0, None
                self.next_request = now + 1.1
                result = {
                    "mode": "live",
                    "status": "live",
                    "source": "ADSB.lol",
                    "aircraft": rows,
                    "received_at": self.last_received,
                    "rejected": rejected,
                    "cached": False,
                    "attribution": "ADSB.lol community observations · ODbL",
                    "retry_after_seconds": 30,
                }
                if len(self.cache) >= 32:
                    self.cache.pop(next(iter(self.cache)))
                self.cache[key] = (now, result)
                return result
            except (httpx.HTTPError, ValueError) as exc:
                self.failures += 1
                retry = min(300, 30 * 2 ** min(self.failures - 1, 4)) + 1
                self.next_request = now + retry
                self.last_error = (
                    f"Live observations unavailable ({type(exc).__name__}). Select demo or replay explicitly."
                )
                return self.unavailable(self.last_error, retry)

    def unavailable(self, message, retry):
        return {
            "mode": "live",
            "status": "unavailable",
            "source": "ADSB.lol",
            "aircraft": [],
            "received_at": None,
            "error": message,
            "retry_after_seconds": retry,
            "attribution": "ADSB.lol · ODbL",
        }


class SyntheticProvider:
    def snapshot(self, lat, lon, radius_nm, frame=0):
        # Epoch is deliberately fixed. Timestamps cannot be mistaken for current observations.
        epoch = datetime(2025, 1, 1, 12, tzinfo=UTC) + timedelta(seconds=frame * 30)
        rows = []
        for i in range(42):
            angle = i * 2.39996 + frame * 0.012
            distance = radius_nm * (0.15 + 0.8 * ((i * 17 % 43) / 43))
            y = max(-89.9, min(89.9, lat + math.cos(angle) * distance / 60))
            x = (
                (lon + math.sin(angle) * distance / (60 * max(0.05, math.cos(math.radians(lat))))) + 180
            ) % 360 - 180
            rows.append(
                Aircraft(
                    icao24=f"{0xA00000 + i:06x}",
                    callsign=f"SYN{i + 101}",
                    lat=y,
                    lon=x,
                    ground_speed_kt=180 + (i * 37) % 300,
                    altitude_ft=2000 + (i * 1300) % 38000,
                    track_deg=(math.degrees(angle) + 90) % 360,
                    vertical_rate_fpm=[-800, 0, 900][i % 3],
                    observed_at_utc=epoch.isoformat(),
                    received_at_utc=epoch.isoformat(),
                    provider="SYNTHETIC",
                    data_age_seconds=0,
                ).model_dump()
            )
        return {
            "mode": "demo",
            "status": "synthetic",
            "source": "SYNTHETIC DEMO",
            "aircraft": rows,
            "received_at": epoch.isoformat(),
            "frame": frame,
            "attribution": "Seeded AeroTwin examples · MIT",
        }


class RecordedReplayProvider:
    def snapshot(self, frame=0):
        path = DATA / "demo" / "replay.json"
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                json.dumps([SyntheticProvider().snapshot(41.297, 2.078, 100, n) for n in range(20)])
            )
        frames = json.loads(path.read_text())
        result = dict(frames[frame % len(frames)])
        result.update(
            mode="replay",
            status="replay",
            source="REPLAY · SYNTHETIC BCN RECORDING",
            frame=frame % len(frames),
        )
        return result
