import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, geoGraticule10 } from "d3-geo";
import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Aircraft, Airport } from "./types";

export default function RadarMap({
  aircraft,
  region,
  radius,
  selected,
  onSelect,
}: {
  aircraft: Aircraft[];
  region: Airport;
  radius: number;
  selected?: string;
  onSelect: (a: Aircraft) => void;
}) {
  const [world, setWorld] = useState<FeatureCollection>();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState([0, 0]);
  const [online, setOnline] = useState(false);
  const [mapError, setMapError] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; pan: number[] } | undefined>(
    undefined,
  );
  const refAircraft = useRef(aircraft);
  refAircraft.current = aircraft;
  const refSelect = useRef(onSelect);
  refSelect.current = onSelect;
  useEffect(() => {
    fetch("/data/world.geojson")
      .then((r) => r.json())
      .then(setWorld)
      .catch(() =>
        setMapError(
          "Offline map asset missing. Reinstall the repository assets.",
        ),
      );
  }, []);
  useEffect(() => {
    setPan([0, 0]);
    setZoom(1);
  }, [region.lat, region.lon, radius]);
  const projection = useMemo(
    () =>
      geoMercator()
        .center([region.lon, region.lat])
        .scale(
          ((893814 * Math.cos((region.lat * Math.PI) / 180)) / radius) * zoom,
        )
        .translate([500 + pan[0], 320 + pan[1]])
        .clipExtent([
          [0, 0],
          [1000, 640],
        ]),
    [region, radius, zoom, pan],
  );
  const path = geoPath(projection);
  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraft.map((a) => ({
        type: "Feature" as const,
        id: a.icao24,
        geometry: { type: "Point" as const, coordinates: [a.lon, a.lat] },
        properties: {
          icao24: a.icao24,
          label: a.callsign ?? a.icao24,
          heading: a.track_deg ?? 0,
        },
      })),
    }),
    [aircraft],
  );
  useEffect(() => {
    if (!online || !host.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: host.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [region.lon, region.lat],
        zoom: 7,
      });
    } catch {
      setMapError("WebGL unavailable. Using the bundled offline map.");
      setOnline(false);
      return;
    }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    let failures = 0;
    m.on("error", () => {
      if (++failures > 2) {
        setMapError("Online tiles unavailable. Offline map remains available.");
        setOnline(false);
      }
    });
    m.on("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const c = canvas.getContext("2d")!;
      c.fillStyle = "#48c7dd";
      c.beginPath();
      c.moveTo(24, 3);
      c.lineTo(29, 20);
      c.lineTo(44, 30);
      c.lineTo(44, 35);
      c.lineTo(28, 29);
      c.lineTo(28, 39);
      c.lineTo(34, 43);
      c.lineTo(34, 46);
      c.lineTo(24, 43);
      c.lineTo(14, 46);
      c.lineTo(14, 43);
      c.lineTo(20, 39);
      c.lineTo(20, 29);
      c.lineTo(4, 35);
      c.lineTo(4, 30);
      c.lineTo(19, 20);
      c.closePath();
      c.fill();
      m.addImage("plane", c.getImageData(0, 0, 48, 48));
      m.addSource("aircraft", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "aircraft",
        type: "symbol",
        source: "aircraft",
        layout: {
          "icon-image": "plane",
          "icon-size": 0.55,
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "text-field": ["get", "label"],
          "text-size": 10,
          "text-offset": [0, 2],
          "text-allow-overlap": false,
        },
        paint: { "text-color": "#e0f5fa" },
      });
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: refAircraft.current.map((a) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [a.lon, a.lat] },
          properties: {
            icao24: a.icao24,
            label: a.callsign ?? a.icao24,
            heading: a.track_deg ?? 0,
          },
        })),
      };
      (m.getSource("aircraft") as maplibregl.GeoJSONSource).setData(data);
      m.on("click", "aircraft", (e) => {
        const a = refAircraft.current.find(
          (a) => a.icao24 === e.features?.[0].properties?.icao24,
        );
        if (a) refSelect.current(a);
      });
    });
    const timeout = setTimeout(() => {
      if (!m.isStyleLoaded()) {
        setMapError("Online map timed out. Use the bundled offline map.");
        setOnline(false);
      }
    }, 15000);
    return () => {
      clearTimeout(timeout);
      m.remove();
      map.current = undefined;
    };
  }, [online]); // region and aircraft update without rebuilding the map
  useEffect(() => {
    if (map.current?.getSource("aircraft"))
      (map.current.getSource("aircraft") as maplibregl.GeoJSONSource).setData(
        geojson,
      );
  }, [geojson]);
  useEffect(() => {
    map.current?.flyTo({ center: [region.lon, region.lat] });
  }, [region]);
  return (
    <div className="radar-map">
      <div className="map-toolbar">
        <span className="tiny">
          <i className="dot" /> {online ? "ONLINE TILES" : "OFFLINE VECTOR MAP"}
        </span>
        <button
          onClick={() => {
            setMapError("");
            setOnline(!online);
          }}
        >
          {online ? "Use offline map" : "Enable online map"}
        </button>
      </div>
      {online ? (
        <div ref={host} className="online-map" />
      ) : (
        <svg
          viewBox="0 0 1000 640"
          className="map-svg"
          aria-label="Interactive aircraft radar"
          onWheel={(e) =>
            setZoom((z) =>
              Math.max(0.3, Math.min(8, z * (e.deltaY < 0 ? 1.15 : 0.87))),
            )
          }
          onPointerDown={(e) => {
            if (
              e.target === e.currentTarget ||
              (e.target as Element).classList.contains("land")
            ) {
              drag.current = { x: e.clientX, y: e.clientY, pan };
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setPan([
                drag.current.pan[0] + (e.clientX - drag.current.x),
                drag.current.pan[1] + (e.clientY - drag.current.y),
              ]);
          }}
          onPointerUp={() => {
            drag.current = undefined;
          }}
        >
          <defs>
            <pattern
              id="grid"
              width="70"
              height="70"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M70 0H0V70"
                fill="none"
                stroke="#1a3041"
                strokeWidth=".6"
              />
            </pattern>
            <radialGradient id="scan">
              <stop stopColor="#48c7dd" stopOpacity=".07" />
              <stop offset="1" stopColor="#48c7dd" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1000" height="640" fill="#0a1723" />
          <rect width="1000" height="640" fill="url(#grid)" />
          <path
            d={path(geoGraticule10()) ?? ""}
            stroke="#1c3546"
            fill="none"
            strokeWidth=".5"
          />
          {world?.features.map((f, i) => (
            <path
              key={i}
              className="land"
              d={path(f) ?? ""}
              fill="#142b36"
              stroke="#2c4651"
              strokeWidth=".9"
            />
          ))}
          <circle cx="500" cy="320" r="260" fill="url(#scan)" />
          {[85, 170, 260].map((r) => (
            <circle
              key={r}
              cx="500"
              cy="320"
              r={r}
              fill="none"
              stroke="#48c7dd"
              strokeOpacity=".13"
              strokeDasharray="3 7"
            />
          ))}
          {(() => {
            const p = projection([region.lon, region.lat]);
            return (
              p && (
                <g transform={`translate(${p})`}>
                  <circle r="5" fill="#f2bd77" />
                  <text x="10" y="4" fill="#f2bd77" fontSize="12">
                    {region.iata}
                  </text>
                </g>
              )
            );
          })()}
          {aircraft.map((a) => {
            const p = projection([a.lon, a.lat]);
            if (!p) return null;
            return (
              <g
                key={a.icao24}
                transform={`translate(${p})`}
                className="aircraft"
                role="button"
                tabIndex={0}
                aria-label={`Select ${a.callsign ?? a.icao24}`}
                onClick={() => onSelect(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(a);
                  }
                }}
              >
                <rect
                  x="-15"
                  y="-26"
                  width="82"
                  height="44"
                  fill="transparent"
                />
                {selected === a.icao24 && (
                  <circle r="20" fill="#48c7dd22" stroke="#48c7dd" />
                )}
                <path
                  transform={`rotate(${a.track_deg ?? 0})`}
                  d="M0-12 3-2 12 4 12 7 3 3 3 9 6 12 6 14 0 12 -6 14 -6 12 -3 9 -3 3 -12 7 -12 4 -3-2Z"
                  fill={selected === a.icao24 ? "#fff" : "#48c7dd"}
                  stroke="#08111d"
                  strokeWidth=".6"
                />
                <text x="13" y="-12" fontSize="10" fill="#9fbac8">
                  {a.callsign}
                </text>
                <title>
                  {a.callsign} · {a.altitude_ft ?? "Unknown"} ft
                </title>
              </g>
            );
          })}
          <text x="24" y="612" fill="#66818f" fontSize="11">
            {region.lat.toFixed(3)}° N / {region.lon.toFixed(3)}° E · {radius}{" "}
            NM · scroll to zoom / drag to pan
          </text>
        </svg>
      )}
      {!online && (
        <div className="map-zoom">
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(8, z * 1.3))}
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.3, z / 1.3))}
          >
            −
          </button>
          <button
            aria-label="Reset map"
            onClick={() => {
              setZoom(1);
              setPan([0, 0]);
            }}
          >
            ⌖
          </button>
        </div>
      )}
      <div className="map-attribution">
        Made with Natural Earth ·{" "}
        {online
          ? "OpenFreeMap / © OpenStreetMap contributors"
          : "Public domain basemap · no network tiles"}
      </div>
      {mapError && (
        <div className="map-warning" role="status">
          {mapError}
        </div>
      )}
    </div>
  );
}
