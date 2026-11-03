import { useEffect, useState } from "react";
import { useApi } from "../api";
import { useUnits } from "../units";
import { Badge, Panel, State, Stat, num } from "../components/UI";
type AirportRef = {
  ident: string;
  icao_code: string | null;
  iata_code: string | null;
  name: string;
  municipality: string | null;
  iso_country: string;
  type: string;
  timezone: string | null;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number | null;
  runways: {
    le_ident: string;
    he_ident: string;
    length_ft: number | null;
    width_ft: number | null;
    surface: string | null;
    closed: boolean;
    lighted: boolean;
    le_heading_degT: number | null;
    he_heading_degT: number | null;
  }[];
};
type Meta = { built_at: string; coverage: string };
type Observation = {
  observed_at: string;
  raw: string;
  temperature_c: number | null;
  dewpoint_c: number | null;
  wind_direction: string | number | null;
  wind_speed_kt: number | null;
  wind_gust_kt: number | null;
  pressure_hpa: number | null;
  visibility_sm: number | null;
  visibility_lower_bound: boolean;
  flight_category: string | null;
};
function localClock(tick: number, zone: string | null) {
  try {
    return zone
      ? new Date(tick).toLocaleTimeString("en-GB", { timeZone: zone })
      : "Unknown";
  } catch {
    return "Zone unsupported";
  }
}
export default function Airports() {
  const u = useUnits();
  const [query, setQuery] = useState("BCN");
  const [search, setSearch] = useState("BCN");
  const [code, setCode] = useState("LEBL");
  const [tick, setTick] = useState(Date.now());
  const results = useApi<{
    airports: AirportRef[];
    matches: number;
    metadata: Meta;
  }>(`/airports/search?query=${encodeURIComponent(search)}`);
  const detail = useApi<{
    airport: AirportRef;
    metadata: Meta;
    caveat: string;
  }>(`/airports/${code}/reference`);
  const weather = useApi<{
    status: string;
    station: string | null;
    observation: Observation | null;
    reason?: string;
    retrieved_at?: string;
  }>(`/airports/${code}/weather`);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const a = detail.data?.airport;
  const o = weather.data?.observation;
  const age = o
    ? Math.max(0, (tick - Date.parse(o.observed_at)) / 60000)
    : null;
  return (
    <>
      <p className="muted">
        Airport references and reported weather are independent of the aircraft
        data mode. No synthetic weather is substituted.
      </p>
      <Panel
        title="Find an airport"
        aside={<Badge tone="cyan">OFFLINE REFERENCE</Badge>}
      >
        <form
          className="airport-search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
          }}
        >
          <input
            aria-label="Airport search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="IATA, ICAO, airport or city"
          />
          <button className="primary">Search airports</button>
        </form>
        <State error={results.error} />
        <p className="small muted">
          {results.data?.metadata.coverage}. Showing up to 50 of{" "}
          {results.data?.matches ?? "…"} matches.
        </p>
        <div className="airport-results">
          {results.data?.airports.map((row) => (
            <button
              aria-pressed={row.ident === code}
              key={row.ident}
              onClick={() => setCode(row.ident)}
            >
              <strong>{row.iata_code ?? row.ident}</strong>
              <span>
                {row.name}
                <small>
                  {row.municipality ?? ""} · {row.iso_country}
                </small>
              </span>
            </button>
          ))}
        </div>
      </Panel>
      <State error={detail.error} />
      {a && (
        <div aria-label="Airport reference details">
          <Panel
            title={`${a.iata_code ?? a.ident} · ${a.name}`}
            aside={<Badge tone="amber">REFERENCE SNAPSHOT</Badge>}
          >
            <p>
              {a.municipality ?? ""} · {a.iso_country} ·{" "}
              {a.icao_code ?? a.ident}
            </p>
            <div className="stats-row">
              <Stat
                label="LOCAL TIME"
                value={localClock(tick, a.timezone)}
                note={
                  a.timezone ?? "Timezone not supplied; UTC shown separately"
                }
              />
              <Stat
                label="UTC"
                value={new Date(tick).toISOString().slice(11, 19)}
                note={new Date(tick).toISOString().slice(0, 10)}
              />
              <Stat
                label="FIELD ELEVATION"
                value={u.number(a.elevation_ft, "altitude")}
                unit={` ${u.label("altitude")}`}
              />
              <Stat
                label="REFERENCE RUNWAYS"
                value={a.runways.length}
                note="Not current availability / active runway"
              />
            </div>
            <p className="small muted">
              Reference snapshot built{" "}
              {detail.data?.metadata.built_at.slice(0, 10)}. Local time uses the
              supplied IANA zone and timezone rules, including DST; database
              zone assignment is not independently verified.
            </p>
          </Panel>
          <div className="two-col">
            <Panel title="Runway reference">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ends</th>
                      <th>Length × width</th>
                      <th>Surface</th>
                      <th>Reference flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.runways.map((r, i) => (
                      <tr key={i}>
                        <td>
                          {r.le_ident ?? "—"} / {r.he_ident ?? "—"}
                          <small className="runway-heading">
                            True headings {num(r.le_heading_degT)}° /{" "}
                            {num(r.he_heading_degT)}°
                          </small>
                        </td>
                        <td>
                          {u.number(r.length_ft, "altitude")} ×{" "}
                          {u.format(r.width_ft, "altitude")}
                        </td>
                        <td>{r.surface ?? "Unknown"}</td>
                        <td>
                          {r.closed ? "Marked closed" : "Not marked closed"} ·{" "}
                          {r.lighted ? "Lights listed" : "Lights not listed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!a.runways.length && <p>No runway details supplied.</p>}
              </div>
              <p className="small muted">
                These flags come from a dated public reference. They do not
                establish current availability, runway in use or NOTAM status.
              </p>
            </Panel>
            <Panel
              title="Latest available METAR"
              aside={<button onClick={weather.reload}>Refresh weather</button>}
            >
              <State
                error={weather.error}
                loading={!weather.data && !weather.error}
              />
              {o ? (
                <div aria-label="Airport weather observation">
                  <Badge tone={age !== null && age > 120 ? "amber" : "cyan"}>
                    {age !== null && age > 120
                      ? "STALE OBSERVATION"
                      : "REPORTED OBSERVATION"}
                  </Badge>
                  <p>
                    <strong>{weather.data?.station}</strong> ·{" "}
                    {new Date(o.observed_at)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 19)}{" "}
                    UTC · {num(age)} minutes old
                  </p>
                  <dl className="weather-values">
                    <div>
                      <dt>Temperature / dewpoint</dt>
                      <dd>
                        {num(o.temperature_c, 1)} / {num(o.dewpoint_c, 1)} °C
                      </dd>
                    </div>
                    <div>
                      <dt>Wind · true direction</dt>
                      <dd>
                        {o.wind_direction ?? "—"}
                        {typeof o.wind_direction === "number" ? "°" : ""} ·{" "}
                        {u.format(o.wind_speed_kt, "speed")}
                        {o.wind_gust_kt !== null
                          ? ` gust ${u.format(o.wind_gust_kt, "speed")}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Pressure</dt>
                      <dd>{num(o.pressure_hpa, 1)} hPa</dd>
                    </div>
                    <div>
                      <dt>Visibility</dt>
                      <dd>
                        {o.visibility_lower_bound ? "≥" : ""}
                        {u.format(o.visibility_sm, "routeDistance", 1)}
                      </dd>
                    </div>
                    <div>
                      <dt>AWC reported category</dt>
                      <dd>{o.flight_category ?? "Not provided"}</dd>
                    </div>
                  </dl>
                  <pre className="metar-raw">
                    {o.raw || "Raw report not provided"}
                  </pre>
                </div>
              ) : (
                weather.data && (
                  <p>
                    {weather.data.reason ?? "No weather observation available"}.
                    No synthetic weather is substituted.
                  </p>
                )
              )}
              <p className="small muted">
                Source:{" "}
                <a
                  href="https://aviationweather.gov/data/api/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NOAA/NWS Aviation Weather Center ↗
                </a>
                . Observations can be old or absent; cached for 10 minutes. This
                display is not a forecast, briefing or decision aid. Weather
                does not enter the historical ML model.
              </p>
            </Panel>
          </div>
          <div className="notice">{detail.data?.caveat}</div>
          <p className="small muted">
            Airport/runway reference:{" "}
            <a
              href="https://ourairports.com/data/"
              target="_blank"
              rel="noreferrer"
            >
              OurAirports · public domain
            </a>
            . Contains timezone information from{" "}
            <a
              href="https://github.com/jpatokal/openflights/tree/master/data"
              target="_blank"
              rel="noreferrer"
            >
              OpenFlights.org contributors · ODbL
            </a>
            . Bundled source checksums and database licence are included with
            the app.
          </p>
        </div>
      )}
    </>
  );
}
