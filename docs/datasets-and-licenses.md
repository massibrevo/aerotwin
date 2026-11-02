# Datasets and licenses

| Source | Usage | Terms |
| --- | --- | --- |
| AeroTwin examples | 3,840 seeded synthetic flights / 20 synthetic replay frames | MIT; generated locally, never BTS or real observations |
| Natural Earth 1:110m countries | Bundled offline GeoJSON | [Public domain](https://www.naturalearthdata.com/about/terms-of-use/) |
| ADSB.lol | Explicit live geographic requests | [API](https://api.adsb.lol/docs), [project](https://www.adsb.lol/) / ODbL; retain attribution and respect database redistribution obligations |
| BTS On-Time Performance | Explicit user CSV imports | [TranStats](https://www.transtats.bts.gov/); inspect terms of the chosen official extract |
| OpenFreeMap / OSM | Optional online tiles | [Provider terms](https://openfreemap.org/tos/) / © OpenStreetMap contributors, ODbL |

Natural Earth geography was obtained from the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). Its coarse boundaries are not airport charts. No bulk tile cache, remote fonts or imagery is required.

ADSB.lol positions are community observations and may be sparse, stale or incomplete. Query radius is nautical miles, maximum 250. Missing altitude stays unknown or explicit ground. Callsign cannot identify a verified route, destination, airline or delay. Cache receipt times are preserved for freshness. No observed position database is committed.

The committed provider fixture is a minimal artificial response matching the actual verified ADSB.lol schema, with deliberate invalid records. Local live integration was also checked; raw observed payloads remain outside this repository. Tests do not require live network.

BTS raw files, processed imports and trained artifacts stay out of Git. Imports save input SHA-256, import UTC, coverage, timezone mappings, duplicate/null/cancelled/diverted counts. No automatic large download or invented BTS endpoint is implemented. Optional weather is absent; historical reanalysis must never masquerade as issue-time forecast weather. Provider terms can change: verify them before redistribution or hosted use.
