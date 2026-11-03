import asyncio

import httpx
import pytest

from aerotwin.providers.photos import AircraftPhotos


PHOTO = {
    "thumbnail_large": {"src": "https://t.plnspttrs.net/1/test_280.jpg"},
    "link": "https://www.planespotters.net/photo/1/test",
    "photographer": "Test photographer",
}


def test_photo_lookup_credits_and_memory_cache():
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"photos": [PHOTO]})

    provider = AircraftPhotos(httpx.MockTransport(handler))
    first = asyncio.run(provider.lookup("0200EA"))
    assert first["photo"]["photographer"] == "Test photographer"
    assert first["photo"]["matched_icao24"] == "0200ea"
    assert asyncio.run(provider.lookup("0200ea")) == first
    assert len(calls) == 1
    assert "github.com/massibrevo/aerotwin" in calls[0].headers["user-agent"]


@pytest.mark.parametrize(
    "payload",
    [
        {"photos": []},
        {"photos": [{**PHOTO, "thumbnail_large": {"src": "https://evil.test/photo.jpg"}}]},
        {"photos": [{**PHOTO, "photographer": ""}]},
    ],
)
def test_missing_or_untrusted_photo_is_not_displayed(payload):
    provider = AircraftPhotos(httpx.MockTransport(lambda _: httpx.Response(200, json=payload)))
    assert asyncio.run(provider.lookup("0200ea"))["photo"] is None


def test_photo_failure_cooldown_and_invalid_input():
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(429, headers={"Retry-After": "120"})

    provider = AircraftPhotos(httpx.MockTransport(handler))
    assert asyncio.run(provider.lookup("0200ea"))["status"] == "unavailable"
    assert asyncio.run(provider.lookup("0200eb"))["photo"] is None
    assert len(calls) == 1
    with pytest.raises(ValueError):
        asyncio.run(provider.lookup("../../example"))
