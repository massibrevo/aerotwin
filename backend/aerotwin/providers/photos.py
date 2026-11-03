"""Optional Planespotters thumbnails. Cache metadata in memory, never image files."""

import asyncio
import re
import time
from urllib.parse import urlsplit

import httpx


def safe_url(value, hosts):
    if not isinstance(value, str):
        return False
    parsed = urlsplit(value)
    return (
        parsed.scheme == "https"
        and parsed.hostname in hosts
        and parsed.port in (None, 443)
        and not parsed.username
        and not parsed.password
    )


class AircraftPhotos:
    def __init__(self, transport=None):
        self.transport = transport
        self.cache = {}
        self.lock = asyncio.Lock()
        self.cooldown = 0.0

    async def lookup(self, hex_code):
        if not re.fullmatch(r"[0-9a-fA-F]{6}", hex_code):
            raise ValueError("Aircraft photo lookup requires a six-character ICAO hex code")
        key = hex_code.lower()
        async with self.lock:
            now = time.monotonic()
            cached = self.cache.get(key)
            if cached and cached[0] > now:
                return cached[1]
            empty = {"status": "unavailable", "photo": None}
            if now < self.cooldown:
                return empty
            result = empty
            ttl = 60
            try:
                async with httpx.AsyncClient(
                    timeout=8,
                    transport=self.transport,
                    headers={"User-Agent": "AeroTwin/0.3 (+https://github.com/massibrevo/aerotwin)"},
                ) as client:
                    response = await client.get(f"https://api.planespotters.net/pub/photos/hex/{key}")
                if response.status_code == 429:
                    retry = response.headers.get("Retry-After", "60")
                    self.cooldown = now + max(60, float(retry)) if retry.isdigit() else now + 300
                response.raise_for_status()
                rows = response.json().get("photos", [])
                result = {"status": "not_found", "photo": None}
                ttl = 3600
                for row in rows:
                    src = row.get("thumbnail_large", row.get("thumbnail", {})).get("src")
                    link, credit = row.get("link"), row.get("photographer")
                    if (
                        safe_url(src, {"t.plnspttrs.net", "cdn.planespotters.net"})
                        and safe_url(link, {"www.planespotters.net", "planespotters.net"})
                        and isinstance(credit, str)
                        and credit.strip()
                    ):
                        result = {
                            "status": "available",
                            "photo": {
                                "src": src,
                                "link": link,
                                "photographer": credit,
                                "matched_icao24": key,
                                "source": "Planespotters.net",
                            },
                        }
                        break
            except (httpx.HTTPError, ValueError, TypeError, AttributeError):
                result = empty
            if len(self.cache) >= 256:
                self.cache.pop(next(iter(self.cache)))
            self.cache[key] = (now + ttl, result)
            return result
