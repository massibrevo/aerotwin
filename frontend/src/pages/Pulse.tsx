import { useState } from "react";
import { useApi } from "../api";
import type { RadarProps } from "../types";
import { Badge, State, Stat, Panel, Chart, num } from "../components/UI";
export default function Pulse(p: RadarProps & { dataset: string }) {
  const [iata, setIata] = useState("ATL");
  const r = useApi<{
    schedule_departures: number;
    hourly: { hour: number; flights: number }[];
    caveat: string;
  }>(`/airports/${iata}/pulse?dataset=${p.dataset}`);
  const ac = p.snapshot?.aircraft ?? [];
  const bins = [0, 10000, 20000, 30000, 40000].map((n) => ({
    band: `${n / 1000}–${n / 1000 + 10}k`,
    aircraft: ac.filter(
      (a) =>
        a.altitude_ft !== null &&
        a.altitude_ft >= n &&
        a.altitude_ft < n + 10000,
    ).length,
  }));
  return (
    <>
      <div className="controls-bar">
        <label>
          Schedule airport
          <select
            aria-label="Pulse airport"
            value={iata}
            onChange={(e) => setIata(e.target.value)}
          >
            {["ATL", "JFK", "ORD", "LAX", "DFW"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <Badge tone="amber">{p.dataset.toUpperCase()} SCHEDULES</Badge>
      </div>
      <State error={r.error} />
      <div className="stats-row">
        <Stat
          label="SCHEDULE ROWS / COVERAGE"
          value={num(r.data?.schedule_departures)}
        />
        <Stat
          label={`SNAPSHOT / ${p.region.iata}`}
          value={ac.length}
          note={p.snapshot?.source}
        />
        <Stat
          label="CLIMBING POSITIONS"
          value={ac.filter((a) => (a.vertical_rate_fpm ?? 0) > 300).length}
          note="Proxy: vertical rate >300 ft/min"
        />
        <Stat
          label="DESCENDING POSITIONS"
          value={ac.filter((a) => (a.vertical_rate_fpm ?? 0) < -300).length}
          note="Proxy: vertical rate <−300 ft/min"
        />
      </div>
      <div className="two-col">
        <Panel title="Scheduled departures by local hour">
          <Chart
            data={r.data?.hourly ?? []}
            keys={["flights"]}
            type="bar"
            x="hour"
          />
        </Panel>
        <Panel title="Observed altitude distribution">
          <Chart data={bins} keys={["aircraft"]} type="bar" x="band" />
        </Panel>
      </div>
      <div className="notice">
        {r.data?.caveat}. Climb/descent proxies refer to the selected radar
        geography, may include overflights, and are not official airport
        movements.
      </div>
    </>
  );
}
