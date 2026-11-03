import { tx, useLocale } from "../i18n";
import { useUnits } from "../units";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import RadarMap from "../RadarMap";
import type { RadarProps, Summary } from "../types";
import { Badge, State, Stat, Panel, Chart, num } from "../components/UI";
export default function Overview(
  p: RadarProps & { summary?: Summary; error: string },
) {
  useLocale();
  const u = useUnits();
  const high =
    p.snapshot?.aircraft.filter((a) => (a.altitude_ft ?? 0) > 30000).length ??
    0;
  const low =
    p.snapshot?.aircraft.filter((a) => (a.altitude_ft ?? 99999) < 10000)
      .length ?? 0;
  return (
    <>
      <State error={p.error || p.radarError} />
      <div className="stats-row">
        <Stat
          label={tx("AIRCRAFT IN COVERAGE")}
          value={p.snapshot?.aircraft.length ?? "—"}
          note={tx(p.snapshot?.source ?? "Loading observations")}
        />
        <Stat
          label={tx("AIRPORTS IN DATASET")}
          value={p.summary?.airports ?? "—"}
          note={tx(
            p.summary?.data_class === "synthetic"
              ? "Synthetic US domestic network"
              : "Imported schedule coverage",
          )}
        />
        <Stat
          label={tx("FLIGHT RECORDS")}
          value={num(p.summary?.rows)}
          note={tx(p.summary?.coverage.join(" → "))}
        />
        <Stat
          label={tx("MEAN DEPARTURE DELAY")}
          value={num(p.summary?.mean_delay, 1)}
          unit=" min"
          note={tx(
            `${p.summary?.data_class ?? "Synthetic"} schedule data · not ADS-B`,
          )}
        />
      </div>
      <div className="overview-grid">
        <Panel
          title={tx("Airspace monitor")}
          aside={
            <Link className="text-link" to="/radar">
              {tx("Open radar ")}
              <ArrowRight size={14} />
            </Link>
          }
          className="map-panel"
        >
          <div className="subheading">
            <span>
              {tx(p.region.name)} {tx(" / ")}
              {tx(p.region.iata)}
              {tx(" ")}
              <small>
                {tx(u.format(p.radius, "distance"))} {tx(" RADIUS")}
              </small>
            </span>
            <Badge tone="amber">{tx(p.snapshot?.source ?? "LOADING")}</Badge>
          </div>
          <RadarMap
            aircraft={p.snapshot?.aircraft ?? []}
            region={p.region}
            radius={p.radius}
            selected={p.selected?.icao24}
            onSelect={p.setSelected}
          />
          {p.snapshot?.error && (
            <div className="notice error">{tx(p.snapshot.error)}</div>
          )}
          {p.selected && (
            <div className="selection-strip">
              {tx(p.selected.callsign)} {tx(" ·")}
              {tx(" ")}
              {tx(
                p.selected.ground
                  ? "Ground"
                  : u.format(p.selected.altitude_ft, "altitude"),
              )}
              {tx(" ")}
              {tx("· ")}
              {tx(u.format(p.selected.ground_speed_kt, "speed"))}
              {tx(" ")}
              <Link to="/radar">{tx("Inspect aircraft →")}</Link>
            </div>
          )}
        </Panel>
        <div className="right-stack">
          <Panel
            title={tx("Observation profile")}
            aside={<Activity size={16} />}
          >
            <div className="profile-total">
              {tx(p.snapshot?.aircraft.length ?? 0)}
              <span>{tx("aircraft in selected snapshot")}</span>
            </div>
            <div className="profile-row">
              <span>
                {tx("Above ")}
                {tx(u.format(30000, "altitude"))}
              </span>
              <strong>{tx(high)}</strong>
            </div>
            <div className="meter">
              <i
                style={{
                  width: `${(100 * high) / Math.max(1, p.snapshot?.aircraft.length ?? 0)}%`,
                }}
              />
            </div>
            <div className="profile-row">
              <span>
                {tx("Below ")}
                {tx(u.format(10000, "altitude"))}
              </span>
              <strong>{tx(low)}</strong>
            </div>
            <div className="meter amber-meter">
              <i
                style={{
                  width: `${(100 * low) / Math.max(1, p.snapshot?.aircraft.length ?? 0)}%`,
                }}
              />
            </div>
            <p className="muted small">
              {tx(
                "Snapshot counts are coverage observations. They do not identify arrivals or departures.",
              )}
            </p>
          </Panel>
          <Panel title={tx("Data integrity")} aside={<ShieldCheck size={16} />}>
            <div className="integrity-row">
              <span>{tx("Missing delay labels")}</span>
              <strong>{tx(p.summary?.null_delay ?? "—")}</strong>
            </div>
            <div className="integrity-row">
              <span>{tx("Cancelled records")}</span>
              <strong>{tx(p.summary?.cancelled ?? "—")}</strong>
            </div>
            <div className="integrity-row">
              <span>{tx("Data provenance")}</span>
              <Badge tone="amber">{tx(p.summary?.data_class ?? "—")}</Badge>
            </div>
            <Link to="/data" className="text-link">
              {tx("Inspect source catalog ")}
              <ArrowRight size={14} />
            </Link>
          </Panel>
        </div>
      </div>
      <div className="two-col">
        <Panel
          title={tx("Departure delay through time")}
          aside={
            <span className="tiny">
              {tx(p.summary?.data_class.toUpperCase())}{" "}
              {tx(" · DAILY MEAN / MIN")}
            </span>
          }
        >
          <Chart data={p.summary?.daily ?? []} />
        </Panel>
        <Panel
          title={tx("Network route activity")}
          aside={
            <Link to="/network" className="text-link">
              {tx("Explore network ")}
              <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="route-list">
            {p.summary?.routes
              .slice()
              .sort((a, b) => b.flights - a.flights)
              .slice(0, 5)
              .map((r) => (
                <div key={r.origin + r.dest}>
                  <span className="route-code">
                    {tx(r.origin)} <ArrowRight size={12} /> {tx(r.dest)}
                  </span>
                  <div className="route-bar">
                    <i
                      style={{
                        width: `${(r.flights / Math.max(...p.summary!.routes.map((x) => x.flights))) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{tx(num(r.flights))}</strong>
                </div>
              ))}
          </div>
          <p className="small muted">
            {tx(
              "Route frequencies in the loaded flight dataset. Aircraft callsigns do not determine these routes.",
            )}
          </p>
        </Panel>
      </div>
    </>
  );
}
