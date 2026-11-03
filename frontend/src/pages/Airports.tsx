import { tx, useLocale, numberLocale } from "../i18n";
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
      ? new Date(tick).toLocaleTimeString(numberLocale(), {
          timeZone: zone,
          hour12: false,
        })
      : "Unknown";
  } catch {
    return "Zone unsupported";
  }
}
export default function Airports() {
  useLocale();
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
        {tx(
          "Airport references and reported weather are independent of the aircraft data mode. No synthetic weather is substituted.",
        )}
      </p>
      <Panel
        title={tx("Find an airport")}
        aside={<Badge tone="cyan">{tx("OFFLINE REFERENCE")}</Badge>}
      >
        <form
          className="airport-search-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
          }}
        >
          <input
            aria-label={tx("Airport search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder={tx("IATA, ICAO, airport or city")}
          />
          <button className="primary">{tx("Search airports")}</button>
        </form>
        <State error={results.error} />
        <p className="small muted">
          {tx(results.data?.metadata.coverage)}
          {tx(". Showing up to 50 of")}
          {tx(" ")}
          {tx(results.data?.matches ?? "…")} {tx(" matches.")}
        </p>
        <div className="airport-results">
          {results.data?.airports.map((row) => (
            <button
              aria-pressed={row.ident === code}
              key={row.ident}
              onClick={() => setCode(row.ident)}
            >
              <strong>{tx(row.iata_code ?? row.ident)}</strong>
              <span>
                {tx(row.name)}
                <small>
                  {tx(row.municipality ?? "")} {tx(" · ")}
                  {tx(row.iso_country)}
                </small>
              </span>
            </button>
          ))}
        </div>
      </Panel>
      <State error={detail.error} />
      {a && (
        <div aria-label={tx("Airport reference details")}>
          <Panel
            title={tx(`${a.iata_code ?? a.ident} · ${a.name}`)}
            aside={<Badge tone="amber">{tx("REFERENCE SNAPSHOT")}</Badge>}
          >
            <p>
              {tx(a.municipality ?? "")} {tx(" · ")}
              {tx(a.iso_country)} {tx(" ·")}
              {tx(" ")}
              {tx(a.icao_code ?? a.ident)}
            </p>
            <div className="stats-row">
              <Stat
                label={tx("LOCAL TIME")}
                value={localClock(tick, a.timezone)}
                note={tx(
                  a.timezone ?? "Timezone not supplied; UTC shown separately",
                )}
              />
              <Stat
                label={tx("UTC")}
                value={new Date(tick).toISOString().slice(11, 19)}
                note={tx(new Date(tick).toISOString().slice(0, 10))}
              />
              <Stat
                label={tx("FIELD ELEVATION")}
                value={u.number(a.elevation_ft, "altitude")}
                unit={` ${u.label("altitude")}`}
              />
              <Stat
                label={tx("REFERENCE RUNWAYS")}
                value={a.runways.length}
                note={tx("Not current availability / active runway")}
              />
            </div>
            <p className="small muted">
              {tx("Reference snapshot built")}
              {tx(" ")}
              {tx(detail.data?.metadata.built_at.slice(0, 10))}
              {tx(
                ". Local time uses the supplied IANA zone and timezone rules, including DST; database zone assignment is not independently verified.",
              )}
            </p>
          </Panel>
          <div className="two-col">
            <Panel title={tx("Runway reference")}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{tx("Ends")}</th>
                      <th>{tx("Length × width")}</th>
                      <th>{tx("Surface")}</th>
                      <th>{tx("Reference flags")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.runways.map((r, i) => (
                      <tr key={i}>
                        <td>
                          {tx(r.le_ident ?? "—")} {tx(" / ")}
                          {tx(r.he_ident ?? "—")}
                          <small className="runway-heading">
                            {tx("True headings ")}
                            {tx(num(r.le_heading_degT))}
                            {tx("° /")}
                            {tx(" ")}
                            {tx(num(r.he_heading_degT))}
                            {tx("°")}
                          </small>
                        </td>
                        <td>
                          {tx(u.number(r.length_ft, "altitude"))} {tx(" ×")}
                          {tx(" ")}
                          {tx(u.format(r.width_ft, "altitude"))}
                        </td>
                        <td>{tx(r.surface ?? "Unknown")}</td>
                        <td>
                          {tx(r.closed ? "Marked closed" : "Not marked closed")}{" "}
                          {tx(" ·")}
                          {tx(" ")}
                          {tx(
                            r.lighted ? "Lights listed" : "Lights not listed",
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!a.runways.length && (
                  <p>{tx("No runway details supplied.")}</p>
                )}
              </div>
              <p className="small muted">
                {tx(
                  "These flags come from a dated public reference. They do not establish current availability, runway in use or NOTAM status.",
                )}
              </p>
            </Panel>
            <Panel
              title={tx("Latest available METAR")}
              aside={
                <button onClick={weather.reload}>
                  {tx("Refresh weather")}
                </button>
              }
            >
              <State
                error={weather.error}
                loading={!weather.data && !weather.error}
              />
              {o ? (
                <div aria-label={tx("Airport weather observation")}>
                  <Badge tone={age !== null && age > 120 ? "amber" : "cyan"}>
                    {tx(
                      age !== null && age > 120
                        ? "STALE OBSERVATION"
                        : "REPORTED OBSERVATION",
                    )}
                  </Badge>
                  <p>
                    <strong>{tx(weather.data?.station)}</strong> {tx(" ·")}
                    {tx(" ")}
                    {tx(
                      new Date(o.observed_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                    )}
                    {tx(" ")}
                    {tx("UTC · ")}
                    {tx(num(age))} {tx(" minutes old")}
                  </p>
                  <dl className="weather-values">
                    <div>
                      <dt>{tx("Temperature / dewpoint")}</dt>
                      <dd>
                        {tx(num(o.temperature_c, 1))} {tx(" / ")}
                        {tx(num(o.dewpoint_c, 1))} {tx(" °C")}
                      </dd>
                    </div>
                    <div>
                      <dt>{tx("Wind · true direction")}</dt>
                      <dd>
                        {tx(o.wind_direction ?? "—")}
                        {tx(
                          typeof o.wind_direction === "number" ? "°" : "",
                        )}{" "}
                        {tx(" ·")}
                        {tx(" ")}
                        {tx(u.format(o.wind_speed_kt, "speed"))}
                        {tx(
                          o.wind_gust_kt !== null
                            ? ` gust ${u.format(o.wind_gust_kt, "speed")}`
                            : "",
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{tx("Pressure")}</dt>
                      <dd>
                        {tx(num(o.pressure_hpa, 1))} {tx(" hPa")}
                      </dd>
                    </div>
                    <div>
                      <dt>{tx("Visibility")}</dt>
                      <dd>
                        {tx(o.visibility_lower_bound ? "≥" : "")}
                        {tx(u.format(o.visibility_sm, "routeDistance", 1))}
                      </dd>
                    </div>
                    <div>
                      <dt>{tx("AWC reported category")}</dt>
                      <dd>{tx(o.flight_category ?? "Not provided")}</dd>
                    </div>
                  </dl>
                  <pre className="metar-raw">
                    {tx(o.raw || "Raw report not provided")}
                  </pre>
                </div>
              ) : (
                weather.data && (
                  <p>
                    {tx(
                      weather.data.reason ?? "No weather observation available",
                    )}
                    {tx(". No synthetic weather is substituted.")}
                  </p>
                )
              )}
              <p className="small muted">
                {tx("Source:")}
                {tx(" ")}
                <a
                  href="https://aviationweather.gov/data/api/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {tx("NOAA/NWS Aviation Weather Center ↗")}
                </a>
                {tx(
                  ". Observations can be old or absent; cached for 10 minutes. This display is not a forecast, briefing or decision aid. Weather does not enter the historical ML model.",
                )}
              </p>
            </Panel>
          </div>
          <div className="notice">{tx(detail.data?.caveat)}</div>
          <p className="small muted">
            {tx("Airport/runway reference:")}
            {tx(" ")}
            <a
              href="https://ourairports.com/data/"
              target="_blank"
              rel="noreferrer"
            >
              {tx("OurAirports · public domain")}
            </a>
            {tx(". Contains timezone information from")}
            {tx(" ")}
            <a
              href="https://github.com/jpatokal/openflights/tree/master/data"
              target="_blank"
              rel="noreferrer"
            >
              {tx("OpenFlights.org contributors · ODbL")}
            </a>
            {tx(
              ". Bundled source checksums and database licence are included with the app.",
            )}
          </p>
        </div>
      )}
    </>
  );
}
