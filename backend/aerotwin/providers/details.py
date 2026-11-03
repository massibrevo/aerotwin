"""Bounded, optional public database references; never verified flight-route claims."""

import asyncio
import re
import time
from datetime import UTC, datetime

import httpx


def text(value, limit=100):
    return value.strip()[:limit] if isinstance(value, str) and value.strip() else None


class AircraftDetails:
    def __init__(self, transport=None):
        self.transport = transport
        self.cache = {}
        self.lock = asyncio.Lock()
        self.cooldown = 0.0

    async def fetch(self, path):
        async with self.lock:
            now = time.monotonic()
            if path in self.cache and self.cache[path][0] > now:
                return self.cache[path][1]
            if now < self.cooldown:
                return None
            result = None
            try:
                async with httpx.AsyncClient(
                    timeout=8,
                    transport=self.transport,
                    headers={"User-Agent": "AeroTwin/0.4 (+https://github.com/massibrevo/aerotwin)"},
                ) as client:
                    response = await client.get(f"https://hexdb.io/api/v2/{path}")
                if response.status_code == 429:
                    retry = response.headers.get("Retry-After", "300")
                    self.cooldown = now + max(60, float(retry)) if retry.isdigit() else now + 300
                response.raise_for_status()
                payload = response.json()
                result = payload if isinstance(payload, dict) else None
            except (httpx.HTTPError, ValueError):
                pass
            if len(self.cache) >= 256:
                self.cache.pop(next(iter(self.cache)))
            self.cache[path] = (now + (3600 if result else 60), result)
            return result

    async def lookup(self, icao24, callsign=None):
        if not re.fullmatch(r"[a-fA-F0-9]{6}", icao24):
            raise ValueError("Invalid ICAO hex code")
        if callsign and not re.fullmatch(r"[a-zA-Z0-9]{2,12}", callsign):
            raise ValueError("Invalid callsign")
        raw = await self.fetch(f"aircraft/{icao24.lower()}")
        aircraft = None
        if raw and str(raw.get("hex", "")).lower() == icao24.lower():
            aircraft = {
                k: text(raw.get(k))
                for k in [
                    "registration",
                    "manufacturer",
                    "type",
                    "icao_type_code",
                    "registered_owner",
                    "operator_flag_code",
                ]
            }
        route = None
        if callsign:
            raw_route = await self.fetch(f"routes/{callsign.upper()}")
            if raw_route and str(raw_route.get("callsign", "")).upper() == callsign.upper():
                airports = []
                for airport in (
                    raw_route.get("airports") if isinstance(raw_route.get("airports"), list) else []
                )[:12]:
                    if isinstance(airport, dict) and re.fullmatch(r"[A-Z]{4}", str(airport.get("icao", ""))):
                        airports.append({k: text(airport.get(k)) for k in ["icao", "iata", "name"]})
                if len(airports) >= 2:
                    route = {
                        "airports": airports,
                        "updated_at": text(raw_route.get("updated_at")),
                        "verified_for_observation": False,
                    }
        return {
            "status": "available" if aircraft or route else "unavailable",
            "aircraft": aircraft,
            "route_reference": route,
            "source": "HexDB",
            "source_url": "https://hexdb.io/",
            "retrieved_at": datetime.now(UTC).isoformat(),
            "caveat": "Database reference only. Registered owner may differ from operator; callsigns and registrations can be reused. Route is not verified for this flight.",
        }
