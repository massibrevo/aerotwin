import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Plane,
  Search,
  Settings2,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Crosshair,
  MapPin,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  X,
  Play,
  Pause,
  RefreshCw,
  ChevronRight,
  Info,
  Route,
  Eye,
  Radio,
} from "lucide-react";
import RadarMap from "../RadarMap";
import { presets } from "../presets";
import type { RadarProps, Mode } from "../types";
import { Badge, num } from "../components/UI";
import { useObservedTrail } from "../features/radar/useObservedTrail";

export default function Radar(p: RadarProps) {
  const [search, setSearch] = useState("");
  const [minAlt, setMinAlt] = useState(0);
  const [maxAlt, setMaxAlt] = useState(45000);
  const [minSpeed, setMinSpeed] = useState(0);
  const [filters, setFilters] = useState(false);
  const [custom, setCustom] = useState(false);
  const [lat, setLat] = useState(p.region.lat);
  const [lon, setLon] = useState(p.region.lon);
  const [customRadius, setCustomRadius] = useState(p.radius);
  const [formError, setFormError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [listOpen, setListOpen] = useState(() => window.innerWidth > 700);
  const [follow, setFollow] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [labels, setLabels] = useState(true);
  const [coverage, setCoverage] = useState(true);
  const [recenter, setRecenter] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(
    () =>
      (p.snapshot?.aircraft ?? []).filter(
        (a) =>
          `${a.callsign ?? ""} ${a.icao24}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          ((a.altitude_ft === null && minAlt === 0) ||
            (a.altitude_ft !== null &&
              a.altitude_ft >= minAlt &&
              a.altitude_ft <= maxAlt)) &&
          (a.ground_speed_kt ?? 0) >= minSpeed,
      ),
    [p.snapshot, search, minAlt, maxAlt, minSpeed],
  );
  const picked = p.snapshot?.aircraft.find(
    (a) => a.icao24 === p.selected?.icao24,
  );
  const activeFilters =
    Number(minAlt > 0) + Number(maxAlt < 45000) + Number(minSpeed > 0);
  const region = p.mode === "replay" ? presets[0] : p.region;
  const context = `${p.mode}:${region.lat}:${region.lon}:${p.radius}`;
  const trail = useObservedTrail(p.snapshot, picked?.icao24, context);
  useEffect(() => {
    setFollow(false);
  }, [context]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFilters(false);
        setCustom(false);
        setExpanded(false);
      }
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const resetFilters = () => {
    setMinAlt(0);
    setMaxAlt(45000);
    setMinSpeed(0);
    setSearch("");
  };
  const status =
    p.mode === "live"
      ? p.snapshot?.status === "live"
        ? p.age !== null && p.age > 60
          ? "Stale observations"
          : "Live observations"
        : "Feed unavailable"
      : p.mode === "replay"
        ? "Synthetic recording"
        : "Synthetic aircraft";
  const changeMode = (m: Mode) => {
    p.setMode(m);
    setFollow(false);
  };
  return (
    <section
      className={`radar-workspace ${expanded ? "radar-expanded" : ""}`}
      aria-label="Radar workspace"
    >
      <h1 className="sr-only">Live radar</h1>
      <RadarMap
        aircraft={rows}
        region={region}
        radius={p.radius}
        selected={picked?.icao24}
        onSelect={p.setSelected}
        initialOnline
        follow={follow}
        trail={showTrail ? trail : []}
        labels={labels}
        coverage={coverage}
        recenter={recenter}
      />
      <div className="radar-top-controls">
        <div className="radar-location">
          <span className="location-icon">
            <MapPin size={19} />
          </span>
          <label>
            <span>EXPLORE AIRSPACE</span>
            <select
              aria-label="Radar region"
              value={p.region.iata}
              disabled={p.mode === "replay"}
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
          <span className="location-radius">
            {p.radius}
            <small>NM</small>
          </span>
          <button
            aria-label="Custom region"
            title="Custom geography"
            onClick={() => setCustom(!custom)}
          >
            <Settings2 size={17} />
          </button>
        </div>
        <div className="radar-mode-switch" aria-label="Aircraft data mode">
          {(["demo", "live", "replay"] as Mode[]).map((m) => (
            <button
              key={m}
              aria-pressed={p.mode === m}
              className={p.mode === m ? "active" : ""}
              onClick={() => changeMode(m)}
            >
              {m === "live" ? (
                <Radio size={15} />
              ) : m === "replay" ? (
                <Play size={14} />
              ) : (
                <Plane size={15} />
              )}
              <span>
                {m === "demo"
                  ? "Synthetic demo"
                  : m === "live"
                    ? "Live ADS-B"
                    : "Replay"}
              </span>
            </button>
          ))}
        </div>
        <div className="radar-view-tools">
          <button
            aria-label="Toggle traffic panel"
            title="Show or hide aircraft panel"
            aria-pressed={listOpen}
            onClick={() => setListOpen(!listOpen)}
          >
            <Plane size={18} />
            <span>Traffic</span>
            <b>{rows.length}</b>
          </button>
          <button
            aria-label={expanded ? "Exit expanded radar" : "Expand radar"}
            title={expanded ? "Exit expanded view" : "Expand map"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {custom && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="radar-custom-panel floating-panel"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lon) ||
                lat < -85 ||
                lat > 85 ||
                lon < -180 ||
                lon > 180 ||
                customRadius < 1 ||
                customRadius > 250
              ) {
                setFormError(
                  "Street maps support latitude ±85°, longitude ±180°, radius 1–250 NM.",
                );
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
              setCustom(false);
            }}
          >
            <div className="floating-heading">
              <h2>Choose your airspace</h2>
              <button
                type="button"
                aria-label="Close geography"
                onClick={() => setCustom(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="form-grid">
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
                Radius / NM
                <input
                  aria-label="Custom radius"
                  type="number"
                  min="1"
                  max="250"
                  value={customRadius}
                  onChange={(e) => setCustomRadius(+e.target.value)}
                />
              </label>
            </div>
            <button className="primary wide" type="submit">
              Apply geography
            </button>
            {formError && <p role="alert">{formError}</p>}
          </motion.form>
        )}
      </AnimatePresence>
      <div className="radar-map-caption">
        <span
          className={`signal-dot ${p.mode === "live" ? "" : "demo-signal"}`}
        />
        {status}
        <span className="caption-separator" /> {rows.length} shown{" "}
        <span className="muted">of {p.snapshot?.aircraft.length ?? 0}</span>
      </div>
      <AnimatePresence>
        {listOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
            className={`radar-traffic-panel floating-panel ${picked ? "has-selection" : ""}`}
            aria-label={picked ? "Aircraft inspector" : "Traffic in coverage"}
          >
            {picked ? (
              <>
                <div className="flight-card-heading">
                  <button
                    className="text-button"
                    onClick={() => {
                      p.setSelected(undefined);
                      setFollow(false);
                    }}
                  >
                    <ArrowLeft size={15} />
                    All aircraft
                  </button>
                  <button
                    aria-label="Close inspector"
                    onClick={() => {
                      p.setSelected(undefined);
                      setFollow(false);
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flight-identity">
                  <div>
                    <span className="overline">AIRCRAFT OBSERVATION</span>
                    <h2>{picked.callsign ?? picked.icao24.toUpperCase()}</h2>
                    <div className="flight-tags">
                      <span>{picked.icao24.toUpperCase()}</span>
                      {picked.aircraft_type && (
                        <span>{picked.aircraft_type}</span>
                      )}
                      <Badge tone={p.mode === "live" ? "cyan" : "amber"}>
                        {picked.provider}
                      </Badge>
                    </div>
                  </div>
                  <span className="flight-icon">
                    <Plane size={27} />
                  </span>
                </div>
                <div className="flight-airframe" aria-hidden="true">
                  <svg viewBox="0 0 300 90">
                    <path d="M20 60 55 57 90 25 103 25 92 55 213 48 231 30 240 30 238 49 265 54 279 60 264 65 232 66 224 78 216 78 216 66 91 67 106 86 94 86 65 66 26 66Z" />
                    <path
                      d="M45 43H160M167 43H186M209 18H260"
                      className="airframe-lines"
                    />
                  </svg>
                  <span>
                    {picked.aircraft_type ?? "Type not provided"}
                    <small>
                      {picked.registration ?? "Registration not provided"}
                    </small>
                  </span>
                </div>
                <div className="flight-metrics">
                  <div>
                    <span>ALTITUDE</span>
                    <strong>
                      {picked.ground ? "Ground" : num(picked.altitude_ft)}
                      <small>{picked.ground ? "" : "ft"}</small>
                    </strong>
                  </div>
                  <div>
                    <span>GROUND SPEED</span>
                    <strong>
                      {num(picked.ground_speed_kt)}
                      <small>kt</small>
                    </strong>
                  </div>
                  <div>
                    <span>TRACK</span>
                    <strong>
                      {num(picked.track_deg)}
                      <small>°</small>
                    </strong>
                  </div>
                </div>
                <div className="flight-state">
                  <span>
                    {(picked.vertical_rate_fpm ?? 0) > 300 ? (
                      <ArrowUpRight size={17} />
                    ) : (picked.vertical_rate_fpm ?? 0) < -300 ? (
                      <ArrowDownRight size={17} />
                    ) : (
                      <Minus size={17} />
                    )}{" "}
                    {picked.vertical_rate_fpm == null
                      ? "Vertical rate unknown"
                      : (picked.vertical_rate_fpm ?? 0) > 300
                        ? "Climbing"
                        : (picked.vertical_rate_fpm ?? 0) < -300
                          ? "Descending"
                          : "Level / low vertical rate"}
                  </span>
                  <b>{num(picked.vertical_rate_fpm)} ft/min</b>
                </div>
                <div className="flight-card-actions">
                  <button
                    className={follow ? "active" : ""}
                    aria-pressed={follow}
                    onClick={() => setFollow(!follow)}
                  >
                    <Crosshair size={16} />
                    {follow ? "Following" : "Follow aircraft"}
                  </button>
                  <button
                    className={showTrail ? "active" : ""}
                    aria-pressed={showTrail}
                    onClick={() => setShowTrail(!showTrail)}
                  >
                    <Route size={16} />
                    Observed trail
                  </button>
                </div>
                <dl className="flight-details">
                  <div>
                    <dt>Position</dt>
                    <dd>
                      {picked.lat.toFixed(4)}°, {picked.lon.toFixed(4)}°
                    </dd>
                  </div>
                  <div>
                    <dt>Observed / UTC</dt>
                    <dd>
                      {new Date(picked.observed_at_utc)
                        .toISOString()
                        .slice(11, 19)}
                    </dd>
                  </div>
                  <div>
                    <dt>Position age at receipt</dt>
                    <dd>{num(picked.data_age_seconds, 1)} s</dd>
                  </div>
                  <div>
                    <dt>Trail in this session</dt>
                    <dd>
                      {trail.length} observation{trail.length === 1 ? "" : "s"}
                    </dd>
                  </div>
                </dl>
                <p className="flight-disclaimer">
                  <Info size={14} />
                  <span>
                    Positions only. No verified origin, destination or schedule.
                    Trails connect this session’s observations.
                  </span>
                </p>
              </>
            ) : (
              <>
                <div className="traffic-heading">
                  <div>
                    <span className="overline">YOUR AIRSPACE</span>
                    <h2>
                      Air traffic <span>{rows.length}</span>
                    </h2>
                  </div>
                  <button
                    className={activeFilters || filters ? "active" : ""}
                    aria-label="Aircraft filters"
                    aria-expanded={filters}
                    onClick={() => setFilters(!filters)}
                  >
                    <SlidersHorizontal size={18} />
                    {activeFilters > 0 && <b>{activeFilters}</b>}
                  </button>
                </div>
                <div className="radar-search">
                  <Search size={18} />
                  <input
                    ref={searchRef}
                    aria-label="Search aircraft"
                    placeholder="Find a callsign or ICAO hex…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search ? (
                    <button
                      aria-label="Clear aircraft search"
                      onClick={() => setSearch("")}
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                {filters && (
                  <div className="traffic-filters">
                    <div className="floating-heading">
                      <h3>Filter observations</h3>
                      <button onClick={resetFilters}>Reset</button>
                    </div>
                    {[
                      {
                        label: "Minimum altitude",
                        name: "Min altitude",
                        value: minAlt,
                        set: setMinAlt,
                        max: 45000,
                        step: 1000,
                        unit: "ft",
                      },
                      {
                        label: "Maximum altitude",
                        name: "Max altitude",
                        value: maxAlt,
                        set: setMaxAlt,
                        max: 45000,
                        step: 1000,
                        unit: "ft",
                      },
                      {
                        label: "Minimum speed",
                        name: "Min speed",
                        value: minSpeed,
                        set: setMinSpeed,
                        max: 600,
                        step: 20,
                        unit: "kt",
                      },
                    ].map((c) => (
                      <label className="range-label" key={c.label}>
                        {c.name}
                        <strong>
                          {num(c.value)} {c.unit}
                        </strong>
                        <input
                          aria-label={c.label}
                          type="range"
                          min="0"
                          max={c.max}
                          step={c.step}
                          value={c.value}
                          onChange={(e) => c.set(+e.target.value)}
                        />
                      </label>
                    ))}
                    {minAlt > maxAlt && (
                      <p className="field-error">
                        Minimum altitude exceeds maximum.
                      </p>
                    )}
                  </div>
                )}
                <div className="traffic-column-head">
                  <span>AIRCRAFT</span>
                  <span>ALTITUDE / SPEED</span>
                </div>
                <div className="aircraft-scroll">
                  {rows.map((a) => (
                    <button
                      key={a.icao24}
                      className="aircraft-row"
                      onClick={() => p.setSelected(a)}
                    >
                      <span className="traffic-plane">
                        <Plane
                          size={19}
                          style={{
                            transform: `rotate(${(a.track_deg ?? 0) - 45}deg)`,
                          }}
                        />
                      </span>
                      <span>
                        <strong>{a.callsign ?? a.icao24.toUpperCase()}</strong>
                        <small>
                          {a.aircraft_type ?? a.icao24.toUpperCase()}
                          {a.registration ? " · " + a.registration : ""}
                        </small>
                      </span>
                      <span>
                        <strong>
                          {a.ground ? "Ground" : num(a.altitude_ft)}
                          <small className="inline-unit">
                            {a.ground ? "" : " ft"}
                          </small>
                        </strong>
                        <small>
                          {num(a.ground_speed_kt)} kt <ChevronRight size={11} />
                        </small>
                      </span>
                    </button>
                  ))}
                  {!rows.length && (
                    <div className="traffic-empty">
                      <Search size={24} />
                      <h3>No aircraft to display</h3>
                      <p>
                        {p.snapshot?.status === "unavailable"
                          ? "The live provider is unavailable. Choose demo explicitly to explore offline."
                          : "Try a different search or widen your filters."}
                      </p>
                      {activeFilters > 0 && (
                        <button onClick={resetFilters}>Clear filters</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="traffic-footer">
                  <Eye size={14} />
                  <span>
                    {p.mode === "live"
                      ? "Observed in queried coverage"
                      : "Clearly labelled example positions"}
                  </span>
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="radar-overlay-options">
        <label>
          <input
            type="checkbox"
            checked={labels}
            onChange={(e) => setLabels(e.target.checked)}
          />
          Callsigns
        </label>
        <label>
          <input
            type="checkbox"
            checked={coverage}
            onChange={(e) => setCoverage(e.target.checked)}
          />
          Coverage
        </label>
      </div>
      {(p.radarError || p.snapshot?.error) && (
        <div className="radar-alert" role="alert">
          <Info size={19} />
          <div>
            <strong>Live data is unavailable</strong>
            <p>{p.radarError || p.snapshot?.error}</p>
          </div>
        </div>
      )}
      <div className={`radar-playback ${p.mode === "live" ? "is-live" : ""}`}>
        <button
          className="playback-play"
          aria-label={p.paused ? "Resume polling" : "Pause polling"}
          title={
            p.paused ? "Resume automatic refresh" : "Pause automatic refresh"
          }
          onClick={() => p.setPaused(!p.paused)}
        >
          {p.paused ? <Play size={19} /> : <Pause size={19} />}
        </button>
        <div className="playback-time">
          <span>
            {p.mode === "live" ? "OBSERVATION TIME" : "SYNTHETIC / FIXED EPOCH"}
          </span>
          <strong>
            {p.snapshot?.received_at
              ? new Date(p.snapshot.received_at).toISOString().slice(11, 19)
              : "Waiting for data"}
            <small> UTC</small>
          </strong>
        </div>
        {p.mode !== "live" ? (
          <>
            <label className="playback-timeline">
              <span>Frame {p.frame % 20} / 19</span>
              <input
                aria-label="Replay frame"
                type="range"
                min="0"
                max="19"
                value={p.frame % 20}
                onChange={(e) => p.setFrame(+e.target.value)}
              />
            </label>
            <button
              className="next-frame"
              aria-label="Next frame"
              title="Next observation"
              onClick={() => p.setFrame((p.frame + 1) % 20)}
            >
              <ChevronRight size={19} />
            </button>
          </>
        ) : (
          <div className="playback-live">
            <span className="signal-dot" />
            <span>
              {p.age == null
                ? "No current snapshot"
                : p.age > 60
                  ? `Stale · ${Math.floor(p.age)}s since receipt`
                  : `Received ${Math.floor(p.age)}s ago`}
            </span>
          </div>
        )}
        <label className="refresh-cadence">
          <select
            aria-label="Refresh interval"
            value={p.refresh}
            onChange={(e) => p.setRefresh(+e.target.value)}
          >
            {[30, 60, 120].map((n) => (
              <option key={n} value={n}>
                {n}s refresh
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label="Refresh now"
          title="Refresh now · provider cooldowns still apply"
          onClick={p.refreshNow}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <div className="radar-status">
        <span>{p.snapshot?.attribution ?? "Loading local workspace"}</span>
        <span>
          {p.snapshot?.received_at
            ? new Date(p.snapshot.received_at).toISOString().slice(0, 10)
            : "—"}{" "}
          ·{" "}
          {p.mode === "live"
            ? "Community observations"
            : "Synthetic example epoch"}
        </span>
      </div>
    </section>
  );
}
