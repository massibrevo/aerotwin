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


## Aircraft reference photographs

Optional live-card thumbnails come from the [Planespotters.net Photo API](https://www.planespotters.net/photo/api). Copyright remains with each photographer; they are not MIT/ODbL assets. The returned thumbnail links to the source photo page with visible photographer credit. No photos are bundled or persisted by AeroTwin. Metadata is cached in memory for one hour. Synthetic/replay modes do not request photographs. Provider availability, matching accuracy and current livery are not guaranteed. See `radar-ui-v0.3.md` for network and caching behaviour.


## Aircraft metadata references (0.4)

Optional HexDB identity and callsign-route references use its documented keyless public API: https://hexdb.io/. Provider/source terms apply. No blanket open-data licence is assumed and no metadata mirror is bundled. Registered ownership does not establish the current operator; route records are explicitly unverified for a live observation and show their source update dates. Only short-lived, bounded memory caching is used. Selected public hex/callsign identifiers are sent to the source.


## Airport/runway and timezone reference (0.5)

Bundled airport/runway fields are an OurAirports public-domain snapshot (https://ourairports.com/data/). The separate IANA timezone mapping is derived from OpenFlights.org contributors under ODbL 1.0 (https://github.com/jpatokal/openflights/tree/master/data); its licence is bundled at `backend/aerotwin/data/reference/OpenFlights-ODbL.txt`. The derived mapping is made available under ODbL. Source URLs, build time and original-file SHA-256 digests accompany the airport reference. Reference data is not warranted for current operational use. Optional NOAA/NWS AWC METAR observations are fetched at runtime, not bundled. Local recordings retain their ADSB.lol/ODbL source attribution and stay outside the repository and release archive.
