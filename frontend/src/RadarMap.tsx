import { tx, useLocale } from "./i18n";
import {
  addFleetLayers,
  fleetFeatures,
  wrappedLongitudeDelta,
} from "./features/radar/denseFleet";
import { useUnits } from "./units";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, geoGraticule10 } from "d3-geo";
import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Navigation,
  Check,
  Map as MapIcon,
} from "lucide-react";
import type { Aircraft, Airport } from "./types";
import {
  clampLatitude,
  visibleLabels,
  coverageRing,
  PLANE_PATH,
  type TrackPoint,
} from "./features/radar/geometry";

type Props = {
  aircraft: Aircraft[];
  region: Airport;
  radius: number;
  selected?: string;
  onSelect: (a: Aircraft) => void;
  initialOnline?: boolean;
  follow?: boolean;
  trail?: TrackPoint[];
  labels?: boolean;
  coverage?: boolean;
  recenter?: number;
  animateUpdates?: boolean;
};
function RadarMap({
  aircraft,
  region,
  radius,
  selected,
  onSelect,
  initialOnline = false,
  follow = false,
  trail = [],
  labels = true,
  coverage = true,
  recenter = 0,
  animateUpdates = false,
}: Props) {
  useLocale();
  const u = useUnits();
  const offlineAircraft = useMemo(() => {
    const rows = aircraft.slice(0, 500);
    const picked = aircraft.find((a) => a.icao24 === selected);
    if (picked && !rows.includes(picked)) rows[rows.length - 1] = picked;
    return rows;
  }, [aircraft, selected]);
  const [world, setWorld] = useState<FeatureCollection>();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState([0, 0]);
  const [online, setOnline] = useState(initialOnline);
  const [night, setNight] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mapError, setMapError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const map = useRef<maplibregl.Map | undefined>(undefined);
  const markers = useRef(
    new Map<string, { marker: maplibregl.Marker; button: HTMLButtonElement }>(),
  );
  const drag = useRef<
    { x: number; y: number; pan: number[]; factor: number } | undefined
  >(undefined);
  const live = useRef({
    aircraft,
    selected,
    onSelect,
    labels,
    coverage,
    trail,
    region,
    radius,
  });
  live.current = {
    aircraft,
    selected,
    onSelect,
    labels,
    coverage,
    trail,
    region,
    radius,
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/world.geojson", { signal: controller.signal })
      .then((r) => r.json())
      .then(setWorld)
      .catch((e) => {
        if (e.name !== "AbortError")
          setMapError(
            "Bundled offline geography is missing. Restore the distribution assets.",
          );
      });
    return () => controller.abort();
  }, []);
  const centerLat = clampLatitude(region.lat);
  const projection = useMemo(
    () =>
      geoMercator()
        .center([region.lon, centerLat])
        .scale(
          ((893814 * Math.cos((centerLat * Math.PI) / 180)) / radius) * zoom,
        )
        .translate([500 + pan[0], 320 + pan[1]])
        .clipExtent([
          [0, 0],
          [1000, 640],
        ]),
    [region.lon, centerLat, radius, zoom, pan],
  );
  const land = useMemo(() => {
    const draw = geoPath(projection);
    return world?.features.map((f, i) => (
      <path key={i} className="land" d={draw(f) ?? ""} />
    ));
  }, [world, projection]);
  const offlineLabels = useMemo(
    () =>
      visibleLabels(
        offlineAircraft.map((a) => {
          const p = projection([a.lon, clampLatitude(a.lat)]) ?? [0, 0];
          return {
            id: a.icao24,
            x: p[0],
            y: p[1],
            text: a.callsign ?? a.icao24,
          };
        }),
        selected,
      ),
    [offlineAircraft, projection, selected],
  );
  const draw = geoPath(projection);
  const reset = () => {
    setZoom(1);
    setPan([0, 0]);
    const m = map.current;
    if (m) {
      const delta = radius / 60;
      m.fitBounds(
        [
          [
            region.lon -
              delta / Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)),
            clampLatitude(centerLat - delta),
          ],
          [
            region.lon +
              delta / Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)),
            clampLatitude(centerLat + delta),
          ],
        ],
        {
          padding: { left: 60, right: 60, top: 80, bottom: 80 },
          duration: 600,
        },
      );
    }
  };
  useEffect(() => {
    reset();
  }, [region.lat, region.lon, radius, recenter]);
  useEffect(() => {
    if (!online || !host.current) return;
    setLoaded(false);
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: host.current,
        style: `https://tiles.openfreemap.org/styles/${night ? "dark" : "liberty"}`,
        center: [region.lon, centerLat],
        zoom: 7,
        attributionControl: { compact: true },
        renderWorldCopies: false,
      });
    } catch {
      setMapError(
        "WebGL is unavailable. The offline map remains fully interactive.",
      );
      setOnline(false);
      return;
    }
    map.current = m;
    let failures = 0;
    let finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      setMapError(message);
      setOnline(false);
    };
    m.on("error", () => {
      if (++failures >= 3)
        fail("Online map unavailable. Showing the bundled offline map.");
    });
    m.on("load", () => {
      if (finished) return;
      setLoaded(true);
      const v = live.current;
      if (!night)
        for (const layer of m.getStyle().layers)
          if (layer.type === "fill" && /water/.test(layer.id))
            m.setPaintProperty(layer.id, "fill-color", "#c8dfe9");
      m.addSource("coverage", {
        type: "geojson",
        data: coverageRing(v.region.lat, v.region.lon, v.radius),
      });
      m.addLayer({
        id: "coverage-fill",
        type: "fill",
        source: "coverage",
        paint: { "fill-color": "#1479bc", "fill-opacity": 0.025 },
      });
      m.addLayer({
        id: "coverage-line",
        type: "line",
        source: "coverage",
        paint: {
          "line-color": night ? "#80cadb" : "#3086b4",
          "line-width": 1.5,
          "line-dasharray": [4, 5],
          "line-opacity": 0.65,
        },
      });
      m.addSource("observed-trail", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "observed-trail-line",
        type: "line",
        source: "observed-trail",
        paint: { "line-color": "#047cba", "line-width": 3 },
      });
      addFleetLayers(m);
      m.on("click", "fleet-planes", (e) => {
        const id = e.features?.[0]?.properties?.id;
        const current = live.current.aircraft.find((a) => a.icao24 === id);
        if (current) live.current.onSelect(current);
      });
      m.on("click", "fleet-selected", (e) => {
        const id = e.features?.[0]?.properties?.id;
        const current = live.current.aircraft.find((a) => a.icao24 === id);
        if (current) live.current.onSelect(current);
      });
      const delta = v.radius / 60,
        cos = Math.max(0.1, Math.cos((v.region.lat * Math.PI) / 180));
      m.fitBounds(
        [
          [v.region.lon - delta / cos, clampLatitude(v.region.lat - delta)],
          [v.region.lon + delta / cos, clampLatitude(v.region.lat + delta)],
        ],
        { padding: { left: 50, right: 50, top: 60, bottom: 70 }, duration: 0 },
      );
    });
    const timeout = setTimeout(() => {
      if (!m.isStyleLoaded())
        fail("Online map timed out. Showing the bundled offline map.");
    }, 12000);
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(host.current);
    return () => {
      finished = true;
      clearTimeout(timeout);
      resize.disconnect();
      markers.current.forEach((v) => v.marker.remove());
      markers.current.clear();
      m.remove();
      map.current = undefined;
      setLoaded(false);
    };
  }, [online, night]);
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const dense = aircraft.length > 250;
    (m.getSource("fleet") as maplibregl.GeoJSONSource)?.setData(
      fleetFeatures(dense ? aircraft : [], selected),
    );
    if (m.getLayer("fleet-labels"))
      m.setLayoutProperty(
        "fleet-labels",
        "visibility",
        dense && labels ? "visible" : "none",
      );
    if (dense) {
      markers.current.forEach((v) => v.marker.remove());
      markers.current.clear();
      return;
    }
    const animations: {
      item: { marker: maplibregl.Marker };
      from: { lng: number; lat: number };
      to: Aircraft;
    }[] = [];
    let animation = 0;
    const ids = new Set(aircraft.map((a) => a.icao24));
    for (const [id, v] of markers.current)
      if (!ids.has(id)) {
        v.marker.remove();
        markers.current.delete(id);
      }
    for (const a of aircraft) {
      let item = markers.current.get(a.icao24);
      if (!item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-aircraft aircraft";
        button.innerHTML = `<span class="plane-symbol"><svg viewBox="-18 -18 36 36" aria-hidden="true"><path d="${PLANE_PATH}"/></svg></span><span class="aircraft-label"></span>`;
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          const current = live.current.aircraft.find(
            (x) => x.icao24 === a.icao24,
          );
          if (current) live.current.onSelect(current);
        });
        item = {
          button,
          marker: new maplibregl.Marker({ element: button, anchor: "center" })
            .setLngLat([a.lon, clampLatitude(a.lat)])
            .addTo(m),
        };
        markers.current.set(a.icao24, item);
      }
      const from = item.marker.getLngLat();
      if (
        animateUpdates &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        Math.abs(from.lat - a.lat) < 2 &&
        Math.abs(wrappedLongitudeDelta(from.lng, a.lon)) < 2
      )
        animations.push({ item, from, to: a });
      else item.marker.setLngLat([a.lon, clampLatitude(a.lat)]);
      item.button.classList.toggle("is-selected", a.icao24 === selected);
      item.button.classList.toggle("show-label", labels);
      item.button.classList.toggle("unknown-track", a.track_deg == null);
      item.button.setAttribute(
        "aria-label",
        tx(`Select ${a.callsign ?? a.icao24}`),
      );
      item.button.setAttribute("aria-pressed", String(a.icao24 === selected));
      item.button.title = `${a.callsign ?? a.icao24} · ${a.altitude_ft == null ? tx("Unknown altitude") : u.format(a.altitude_ft, "altitude")} · ${u.format(a.ground_speed_kt, "speed")}`;
      const label = item.button.querySelector(".aircraft-label")!;
      label.textContent = a.callsign ?? a.icao24.toUpperCase();
      (
        item.button.querySelector(".plane-symbol") as HTMLElement
      ).style.transform = `rotate(${a.track_deg ?? 0}deg)`;
    }
    const placeLabels = () => {
      const allowed = visibleLabels(
        aircraft.map((a) => {
          const p = m.project([a.lon, clampLatitude(a.lat)]);
          return { id: a.icao24, x: p.x, y: p.y, text: a.callsign ?? a.icao24 };
        }),
        selected,
      );
      for (const [id, item] of markers.current)
        item.button.classList.toggle("show-label", labels && allowed.has(id));
    };
    if (animations.length) {
      const started = performance.now();
      const draw = () => {
        const t = Math.min(1, (performance.now() - started) / 1200);
        for (const a of animations)
          a.item.marker.setLngLat([
            t === 1
              ? a.to.lon
              : ((a.from.lng +
                  wrappedLongitudeDelta(a.from.lng, a.to.lon) * t +
                  540) %
                  360) -
                180,
            a.from.lat + (clampLatitude(a.to.lat) - a.from.lat) * t,
          ]);
        if (t < 1) animation = requestAnimationFrame(draw);
      };
      animation = requestAnimationFrame(draw);
    }
    placeLabels();
    m.on("moveend", placeLabels);
    return () => {
      cancelAnimationFrame(animation);
      m.off("moveend", placeLabels);
    };
  }, [aircraft, selected, labels, loaded, u, animateUpdates]);
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    (m.getSource("coverage") as maplibregl.GeoJSONSource)?.setData(
      coverageRing(region.lat, region.lon, radius),
    );
    for (const id of ["coverage-line", "coverage-fill"])
      m.setLayoutProperty(id, "visibility", coverage ? "visible" : "none");
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features:
        trail.length > 1
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: trail.map((p) => [p.lon, clampLatitude(p.lat)]),
                },
              },
            ]
          : [],
    };
    (m.getSource("observed-trail") as maplibregl.GeoJSONSource)?.setData(data);
  }, [region, radius, coverage, trail, loaded]);
  useEffect(() => {
    const a = aircraft.find((a) => a.icao24 === selected);
    if (!follow || !a) return;
    if (online)
      map.current?.easeTo({
        center: [a.lon, clampLatitude(a.lat)],
        duration: 650,
      });
    else {
      const point = projection([a.lon, clampLatitude(a.lat)]);
      if (point)
        setPan((old) => [old[0] + 500 - point[0], old[1] + 320 - point[1]]);
    }
  }, [aircraft, selected, follow, online, loaded]);
  return (
    <div
      data-renderer={
        online ? (aircraft.length > 250 ? "webgl" : "dom") : "offline"
      }
      className={`radar-map ${night ? "map-night" : "map-day"} ${online ? "map-online" : "map-offline"}`}
    >
      {online ? (
        <div
          ref={host}
          className="online-map"
          data-map-ready={loaded}
          aria-label={tx("OpenFreeMap street map")}
        />
      ) : (
        <svg
          ref={svg}
          viewBox="0 0 1000 640"
          preserveAspectRatio="xMidYMid slice"
          className="map-svg"
          aria-label={tx("Interactive aircraft radar")}
          onWheel={(e) =>
            setZoom((z) =>
              Math.max(0.3, Math.min(12, z * (e.deltaY < 0 ? 1.12 : 0.89))),
            )
          }
          onPointerDown={(e) => {
            if ((e.target as Element).closest(".aircraft")) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              pan,
              factor:
                1 /
                Math.max(
                  (svg.current?.getBoundingClientRect().width ?? 1000) / 1000,
                  (svg.current?.getBoundingClientRect().height ?? 640) / 640,
                ),
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setPan([
                drag.current.pan[0] +
                  (e.clientX - drag.current.x) * drag.current.factor,
                drag.current.pan[1] +
                  (e.clientY - drag.current.y) * drag.current.factor,
              ]);
          }}
          onPointerUp={() => {
            drag.current = undefined;
          }}
          onPointerCancel={() => {
            drag.current = undefined;
          }}
        >
          <defs>
            <pattern
              id="radar-grid"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path d="M80 0H0V80" className="map-grid" fill="none" />
            </pattern>
          </defs>
          <rect className="map-water" width="1000" height="640" />
          <rect width="1000" height="640" fill="url(#radar-grid)" />
          <path
            d={draw(geoGraticule10()) ?? ""}
            className="map-graticule"
            fill="none"
          />
          {tx(land)}
          {coverage && (
            <path
              className="coverage-ring"
              d={draw(coverageRing(region.lat, region.lon, radius)) ?? ""}
            />
          )}
          {trail.length > 1 && (
            <path
              className="observed-trail"
              d={
                draw({
                  type: "LineString",
                  coordinates: trail.map((p) => [p.lon, clampLatitude(p.lat)]),
                }) ?? ""
              }
            />
          )}
          {(() => {
            const point = projection([region.lon, centerLat]);
            return (
              point && (
                <g transform={`translate(${point})`} className="airport-marker">
                  <circle r="7" />
                  <text x="13" y="5">
                    {tx(region.iata)}
                  </text>
                </g>
              )
            );
          })()}
          {offlineAircraft.map((a) => {
            const point = projection([a.lon, clampLatitude(a.lat)]);
            if (
              !point ||
              point[0] < 0 ||
              point[0] > 1000 ||
              point[1] < 0 ||
              point[1] > 640
            )
              return null;
            return (
              <g
                key={a.icao24}
                transform={`translate(${point})`}
                className={`aircraft svg-aircraft ${a.icao24 === selected ? "is-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={tx(`Select ${a.callsign ?? a.icao24}`)}
                aria-pressed={a.icao24 === selected}
                onClick={() => onSelect(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(a);
                  }
                }}
              >
                <rect
                  className="aircraft-hitbox"
                  x="-21"
                  y="-24"
                  width="84"
                  height="48"
                  fill="transparent"
                />
                {a.icao24 === selected && (
                  <circle className="selection-halo" r="25" />
                )}
                <path
                  className="plane-path"
                  transform={`rotate(${a.track_deg ?? 0})`}
                  d={PLANE_PATH}
                />
                {((labels && offlineLabels.has(a.icao24)) ||
                  a.icao24 === selected) && (
                  <text className="plane-label" x="18" y="-13">
                    {tx(a.callsign ?? a.icao24.toUpperCase())}
                  </text>
                )}
                <title>
                  {tx(a.callsign)} {tx(" ·")}
                  {tx(" ")}
                  {tx(
                    a.ground ? "Ground" : u.format(a.altitude_ft, "altitude"),
                  )}
                </title>
              </g>
            );
          })}
        </svg>
      )}
      {!online && aircraft.length > 500 && (
        <div className="map-density-note">
          {tx(
            `Offline map: ${offlineAircraft.length} of ${aircraft.length} aircraft drawn. Use search to narrow the display.`,
          )}
        </div>
      )}
      {online && aircraft.length > 250 && (
        <div className="map-density-note">
          {tx(
            "GPU fleet rendering · keyboard selection available in traffic list",
          )}
        </div>
      )}
      {online && !loaded && (
        <div className="map-loading" role="status">
          <span />
          {tx("Loading free street map…")}
        </div>
      )}
      <div className="map-toolbar">
        <button
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          className="map-layers-button"
        >
          <Layers size={17} />
          {tx(online ? (night ? "Dark map" : "Street map") : "Offline map")}
        </button>
        <button
          className="basemap-toggle"
          onClick={() => {
            setMapError("");
            setOnline(!online);
          }}
        >
          {tx(online ? "Use offline map" : "Enable online map")}
        </button>
        {menu && (
          <div className="map-layer-menu">
            <span className="overline">{tx("BASEMAP")}</span>
            {[
              { label: "Street map", net: true, dark: false },
              { label: "Dark map", net: true, dark: true },
              { label: "Offline map", net: false, dark: night },
            ].map((o) => (
              <button
                key={o.label}
                onClick={() => {
                  setNight(o.dark);
                  setOnline(o.net);
                  setMapError("");
                  setMenu(false);
                }}
              >
                <MapIcon size={16} />
                {tx(o.label)}
                {online === o.net && (!online || night === o.dark) && (
                  <Check size={15} />
                )}
              </button>
            ))}
            <p>
              {tx("OpenFreeMap · OpenStreetMap data")}
              <br />
              {tx("Offline: Natural Earth, coarse geometry")}
            </p>
          </div>
        )}
      </div>
      <div className="map-zoom">
        <button
          aria-label={tx("Zoom in")}
          title={tx("Zoom in")}
          onClick={() =>
            online
              ? map.current?.zoomIn()
              : setZoom((z) => Math.min(12, z * 1.3))
          }
        >
          <Plus size={20} />
        </button>
        <button
          aria-label={tx("Zoom out")}
          title={tx("Zoom out")}
          onClick={() =>
            online
              ? map.current?.zoomOut()
              : setZoom((z) => Math.max(0.3, z / 1.3))
          }
        >
          <Minus size={20} />
        </button>
        <button
          aria-label={tx("Reset map")}
          title={tx("Fit queried coverage")}
          onClick={reset}
        >
          <Navigation size={18} />
        </button>
        <button
          aria-label={tx("Reset map bearing")}
          title={tx("North up")}
          onClick={() => map.current?.resetNorth()}
          disabled={!online}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="map-attribution">
        {tx(
          online
            ? "OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors"
            : "Natural Earth · Public domain · Offline geography",
        )}
      </div>
      {mapError && (
        <div className="map-warning" role="status">
          {tx(mapError)}
        </div>
      )}
    </div>
  );
}
export default memo(RadarMap);
