import httpx
import pytest
from aerotwin.providers.aircraft import AdsbLolProvider
from aerotwin.providers.details import AircraftDetails


@pytest.mark.parametrize(
    "kind,query,path",
    [
        ("hex", "0200ea", "/v2/hex/0200EA"),
        ("registration", "CN-RGG", "/v2/reg/CN-RGG"),
        ("callsign", "RAM964Y", "/v2/callsign/RAM964Y"),
    ],
)
async def test_exact_search_uses_fixed_provider_path(kind, query, path):
    seen = []

    def handler(req):
        seen.append(req)
        return httpx.Response(
            200,
            json={
                "ac": [
                    {"hex": "0200ea", "flight": "RAM964Y", "r": "CN-RGG", "lat": 41, "lon": 2, "seen_pos": 1}
                ]
            },
        )

    p = AdsbLolProvider(httpx.MockTransport(handler))
    data = await p.lookup(kind, query)
    assert data["status"] == "live" and data["aircraft"][0]["registration"] == "CN-RGG"
    assert str(seen[0].url.path) == path
    await p.lookup(kind, query)
    assert len(seen) == 1
    with pytest.raises(ValueError):
        await p.lookup(kind, "../evil")


async def test_global_search_failure_never_fabricates_positions():
    p = AdsbLolProvider(httpx.MockTransport(lambda _: httpx.Response(429)))
    data = await p.lookup("hex", "0200ea")
    assert data["status"] == "unavailable" and not data["aircraft"]


async def test_details_match_identity_and_mark_route_unverified():
    def handler(req):
        return httpx.Response(
            200,
            json={"hex": "0200EA", "manufacturer": "Boeing", "registered_owner": "Example owner"}
            if "/aircraft/" in req.url.path
            else {
                "callsign": "RAM964Y",
                "updated_at": "2014-04-20T11:02:19Z",
                "airports": [{"icao": "GMMN", "iata": "CMN"}, {"icao": "LEBL", "iata": "BCN"}],
            },
        )

    p = AircraftDetails(httpx.MockTransport(handler))
    data = await p.lookup("0200ea", "RAM964Y")
    assert data["aircraft"]["manufacturer"] == "Boeing"
    assert data["route_reference"]["verified_for_observation"] is False
    assert data["route_reference"]["updated_at"].startswith("2014")
    assert "owner may differ" in data["caveat"]


async def test_details_bad_identity_bad_route_and_failure_are_safe():
    p = AircraftDetails(
        httpx.MockTransport(
            lambda _: httpx.Response(200, json={"hex": "ffffff", "callsign": "WRONG", "airports": None})
        )
    )
    data = await p.lookup("0200ea", "RAM964Y")
    assert data["aircraft"] is None and data["route_reference"] is None
    p = AircraftDetails(httpx.MockTransport(lambda _: httpx.Response(503)))
    assert (await p.lookup("0200ea"))["status"] == "unavailable"
    with pytest.raises(ValueError):
        await p.lookup("../evil")
