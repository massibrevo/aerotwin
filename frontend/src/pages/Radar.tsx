import { tx, useLocale } from "../i18n";
import RecordingControls from "../features/radar/RecordingControls";
import { useFavourites } from "../features/radar/favourites";
import LiveLookup from "../features/radar/LiveLookup";
import AircraftDetails from "../features/radar/AircraftDetails";
import { useUnits } from "../units";
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
  Star,
} from "lucide-react";
import AircraftPhoto from "../features/radar/AircraftPhoto";
import RadarMap from "../RadarMap";
import { presets } from "../presets";
import type { RadarProps, Mode } from "../types";
import { Badge, num } from "../components/UI";
import { useObservedTrail } from "../features/radar/useObservedTrail";

export default function Radar(p: RadarProps) {
  useLocale();
  const u = useUnits();
  const favourites = useFavourites();
  const [animateUpdates, setAnimateUpdates] = useState(false);
  const [rowLimit, setRowLimit] = useState(200);
  const [savedOnly, setSavedOnly] = useState(false);
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
          `${a.callsign ?? ""} ${a.icao24} ${a.registration ?? ""} ${a.aircraft_type ?? ""}`
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
  const context = `${p.mode}:${p.recordedSession?.id ?? ""}:${region.lat}:${region.lon}:${p.radius}`;
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
  const waiting = !p.snapshot && !p.radarError;
  const status =
    p.mode === "live"
      ? waiting
        ? "Connecting to ADS-B"
        : p.snapshot?.status === "live"
          ? p.age !== null && p.age > 60
            ? "Stale observations"
            : "Live observations"
          : "Feed unavailable"
      : p.mode === "recorded"
        ? "Recorded ADS-B · not LIVE"
        : p.mode === "replay"
          ? "Synthetic recording"
          : "Synthetic aircraft";
  const changeMode = (m: Mode) => {
    p.setFrame(0);
    p.setMode(m);
    setFollow(false);
  };
  return (
    <section
      className={`radar-workspace ${expanded ? "radar-expanded" : ""}`}
      aria-label={tx("Radar workspace")}
    >
      <h1 className="sr-only">{tx("Live radar")}</h1>
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
        animateUpdates={animateUpdates}
      />
      <RecordingControls {...p} />
      <div className="radar-top-controls">
        <div className="radar-location">
          <span className="location-icon">
            <MapPin size={19} />
          </span>
          <label>
            <span>{tx("EXPLORE AIRSPACE")}</span>
            <select
              aria-label={tx("Radar region")}
              value={p.region.iata}
              disabled={p.mode === "replay" || p.mode === "recorded"}
              onChange={(e) => {
                const r = presets.find((r) => r.iata === e.target.value);
                if (r) p.setRegion(r);
              }}
            >
              {presets.map((r) => (
                <option key={r.iata} value={r.iata}>
                  {tx(r.name)} {tx(" · ")}
                  {tx(r.iata)}
                </option>
              ))}
              {p.region.iata === "CUSTOM" && (
                <option value="CUSTOM">{tx("Custom region")}</option>
              )}
            </select>
          </label>
          <span className="location-radius">
            {tx(u.number(p.radius, "distance"))}
            <small>{tx(u.label("distance"))}</small>
          </span>
          <button
            disabled={p.mode === "recorded"}
            aria-label={tx("Custom region")}
            title={tx("Custom geography")}
            onClick={() => setCustom(!custom)}
          >
            <Settings2 size={17} />
          </button>
        </div>
        <div
          className="radar-mode-switch"
          aria-label={tx("Aircraft data mode")}
        >
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
                {tx(
                  m === "demo"
                    ? "Synthetic demo"
                    : m === "live"
                      ? "Live ADS-B"
                      : "Replay",
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="radar-view-tools">
          <button
            aria-label={tx("Toggle traffic panel")}
            title={tx("Show or hide aircraft panel")}
            aria-pressed={listOpen}
            onClick={() => setListOpen(!listOpen)}
          >
            <Plane size={18} />
            <span>{tx("Traffic")}</span>
            <b>{tx(rows.length)}</b>
          </button>
          <button
            aria-label={tx(expanded ? "Exit expanded radar" : "Expand radar")}
            title={tx(expanded ? "Exit expanded view" : "Expand map")}
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
                  `Street maps support latitude ±85°, longitude ±180°, radius ${u.number(1, "distance", 3)}–${u.format(250, "distance", 3)}.`,
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
              <h2>{tx("Choose your airspace")}</h2>
              <button
                type="button"
                aria-label={tx("Close geography")}
                onClick={() => setCustom(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="form-grid">
              <label>
                {tx("Latitude")}
                <input
                  aria-label={tx("Custom latitude")}
                  type="number"
                  step=".001"
                  value={lat}
                  onChange={(e) => setLat(+e.target.value)}
                />
              </label>
              <label>
                {tx("Longitude")}
                <input
                  aria-label={tx("Custom longitude")}
                  type="number"
                  step=".001"
                  value={lon}
                  onChange={(e) => setLon(+e.target.value)}
                />
              </label>
              <label>
                {tx("Radius / ")}
                {tx(u.label("distance"))}
                <input
                  aria-label={tx("Custom radius")}
                  type="number"
                  min={u.convert(1, "distance")}
                  max={u.convert(250, "distance")}
                  step="any"
                  value={+u.convert(customRadius, "distance").toFixed(6)}
                  onChange={(e) =>
                    setCustomRadius(u.fromDisplay(+e.target.value, "distance"))
                  }
                />
              </label>
            </div>
            <button className="primary wide" type="submit">
              {tx("Apply geography")}
            </button>
            {formError && <p role="alert">{tx(formError)}</p>}
          </motion.form>
        )}
      </AnimatePresence>
      <div className="radar-map-caption">
        <span
          className={`signal-dot ${p.mode === "live" ? "" : "demo-signal"}`}
        />
        {tx(status)}
        <span className="caption-separator" /> {tx(rows.length)} {tx(" shown")}
        {tx(" ")}
        <span className="muted">
          {tx("of ")}
          {tx(p.snapshot?.aircraft.length ?? 0)}
        </span>
      </div>
      <AnimatePresence>
        {listOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
            className={`radar-traffic-panel floating-panel ${picked ? "has-selection" : ""}`}
            aria-label={tx(
              picked ? "Aircraft inspector" : "Traffic in coverage",
            )}
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
                    {tx("All aircraft")}
                  </button>
                  <button
                    aria-label={tx("Close inspector")}
                    onClick={() => {
                      p.setSelected(undefined);
                      setFollow(false);
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="favourite-action">
                  <button
                    aria-pressed={favourites.has(
                      picked,
                      p.mode === "recorded" ? "live" : p.mode,
                    )}
                    aria-label={tx(
                      favourites.has(
                        picked,
                        p.mode === "recorded" ? "live" : p.mode,
                      )
                        ? "Remove aircraft from favourites"
                        : "Save aircraft to favourites",
                    )}
                    onClick={() =>
                      favourites.toggle(
                        picked,
                        p.mode === "recorded" ? "live" : p.mode,
                      )
                    }
                  >
                    <Star
                      size={16}
                      fill={
                        favourites.has(
                          picked,
                          p.mode === "recorded" ? "live" : p.mode,
                        )
                          ? "currentColor"
                          : "none"
                      }
                    />
                    {tx(
                      favourites.has(
                        picked,
                        p.mode === "recorded" ? "live" : p.mode,
                      )
                        ? "Saved aircraft"
                        : "Save aircraft",
                    )}
                  </button>
                </div>
                {favourites.error && <p role="alert">{tx(favourites.error)}</p>}
                <div className="flight-identity">
                  <div>
                    <span className="overline">
                      {tx("AIRCRAFT OBSERVATION")}
                    </span>
                    <h2>
                      {tx(picked.callsign ?? picked.icao24.toUpperCase())}
                    </h2>
                    <div className="flight-tags">
                      <span>{tx(picked.icao24.toUpperCase())}</span>
                      {picked.aircraft_type && (
                        <span>{tx(picked.aircraft_type)}</span>
                      )}
                      <Badge tone={p.mode === "live" ? "cyan" : "amber"}>
                        {tx(picked.provider)}
                      </Badge>
                    </div>
                  </div>
                  <span className="flight-icon">
                    <Plane size={27} />
                  </span>
                </div>
                <AircraftPhoto
                  key={`photo:${p.mode}:${picked.icao24}`}
                  aircraft={picked}
                  live={p.mode === "live"}
                />
                <div className="flight-metrics">
                  <div>
                    <span>{tx("ALTITUDE")}</span>
                    <strong>
                      {tx(
                        picked.ground
                          ? "Ground"
                          : u.number(picked.altitude_ft, "altitude"),
                      )}
                      <small>
                        {tx(picked.ground ? "" : u.label("altitude"))}
                      </small>
                    </strong>
                  </div>
                  <div>
                    <span>{tx("GROUND SPEED")}</span>
                    <strong>
                      {tx(u.number(picked.ground_speed_kt, "speed"))}
                      <small>{tx(u.label("speed"))}</small>
                    </strong>
                  </div>
                  <div>
                    <span>{tx("TRACK")}</span>
                    <strong>
                      {tx(num(picked.track_deg))}
                      <small>{tx("°")}</small>
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
                    )}
                    {tx(" ")}
                    {tx(
                      picked.vertical_rate_fpm == null
                        ? "Vertical rate unknown"
                        : (picked.vertical_rate_fpm ?? 0) > 300
                          ? "Climbing"
                          : (picked.vertical_rate_fpm ?? 0) < -300
                            ? "Descending"
                            : "Level / low vertical rate",
                    )}
                  </span>
                  <b>{tx(u.format(picked.vertical_rate_fpm, "vertical"))}</b>
                </div>
                <div className="flight-card-actions">
                  <button
                    className={follow ? "active" : ""}
                    aria-pressed={follow}
                    onClick={() => setFollow(!follow)}
                  >
                    <Crosshair size={16} />
                    {tx(follow ? "Following" : "Follow aircraft")}
                  </button>
                  <button
                    className={showTrail ? "active" : ""}
                    aria-pressed={showTrail}
                    onClick={() => setShowTrail(!showTrail)}
                  >
                    <Route size={16} />
                    {tx("Observed trail")}
                  </button>
                </div>
                <dl className="flight-details">
                  <div>
                    <dt>{tx("Position")}</dt>
                    <dd>
                      {tx(picked.lat.toFixed(4))}
                      {tx("°, ")}
                      {tx(picked.lon.toFixed(4))}
                      {tx("°")}
                    </dd>
                  </div>
                  <div>
                    <dt>{tx("Observed / UTC")}</dt>
                    <dd>
                      {tx(
                        new Date(picked.observed_at_utc)
                          .toISOString()
                          .slice(11, 19),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{tx("Position age at receipt")}</dt>
                    <dd>
                      {tx(num(picked.data_age_seconds, 1))} {tx(" s")}
                    </dd>
                  </div>
                  <div>
                    <dt>{tx("Trail in this session")}</dt>
                    <dd>
                      {tx(trail.length)} {tx(" observation")}
                      {tx(trail.length === 1 ? "" : "s")}
                    </dd>
                  </div>
                </dl>
                <AircraftDetails
                  key={`details:${p.mode}:${picked.icao24}`}
                  aircraft={picked}
                  live={p.mode === "live"}
                />
                <p className="flight-disclaimer">
                  <Info size={14} />
                  <span>
                    {tx(
                      "Positions only. No verified origin, destination or schedule. Trails connect this session’s observations.",
                    )}
                  </span>
                </p>
              </>
            ) : (
              <>
                <div className="traffic-heading">
                  <div>
                    <span className="overline">{tx("YOUR AIRSPACE")}</span>
                    <h2>
                      {tx("Air traffic ")}
                      <span>{tx(rows.length)}</span>
                    </h2>
                  </div>
                  <button
                    className={activeFilters || filters ? "active" : ""}
                    aria-label={tx("Aircraft filters")}
                    aria-expanded={filters}
                    onClick={() => setFilters(!filters)}
                  >
                    <SlidersHorizontal size={18} />
                    {activeFilters > 0 && <b>{tx(activeFilters)}</b>}
                  </button>
                </div>
                <div className="radar-search">
                  <Search size={18} />
                  <input
                    ref={searchRef}
                    aria-label={tx("Search aircraft")}
                    placeholder={tx("Callsign, registration or ICAO hex…")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search ? (
                    <button
                      aria-label={tx("Clear aircraft search")}
                      onClick={() => setSearch("")}
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <kbd>{tx("/")}</kbd>
                  )}
                </div>
                <div className="traffic-tabs">
                  <button
                    aria-pressed={!savedOnly}
                    onClick={() => setSavedOnly(false)}
                  >
                    {tx("In coverage")}
                  </button>
                  <button
                    aria-pressed={savedOnly}
                    onClick={() => setSavedOnly(true)}
                  >
                    {tx("Favourites (")}
                    {tx(favourites.favourites.length)}
                    {tx(")")}
                  </button>
                </div>
                {p.focusError && (
                  <p className="lookup-warning" role="alert">
                    {tx(p.focusError)}
                  </p>
                )}
                {p.mode === "live" && !savedOnly && (
                  <LiveLookup
                    query={search}
                    onLocate={(a) => {
                      resetFilters();
                      p.locateAircraft(a);
                    }}
                  />
                )}
                {savedOnly && (
                  <div
                    className="saved-aircraft"
                    aria-label={tx("Saved aircraft")}
                  >
                    {!favourites.favourites.length && (
                      <p>
                        {tx(
                          "Save aircraft from their observation card. Favourites stay on this browser; positions are not stored.",
                        )}
                      </p>
                    )}
                    {favourites.favourites
                      .filter((f) =>
                        `${f.label} ${f.icao24} ${f.registration ?? ""}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((f) => {
                        const observed =
                          f.mode === p.mode
                            ? p.snapshot?.aircraft.find(
                                (a) => a.icao24.toLowerCase() === f.icao24,
                              )
                            : undefined;
                        return (
                          <div key={`${f.mode}:${f.icao24}`}>
                            <strong>{tx(f.label)}</strong>
                            <small>
                              {tx(f.registration ?? f.icao24.toUpperCase())}{" "}
                              {tx(" ·")}
                              {tx(" ")}
                              {tx(f.mode.toUpperCase())} {tx(" ·")}
                              {tx(" ")}
                              {tx(
                                observed
                                  ? "In current snapshot"
                                  : "Not in current snapshot",
                              )}
                            </small>
                            {observed ? (
                              <button onClick={() => p.setSelected(observed)}>
                                {tx("Inspect saved aircraft")}
                              </button>
                            ) : f.mode === "live" && p.mode === "live" ? (
                              <button
                                onClick={() => {
                                  setSavedOnly(false);
                                  setSearch(f.icao24);
                                }}
                              >
                                {tx("Find live position")}
                              </button>
                            ) : (
                              <span className="muted">
                                {tx("Switch to ")}
                                {tx(f.mode)} {tx(" to inspect this favourite.")}
                              </span>
                            )}
                            <button
                              aria-label={tx(`Remove favourite ${f.label}`)}
                              onClick={() => favourites.remove(f)}
                            >
                              {tx("Remove")}
                            </button>
                          </div>
                        );
                      })}
                    {favourites.error && (
                      <p role="alert">{tx(favourites.error)}</p>
                    )}
                  </div>
                )}
                {filters && (
                  <div className="traffic-filters">
                    <div className="floating-heading">
                      <h3>{tx("Filter observations")}</h3>
                      <button onClick={resetFilters}>{tx("Reset")}</button>
                    </div>
                    {[
                      {
                        label: "Minimum altitude",
                        name: "Min altitude",
                        value: minAlt,
                        set: setMinAlt,
                        max: 45000,
                        step: 1000,
                        kind: "altitude" as const,
                      },
                      {
                        label: "Maximum altitude",
                        name: "Max altitude",
                        value: maxAlt,
                        set: setMaxAlt,
                        max: 45000,
                        step: 1000,
                        kind: "altitude" as const,
                      },
                      {
                        label: "Minimum speed",
                        name: "Min speed",
                        value: minSpeed,
                        set: setMinSpeed,
                        max: 600,
                        step: 20,
                        kind: "speed" as const,
                      },
                    ].map((c) => (
                      <label className="range-label" key={c.label}>
                        {tx(c.name)}
                        <strong>{tx(u.format(c.value, c.kind))}</strong>
                        <input
                          aria-label={tx(c.label)}
                          aria-valuetext={u.format(c.value, c.kind)}
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
                        {tx("Minimum altitude exceeds maximum.")}
                      </p>
                    )}
                  </div>
                )}
                {!savedOnly && (
                  <>
                    <div className="traffic-column-head">
                      <span>{tx("AIRCRAFT")}</span>
                      <span>{tx("ALTITUDE / SPEED")}</span>
                    </div>
                    <div className="aircraft-scroll">
                      {rows.slice(0, rowLimit).map((a) => (
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
                            <strong>
                              {tx(a.callsign ?? a.icao24.toUpperCase())}
                            </strong>
                            <small>
                              {tx(a.aircraft_type ?? a.icao24.toUpperCase())}
                              {tx(a.registration ? " · " + a.registration : "")}
                            </small>
                          </span>
                          <span>
                            <strong>
                              {tx(
                                a.ground
                                  ? "Ground"
                                  : u.number(a.altitude_ft, "altitude"),
                              )}
                              <small className="inline-unit">
                                {tx(a.ground ? "" : ` ${u.label("altitude")}`)}
                              </small>
                            </strong>
                            <small>
                              {tx(u.format(a.ground_speed_kt, "speed"))}
                              {tx(" ")}
                              <ChevronRight size={11} />
                            </small>
                          </span>
                        </button>
                      ))}
                      {rows.length > rowLimit && (
                        <button
                          className="wide"
                          onClick={() => setRowLimit((n) => n + 200)}
                        >
                          {tx("Show next 200 aircraft (")}
                          {tx(rows.length - rowLimit)}
                          {tx(" ")}
                          {tx("remaining)")}
                        </button>
                      )}
                      {!rows.length && (
                        <div className="traffic-empty">
                          <Search size={24} />
                          <h3>
                            {tx(
                              waiting
                                ? "Loading observations…"
                                : "No aircraft to display",
                            )}
                          </h3>
                          <p>
                            {tx(
                              p.snapshot?.status === "unavailable"
                                ? "The live provider is unavailable. Choose demo explicitly to explore offline."
                                : "Try a different search or widen your filters.",
                            )}
                          </p>
                          {activeFilters > 0 && (
                            <button onClick={resetFilters}>
                              {tx("Clear filters")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="traffic-footer">
                  <Eye size={14} />
                  <span>
                    {tx(
                      p.mode === "live"
                        ? "Observed in queried coverage"
                        : "Clearly labelled example positions",
                    )}
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
          {tx("Callsigns")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={coverage}
            onChange={(e) => setCoverage(e.target.checked)}
          />
          {tx("Coverage")}
        </label>
      </div>
      {(p.radarError || p.snapshot?.error) && (
        <div className="radar-alert" role="alert">
          <Info size={19} />
          <div>
            <strong>
              {tx(
                p.mode === "recorded"
                  ? "Recorded frame unavailable"
                  : "Live data is unavailable",
              )}
            </strong>
            <p>{tx(p.radarError || p.snapshot?.error)}</p>
          </div>
        </div>
      )}
      <div className="radar-motion">
        <label>
          <input
            type="checkbox"
            checked={animateUpdates}
            onChange={(e) => setAnimateUpdates(e.target.checked)}
          />
          {tx("Animate updates")}
        </label>
        <small>
          {tx(
            "Visual transition only · online, ≤250 aircraft · no extrapolation",
          )}
        </small>
      </div>
      <div className={`radar-playback ${p.mode === "live" ? "is-live" : ""}`}>
        <button
          className="playback-play"
          aria-label={tx(
            p.mode === "recorded"
              ? p.paused
                ? "Play recorded session"
                : "Pause recorded playback"
              : p.paused
                ? "Resume polling"
                : "Pause polling",
          )}
          title={tx(
            p.paused ? "Resume automatic refresh" : "Pause automatic refresh",
          )}
          onClick={() => p.setPaused(!p.paused)}
        >
          {p.paused ? <Play size={19} /> : <Pause size={19} />}
        </button>
        <div className="playback-time">
          <span>
            {tx(
              p.mode === "live"
                ? "OBSERVATION TIME"
                : p.mode === "recorded"
                  ? "RECORDED / NOT LIVE"
                  : "SYNTHETIC / FIXED EPOCH",
            )}
          </span>
          <strong>
            {tx(
              p.snapshot?.received_at
                ? new Date(p.snapshot.received_at).toISOString().slice(11, 19)
                : "Waiting for data",
            )}
            <small> {tx(" UTC")}</small>
          </strong>
        </div>
        {p.mode !== "live" ? (
          <>
            <label className="playback-timeline">
              <span>
                {tx("Frame ")}
                {tx(p.mode === "recorded" ? p.frame : p.frame % 20)} {tx(" /")}
                {tx(" ")}
                {tx(
                  p.mode === "recorded"
                    ? (p.recordedSession?.frames ?? 1) - 1
                    : 19,
                )}
              </span>
              <input
                aria-label={tx("Replay frame")}
                type="range"
                min="0"
                max={
                  p.mode === "recorded"
                    ? Math.max(0, (p.recordedSession?.frames ?? 1) - 1)
                    : 19
                }
                value={p.mode === "recorded" ? p.frame : p.frame % 20}
                onChange={(e) => p.setFrame(+e.target.value)}
              />
            </label>
            <button
              className="next-frame"
              aria-label={tx("Next frame")}
              title={tx("Next observation")}
              onClick={() =>
                p.setFrame(
                  p.mode === "recorded"
                    ? Math.min(
                        p.frame + 1,
                        (p.recordedSession?.frames ?? 1) - 1,
                      )
                    : (p.frame + 1) % 20,
                )
              }
            >
              <ChevronRight size={19} />
            </button>
          </>
        ) : (
          <div className="playback-live">
            <span className="signal-dot" />
            <span>
              {tx(
                p.age == null
                  ? "No current snapshot"
                  : p.age > 60
                    ? `Stale · ${Math.floor(p.age)}s since receipt`
                    : `Received ${Math.floor(p.age)}s ago`,
              )}
            </span>
          </div>
        )}
        {p.mode === "recorded" && (
          <label className="refresh-cadence">
            <select
              aria-label={tx("Recorded playback speed")}
              value={p.replayMs}
              onChange={(e) => p.setReplayMs(+e.target.value)}
            >
              <option value={2000}>{tx("0.5 frames/s")}</option>
              <option value={1000}>{tx("1 frame/s")}</option>
              <option value={500}>{tx("2 frames/s")}</option>
            </select>
          </label>
        )}
        <label className="refresh-cadence" hidden={p.mode === "recorded"}>
          <select
            aria-label={tx("Refresh interval")}
            value={p.refresh}
            onChange={(e) => p.setRefresh(+e.target.value)}
          >
            {[30, 60, 120].map((n) => (
              <option key={n} value={n}>
                {tx(n)}
                {tx("s refresh")}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label={tx("Refresh now")}
          title={tx("Refresh now · provider cooldowns still apply")}
          onClick={p.refreshNow}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <div className="radar-status">
        <span>{tx(p.snapshot?.attribution ?? "Loading local workspace")}</span>
        <span>
          {tx(
            p.snapshot?.received_at
              ? new Date(p.snapshot.received_at).toISOString().slice(0, 10)
              : "—",
          )}
          {tx(" ")}
          {tx("·")}
          {tx(" ")}
          {tx(
            p.mode === "live"
              ? "Community observations"
              : "Synthetic example epoch",
          )}
        </span>
      </div>
    </section>
  );
}
