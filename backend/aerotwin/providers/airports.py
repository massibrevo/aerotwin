"""Offline airport references and optional official AWC METAR observations."""

import asyncio
import json
import math
import re
import time
import unicodedata
from datetime import UTC, datetime
from functools import lru_cache

import httpx
from aerotwin.config import ROOT


@lru_cache(maxsize=1)
def reference():
    path = ROOT / "backend/aerotwin/data/reference"
    data = json.loads((path / "airports.json").read_text())
    zones = json.loads((path / "timezones.json").read_text())["zones"]
    for a in data["airports"]:
        a["timezone"] = next(
            (zones[k] for k in [a["icao_code"], a["ident"], a["gps_code"]] if k in zones), None
        )
    return data


def normal(value):
    return "".join(
        c for c in unicodedata.normalize("NFKD", str(value or "").casefold()) if not unicodedata.combining(c)
    )


def search(query):
    text = normal(query.strip())
    rows = [
        a
        for a in reference()["airports"]
        if not text
        or text
        in normal(
            " ".join(str(a[k] or "") for k in ["ident", "icao_code", "iata_code", "name", "municipality"])
        )
    ]
    rows.sort(
        key=lambda a: (not any(normal(a[k]) == text for k in ["ident", "icao_code", "iata_code"]), a["name"])
    )
    return {
        "airports": [{k: v for k, v in a.items() if k != "runways"} for a in rows[:50]],
        "matches": len(rows),
        "metadata": reference()["metadata"],
    }


def details(code):
    if not re.fullmatch(r"[A-Za-z0-9-]{2,10}", code):
        raise ValueError("Invalid airport code")
    found = next(
        (a for a in reference()["airports"] if code.upper() in [a["ident"], a["icao_code"], a["iata_code"]]),
        None,
    )
    if not found:
        raise ValueError("Airport not present in bundled reference coverage")
    return {
        "airport": found,
        "metadata": reference()["metadata"],
        "caveat": "Reference snapshot, not current NOTAMs or operational runway availability. Timezone assignment is a database reference; missing zones remain unknown.",
    }


def finite(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None


class AirportWeather:
    def __init__(self, transport=None):
        self.transport = transport
        self.cache = {}
        self.lock = asyncio.Lock()
        self.next_request = 0.0

    async def lookup(self, code):
        airport = details(code)["airport"]
        station = next(
            (
                k
                for k in [airport["icao_code"], airport["ident"], airport["gps_code"]]
                if isinstance(k, str) and re.fullmatch(r"[A-Z]{4}", k)
            ),
            None,
        )
        empty = {
            "status": "unavailable",
            "station": station,
            "observation": None,
            "source": "NOAA/NWS Aviation Weather Center",
            "source_url": "https://aviationweather.gov/data/api/",
        }
        if not station:
            return {**empty, "reason": "No four-letter weather station identifier supplied"}
        async with self.lock:
            now = time.monotonic()
            if station in self.cache and self.cache[station][0] > now:
                return self.cache[station][1]
            if now < self.next_request:
                return {**empty, "reason": "Weather provider cooldown"}
            result = {**empty, "reason": "No current observation available"}
            try:
                async with httpx.AsyncClient(
                    timeout=10,
                    transport=self.transport,
                    headers={"User-Agent": "AeroTwin/0.5 (+https://github.com/massibrevo/aerotwin)"},
                ) as client:
                    response = await client.get(
                        "https://aviationweather.gov/api/data/metar",
                        params={"ids": station, "format": "json"},
                    )
                self.next_request = time.monotonic() + 1
                if response.status_code == 429:
                    retry = response.headers.get("Retry-After", "300")
                    self.next_request = (
                        time.monotonic() + max(60, float(retry))
                        if retry.isdigit()
                        else time.monotonic() + 300
                    )
                if response.status_code != 204:
                    response.raise_for_status()
                    rows = response.json()
                    valid = (
                        [
                            r
                            for r in rows
                            if isinstance(r, dict)
                            and r.get("icaoId") == station
                            and finite(r.get("obsTime")) is not None
                        ]
                        if isinstance(rows, list)
                        else []
                    )
                    if valid:
                        r = max(valid, key=lambda row: float(row["obsTime"]))
                        observed = datetime.fromtimestamp(float(r["obsTime"]), UTC)
                        age = (datetime.now(UTC) - observed).total_seconds()
                        if age < -600:
                            raise ValueError("Future observation timestamp")
                        visibility = str(r.get("visib", ""))
                        result = {
                            **empty,
                            "status": "stale" if age > 7200 else "available",
                            "retrieved_at": datetime.now(UTC).isoformat(),
                            "observation": {
                                "observed_at": observed.isoformat(),
                                "raw": str(r.get("rawOb", ""))[:1000],
                                "temperature_c": finite(r.get("temp")),
                                "dewpoint_c": finite(r.get("dewp")),
                                "wind_direction": r.get("wdir")[:16]
                                if isinstance(r.get("wdir"), str)
                                else finite(r.get("wdir")),
                                "wind_speed_kt": finite(r.get("wspd")),
                                "wind_gust_kt": finite(r.get("wgst")),
                                "pressure_hpa": finite(r.get("altim")),
                                "visibility_sm": finite(visibility.rstrip("+")),
                                "visibility_lower_bound": visibility.endswith("+"),
                                "flight_category": r.get("fltCat")
                                if r.get("fltCat") in ["VFR", "MVFR", "IFR", "LIFR"]
                                else None,
                            },
                        }
            except (httpx.HTTPError, ValueError, TypeError, OverflowError):
                self.next_request = max(self.next_request, time.monotonic() + 1)
                result = {**empty, "reason": "Weather provider unavailable or invalid response"}
            if len(self.cache) >= 64:
                self.cache.pop(next(iter(self.cache)))
            self.cache[station] = (time.monotonic() + (600 if result["observation"] else 60), result)
            return result
