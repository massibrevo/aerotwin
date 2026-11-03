# AeroTwin 0.3 — radar and workspace redesign

The user-provided FlightRadar screenshot informed map priority, readable aircraft, focused inspection and floating controls. AeroTwin retains its own visual identity and does not copy commercial branding, imagery or verified-route/schedule features it cannot support.

## Experience

- Full-height radar, compact navigation rail, region query control and explicit aircraft mode selector.
- OpenFreeMap's Liberty style (OSM/OpenMapTiles data), with a subdued water colour for contrast. Dark style and bundled Natural Earth fallback are selectable. All attribution is retained and visible above the status strip. No bulk caching.
- Gold track-rotated markers, blue selected state, accessible marker buttons and collision-aware callsigns. Hover/focus/selection reveal labels. The list is a keyboard-accessible alternative.
- Traffic search, bounded altitude/speed filters and reset/empty states. A single observation panel replaces the list on selection, avoiding multiple sidebars squeezing the map.
- Source-provided registration/type, when present; original ft/kt/track units and timestamps. No inferred airline, origin/destination, flight number, schedule or fabricated aircraft photo. The airframe drawing is illustrative.
- Follow camera, query recenter, north-up, zoom, display toggles and expanded workspace. Escape exits expansion. Refresh and replay controls remain functional.
- Observed trails keep at most 120 returned positions per aircraft, deduplicate timestamps and reset across query/mode changes, rewinds and leaving the radar view. No interpolation or full-route reconstruction is claimed.
- Responsive phone layout starts with the traffic panel hidden and uses a bottom sheet when opened.

## Whole workspace

Light/dark themes persist in local browser storage. Route accents distinguish blue overview, teal pulse/data, indigo history, violet forecasting and amber simulation. Typography, control sizes, tables, tooltips, charts and secondary text have been increased. Metric cards retain actual values without invented trend claims. The page clock no longer forces data charts to redraw each second.

The command menu (Ctrl/⌘ K) uses cmdk; navigation tooltips use Radix. Motion provides restrained entry transitions and respects reduced-motion preferences; charts use short transitions or disable them for reduced motion. Versions resolved from the official npm registry at this update: Motion 14.9.0, @radix-ui/react-tooltip 1.4.1, cmdk 1.1.1, lucide-react 1.67.0, Recharts 3.10.1. Exact transitive versions are locked.

## Verification and limitations

Backend provider metadata is tested without inferring routes. Frontend tests cover geography/nautical-mile rings, finite Mercator limits, label collision priority, actual-observation trails and rewind/reset semantics. Browser checks cover online-style requests and offline fallback, aircraft selection, search, filters, follow, selection retention across updates, display expansion, themes, command navigation and narrow viewports, plus all historical/model/simulation flows. Screenshot capture against real free tiles is a separate opt-in QA run; CI does not require tile-provider uptime.

External maps require Internet; offline geometry remains coarse and not a navigation chart. The map pans independently of provider query coverage: changing the view does not scrape a global feed. The displayed circle and region/radius controls identify the queried geography. A synthetic data mode over real streets is still synthetic. Research/education limits are unchanged.

Primary documentation: [OpenFreeMap quick start](https://openfreemap.org/quick_start/), [terms](https://openfreemap.org/tos/), [Motion accessibility](https://motion.dev/docs/react-accessibility), [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip), [Recharts migration](https://github.com/recharts/recharts/wiki/3.0-migration-guide).

## Real aircraft photographs

The live observation card looks up the selected six-digit ICAO hex through the keyless [Planespotters photo API](https://www.planespotters.net/photo/api). It embeds only the returned thumbnail, uncropped, links it to the original photo page, and visibly credits the photographer. It is a reference photo matched by the provider's hex database, not an image of the current flight or a guarantee of today's livery. ICAO assignments and source records can change.

The server retains metadata for one hour in a bounded 256-entry memory cache; unavailable responses are cached briefly, and HTTP 429 pauses requests. No photo bytes are proxied, bundled, saved to disk or relicensed. Photos remain their photographers' copyright under the provider's terms. The browser loads thumbnails from the provider CDN, which receives the browser IP; the metadata service receives the selected aircraft's public ICAO hex. No lookup occurs for synthetic/replay aircraft. Missing photos, blocked images and provider outages show an explicit placeholder without affecting radar observations. Internet access is required; no credentials are required.
