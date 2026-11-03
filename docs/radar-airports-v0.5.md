# Radar performance, recorded sessions and airport reference · 0.5

## Rendering and movement

Online fleets above 250 filtered aircraft use MapLibre GeoJSON symbol layers and generated sprite icons, rather than one DOM marker per aircraft. Callsign labels use the map engine's collision placement when style glyphs are available. Smaller fleets retain accessible DOM marker buttons. The traffic list shows 200 rows at a time with an explicit next-page button; search still covers the complete snapshot. Keyboard selection remains available through that list.

Offline rendering draws at most 500 filtered positions, retaining the selected aircraft. A visible note reports the cap; data and list counts are not truncated. Spatial-grid label collision checks replace the previous pairwise scan. Unit tests cover 5,000 features and collocated label candidates; browser checks exercise a 1,200-aircraft fleet. This bounds DOM work but is not an FPS or maximum-throughput guarantee for every device.

**Animate updates** is optional and off by default. On the online DOM path (≤250 aircraft), a 1.2-second transition moves between received coordinates using the short wrapped longitude difference. It respects reduced-motion preferences and never extrapolates beyond a received endpoint. Large jumps are not animated. SVG/dense-GPU paths retain observation updates. Display animation never creates stored trail points, recordings or model features. Selection, trails, following and unit conversion preserve their original observation data.

## Opt-in local recording

In **Live ADS-B → Record / sessions**, choose a label and retention of 1, 7 or 30 days, then press **Start local LIVE recording**. Only successful snapshots returned by the backend ADSB.lol adapter can be captured. The API does not accept uploaded/client-supplied frames. Each request must explicitly carry the open session identity. Demo/replay responses cannot be recorded. Exact cached duplicate snapshots are deduplicated.

The client must stay open and visible: no daemon or background harvesting is added. Recording continues while the app is visible on another page, using the selected live query; the header shows **LIVE · REC**. Pausing refresh suspends new collection. Changing mode/region ends that client recording; restarting the server closes open sessions. Reloading the browser does not resume collection automatically. An abandoned session can remain listed as open until closed or the server restarts; the library provides a close action. Nothing is captured without that session's explicit live query requests.

Limits: 20 sessions, 1,000 snapshots per session, 50 MiB **compressed frame payloads** in total, and 4 MiB uncompressed maximum per frame. The SQLite file/temporary WAL/experiment ledger add overhead beyond the payload quota. Quota/frame limits stop collection without substituting or truncating a frame. Storage warnings do not turn a functioning live feed into a false provider outage. Expired sessions are removed on storage access/capture; expiry is not a wall-clock deletion daemon while the app/server is closed.

Frames are gzip-compressed JSON in the local SQLite state under `AEROTWIN_HOME/data/processed` (or project `data/processed`). Coordinates, callsigns, registration/type, position ages, original observation/receipt timestamps, query geography and capture time are retained. They stay out of Git and release ZIPs. Live observations retain ADSB.lol attribution/ODbL terms. No recording export/upload or hosted storage is added.

## Recorded playback and deletion

Stop the session, refresh/open the library if needed, then **Replay observations**. Playback requests saved frames, not the live provider. Badges state **RECORDED · NOT LIVE**. Original capture/receipt and per-aircraft observation timestamps remain historic. Select frames or play at 0.5/1/2 frames per second; these speeds are explicitly **frame playback**, not real-time reconstruction. Playback stops at the final frame and does not wrap silently.

Per-session trail state resets when recordings change or playback rewinds. Live photo/metadata lookups are disabled during recorded playback, so present-day database details are not represented as historic observations. Favourites saved from a recorded aircraft refer to its real identity and can be looked up separately in live mode.

**Delete recording** opens an explicit permanent-deletion confirmation. Deleting a currently displayed recording clears that playback; SQLite rows are removed and a vacuum reclaims space. Deletion is irreversible in the application. Original externally copied backups, browser screenshots and already viewed information cannot be retracted by deleting the local recording.

## Airport explorer

The offline reference contains 6,146 large/medium airports plus small airports marked with scheduled service. It does not claim complete coverage of every private strip/heliport. Search matches IATA/ICAO/reference identifiers, airport name and municipality; up to 50 matches are shown. Runway length/width, ends, true headings, surface and source closed/lighted flags are displayed. They are **reference flags**, not current availability, runway-in-use or NOTAM information.

Airport/runway data comes from OurAirports public-domain snapshots. Individual record ages/accuracy are not established by the bundle's build date. Separate OpenFlights IANA timezone references are supplied under ODbL, with its licence and source attribution. Missing zones remain unknown; local time uses IANA rules/DST rather than a fixed UTC offset. Bundled source checksums are in `backend/aerotwin/data/reference/airports.json`. The generation script is `scripts/build_airport_reference.py`; it takes the three documented local source files in `work/airport-source` and never downloads sources at runtime.

Weather is an optional, fixed-host NOAA/NWS Aviation Weather Center METAR request for the supplied four-letter station identifier. A custom User-Agent identifies the app; requests are serialised with cooldown handling and positive metadata cached for 10 minutes (negative results briefly). The observation UTC time, current age, raw METAR and reported category are shown. Observations older than two hours are marked stale. No report or provider failure remains unavailable; no synthetic/nearby-airport substitute is invented. AWC visibility is interpreted as statute miles, including a lower-bound suffix, before display-unit conversion. Wind is in provider knots before conversion; temperature stays °C and pressure hPa.

Airport reference and weather are independent of the aircraft/schedule data mode. Weather is **not** inserted into the historical T−120 forecast inputs. This is not an aviation briefing or operational decision aid.

Sources: [MapLibre GeoJSON source API](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/), [OurAirports data and terms](https://ourairports.com/data/), [OpenFlights data and licence](https://github.com/jpatokal/openflights/tree/master/data), [AWC API and usage restrictions](https://aviationweather.gov/data/api/).

## Mathematics

The new in-app **Mathematical methods** page is linked from Analytics studio, Forecast lab and Methodology. The [complete mathematical appendix](mathematical-methods.md) defines eligibility/denominators, quantiles, standardisation, temporal embargoes, MAE/RMSE/bias, the implemented residual-quantile convention, Wilson coverage intervals, paired date-block bootstrap, covariate shift, per-case sensitivity, network measures, queue simulation, geometry and units. Equations describe the implementation and its assumptions, not certified aviation performance.
