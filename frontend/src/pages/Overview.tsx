import { useUnits } from "../units";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import RadarMap from "../RadarMap";
import type { RadarProps, Summary } from "../types";
import { Badge, State, Stat, Panel, Chart, num } from "../components/UI";
export default function Overview(
  p: RadarProps & { summary?: Summary; error: string },
) {
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
          label="AIRCRAFT IN COVERAGE"
          value={p.snapshot?.aircraft.length ?? "—"}
          note={p.snapshot?.source ?? "Loading observations"}
        />
        <Stat
          label="AIRPORTS IN DATASET"
          value={p.summary?.airports ?? "—"}
          note={
            p.summary?.data_class === "synthetic"
              ? "Synthetic US domestic network"
              : "Imported schedule coverage"
          }
        />
        <Stat
          label="FLIGHT RECORDS"
          value={num(p.summary?.rows)}
          note={p.summary?.coverage.join(" → ")}
        />
        <Stat
          label="MEAN DEPARTURE DELAY"
          value={num(p.summary?.mean_delay, 1)}
          unit=" min"
          note={`${p.summary?.data_class ?? "Synthetic"} schedule data · not ADS-B`}
        />
      </div>
      <div className="overview-grid">
        <Panel
          title="Airspace monitor"
          aside={
            <Link className="text-link" to="/radar">
              Open radar <ArrowRight size={14} />
            </Link>
          }
          className="map-panel"
        >
          <div className="subheading">
            <span>
              {p.region.name} / {p.region.iata}{" "}
              <small>{u.format(p.radius, "distance")} RADIUS</small>
            </span>
            <Badge tone="amber">{p.snapshot?.source ?? "LOADING"}</Badge>
          </div>
          <RadarMap
            aircraft={p.snapshot?.aircraft ?? []}
            region={p.region}
            radius={p.radius}
            selected={p.selected?.icao24}
            onSelect={p.setSelected}
          />
          {p.snapshot?.error && (
            <div className="notice error">{p.snapshot.error}</div>
          )}
          {p.selected && (
            <div className="selection-strip">
              {p.selected.callsign} ·{" "}
              {p.selected.ground
                ? "Ground"
                : u.format(p.selected.altitude_ft, "altitude")}{" "}
              · {u.format(p.selected.ground_speed_kt, "speed")}{" "}
              <Link to="/radar">Inspect aircraft →</Link>
            </div>
          )}
        </Panel>
        <div className="right-stack">
          <Panel title="Observation profile" aside={<Activity size={16} />}>
            <div className="profile-total">
              {p.snapshot?.aircraft.length ?? 0}
              <span>aircraft in selected snapshot</span>
            </div>
            <div className="profile-row">
              <span>Above {u.format(30000, "altitude")}</span>
              <strong>{high}</strong>
            </div>
            <div className="meter">
              <i
                style={{
                  width: `${(100 * high) / Math.max(1, p.snapshot?.aircraft.length ?? 0)}%`,
                }}
              />
            </div>
            <div className="profile-row">
              <span>Below {u.format(10000, "altitude")}</span>
              <strong>{low}</strong>
            </div>
            <div className="meter amber-meter">
              <i
                style={{
                  width: `${(100 * low) / Math.max(1, p.snapshot?.aircraft.length ?? 0)}%`,
                }}
              />
            </div>
            <p className="muted small">
              Snapshot counts are coverage observations. They do not identify
              arrivals or departures.
            </p>
          </Panel>
          <Panel title="Data integrity" aside={<ShieldCheck size={16} />}>
            <div className="integrity-row">
              <span>Missing delay labels</span>
              <strong>{p.summary?.null_delay ?? "—"}</strong>
            </div>
            <div className="integrity-row">
              <span>Cancelled records</span>
              <strong>{p.summary?.cancelled ?? "—"}</strong>
            </div>
            <div className="integrity-row">
              <span>Data provenance</span>
              <Badge tone="amber">{p.summary?.data_class ?? "—"}</Badge>
            </div>
            <Link to="/data" className="text-link">
              Inspect source catalog <ArrowRight size={14} />
            </Link>
          </Panel>
        </div>
      </div>
      <div className="two-col">
        <Panel
          title="Departure delay through time"
          aside={
            <span className="tiny">
              {p.summary?.data_class.toUpperCase()} · DAILY MEAN / MIN
            </span>
          }
        >
          <Chart data={p.summary?.daily ?? []} />
        </Panel>
        <Panel
          title="Network route activity"
          aside={
            <Link to="/network" className="text-link">
              Explore network <ArrowRight size={14} />
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
                    {r.origin} <ArrowRight size={12} /> {r.dest}
                  </span>
                  <div className="route-bar">
                    <i
                      style={{
                        width: `${(r.flights / Math.max(...p.summary!.routes.map((x) => x.flights))) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{num(r.flights)}</strong>
                </div>
              ))}
          </div>
          <p className="small muted">
            Route frequencies in the loaded flight dataset. Aircraft callsigns
            do not determine these routes.
          </p>
        </Panel>
      </div>
    </>
  );
}
