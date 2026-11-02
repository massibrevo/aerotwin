import { useState } from "react";
import { Plane, Search, Settings2 } from "lucide-react";
import RadarMap from "../RadarMap";
import { presets } from "../presets";
import type { RadarProps, Mode } from "../types";
import { Badge, State, Panel, num } from "../components/UI";
export default function Radar(p: RadarProps) {
  const [search, setSearch] = useState("");
  const [minAlt, setMinAlt] = useState(0);
  const [maxAlt, setMaxAlt] = useState(45000);
  const [minSpeed, setMinSpeed] = useState(0);
  const [custom, setCustom] = useState(false);
  const [lat, setLat] = useState(p.region.lat);
  const [lon, setLon] = useState(p.region.lon);
  const [customRadius, setCustomRadius] = useState(p.radius);
  const [formError, setFormError] = useState("");
  const rows = (p.snapshot?.aircraft ?? []).filter(
    (a) =>
      `${a.callsign ?? ""} ${a.icao24}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      ((a.altitude_ft === null && minAlt === 0) ||
        (a.altitude_ft !== null &&
          a.altitude_ft >= minAlt &&
          a.altitude_ft <= maxAlt)) &&
      (a.ground_speed_kt ?? 0) >= minSpeed,
  );
  const picked = p.snapshot?.aircraft.find(
    (a) => a.icao24 === p.selected?.icao24,
  );
  return (
    <>
      <div className="controls-bar">
        <div className="segmented">
          {(["demo", "replay", "live"] as Mode[]).map((m) => (
            <button
              className={p.mode === m ? "active" : ""}
              key={m}
              onClick={() => p.setMode(m)}
            >
              {m === "demo"
                ? "Synthetic demo"
                : m === "replay"
                  ? "Replay"
                  : "Live ADS-B"}
            </button>
          ))}
        </div>
        <label>
          Region
          <select
            aria-label="Radar region"
            value={p.region.iata}
            onChange={(e) => {
              const r = presets.find((r) => r.iata === e.target.value);
              if (r) p.setRegion(r);
            }}
          >
            {presets.map((r) => (
              <option key={r.iata} value={r.iata}>
                {r.name} · {r.iata}
              </option>
            ))}
            {p.region.iata === "CUSTOM" && (
              <option value="CUSTOM">Custom region</option>
            )}
          </select>
        </label>
        <button onClick={() => setCustom(!custom)}>
          <Settings2 size={14} />
          Custom region
        </button>
        <button onClick={p.refreshNow}>Refresh now</button>
        <label>
          Cadence
          <select
            aria-label="Refresh interval"
            value={p.refresh}
            onChange={(e) => p.setRefresh(+e.target.value)}
          >
            {[30, 60, 120].map((v) => (
              <option key={v} value={v}>
                {v}s
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => p.setPaused(!p.paused)}>
          {p.paused ? "Resume polling" : "Pause polling"}
        </button>
      </div>
      {custom && (
        <form
          className="controls-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lon) ||
              lat < -90 ||
              lat > 90 ||
              lon < -180 ||
              lon > 180 ||
              customRadius < 1 ||
              customRadius > 250
            ) {
              setFormError("Latitude ±90, longitude ±180, radius 1–250 NM.");
              return;
            }
            p.setRegion({
              iata: "CUSTOM",
              name: "Custom region",
              lat,
              lon,
              tz: "UTC",
            });
            p.setRadius(customRadius);
            setFormError("");
          }}
        >
          <label>
            Latitude
            <input
              aria-label="Custom latitude"
              type="number"
              step=".001"
              value={lat}
              onChange={(e) => setLat(+e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              aria-label="Custom longitude"
              type="number"
              step=".001"
              value={lon}
              onChange={(e) => setLon(+e.target.value)}
            />
          </label>
          <label>
            Radius (NM)
            <input
              aria-label="Custom radius"
              type="number"
              value={customRadius}
              onChange={(e) => setCustomRadius(+e.target.value)}
            />
          </label>
          <button type="submit">Apply geography</button>
          {formError && <span role="alert">{formError}</span>}
        </form>
      )}
      <State error={p.radarError} loading={!p.snapshot && !p.radarError} />
      {p.snapshot?.error && (
        <div className="notice error" role="alert">
          {p.snapshot.error} Retry after {p.snapshot.retry_after_seconds}s.
          Select Synthetic demo to continue offline.
        </div>
      )}
      {p.age !== null && p.age > 60 && (
        <div role="status" className="notice">
          Stale data · Last received {Math.floor(p.age)} seconds ago.
        </div>
      )}
      <div className="radar-layout">
        <Panel
          title="Traffic in coverage"
          aside={
            <span className="tiny">
              {rows.length} / {p.snapshot?.aircraft.length ?? 0}
            </span>
          }
          className="aircraft-list"
        >
          <div className="search">
            <Search size={15} />
            <input
              aria-label="Search aircraft"
              placeholder="Callsign or ICAO hex"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="range-label">
            Min altitude <span>{num(minAlt)} ft</span>
            <input
              aria-label="Minimum altitude"
              type="range"
              min="0"
              max="45000"
              step="1000"
              value={minAlt}
              onChange={(e) => setMinAlt(+e.target.value)}
            />
          </label>
          <label className="range-label">
            Max altitude <span>{num(maxAlt)} ft</span>
            <input
              aria-label="Maximum altitude"
              type="range"
              min="0"
              max="45000"
              step="1000"
              value={maxAlt}
              onChange={(e) => setMaxAlt(+e.target.value)}
            />
          </label>
          <label className="range-label">
            Min speed <span>{minSpeed} kt</span>
            <input
              aria-label="Minimum speed"
              type="range"
              min="0"
              max="600"
              step="20"
              value={minSpeed}
              onChange={(e) => setMinSpeed(+e.target.value)}
            />
          </label>
          <div className="aircraft-scroll">
            {rows.map((a) => (
              <button
                key={a.icao24}
                className={`aircraft-row ${picked?.icao24 === a.icao24 ? "selected" : ""}`}
                onClick={() => p.setSelected(a)}
              >
                <Plane size={17} />
                <span>
                  <strong>{a.callsign ?? a.icao24}</strong>
                  <small>{a.icao24.toUpperCase()}</small>
                </span>
                <span>
                  <strong>{num(a.altitude_ft)}</strong>
                  <small>{num(a.ground_speed_kt)} kt</small>
                </span>
              </button>
            ))}
            {!rows.length && (
              <p className="muted">No positions match this query.</p>
            )}
          </div>
        </Panel>
        <Panel
          title={`${p.mode === "live" ? "Observed" : "Example"} airspace · ${p.mode === "replay" ? "Barcelona" : p.region.name}`}
          aside={
            <Badge tone={p.mode === "live" ? "cyan" : "amber"}>
              {p.snapshot?.source ?? "LOADING"}
            </Badge>
          }
          className="map-panel"
        >
          <RadarMap
            aircraft={rows}
            region={p.mode === "replay" ? presets[0] : p.region}
            radius={p.radius}
            selected={picked?.icao24}
            onSelect={p.setSelected}
          />
          <div className="radar-status">
            <span>{p.snapshot?.attribution}</span>
            <span>
              {p.snapshot?.received_at
                ? new Date(p.snapshot.received_at)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19) + " UTC"
                : "No observation time"}
            </span>
          </div>
        </Panel>
        {picked && (
          <aside className="inspector" aria-label="Aircraft inspector">
            <div className="panel-heading">
              <h2>Aircraft detail</h2>
              <button
                aria-label="Close inspector"
                onClick={() => p.setSelected(undefined)}
              >
                ×
              </button>
            </div>
            <Plane size={32} />
            <h3>{picked.callsign ?? picked.icao24}</h3>
            <Badge tone="amber">{picked.provider}</Badge>
            <dl>
              {[
                ["ICAO hex", picked.icao24],
                [
                  "Altitude",
                  picked.ground
                    ? "Ground"
                    : picked.altitude_ft == null
                      ? "Unknown"
                      : num(picked.altitude_ft) + " ft",
                ],
                ["Ground speed", num(picked.ground_speed_kt) + " kt"],
                ["Track", num(picked.track_deg) + "°"],
                ["Vertical rate", num(picked.vertical_rate_fpm) + " ft/min"],
                [
                  "Coordinates",
                  `${picked.lat.toFixed(4)}, ${picked.lon.toFixed(4)}`,
                ],
                ["Position age at receipt", picked.data_age_seconds + "s"],
                ["Observed UTC", picked.observed_at_utc],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="small muted">
              No verified airline, destination or schedule is inferred from this
              callsign.
            </p>
          </aside>
        )}
      </div>
      {p.mode !== "live" && (
        <Panel
          title="Replay controls"
          aside={<Badge tone="amber">SYNTHETIC RECORDING</Badge>}
        >
          <div className="controls-bar">
            <button onClick={() => p.setFrame((p.frame + 1) % 20)}>
              Next frame
            </button>
            <label className="timeline">
              Frame {p.frame % 20} / 19
              <input
                aria-label="Replay frame"
                type="range"
                min="0"
                max="19"
                value={p.frame % 20}
                onChange={(e) => p.setFrame(+e.target.value)}
              />
            </label>
            <span className="small muted">
              30-second snapshots · Fixed 2025-01-01 example epoch · No
              interpolated positions
            </span>
          </div>
        </Panel>
      )}
    </>
  );
}
