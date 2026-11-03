import { tx, useLocale } from "../i18n";
import { useUnits } from "../units";
import { useEffect, useState } from "react";
import { useApi } from "../api";
import type { RadarProps, DatasetInfo } from "../types";
import { Badge, State, Stat, Panel, Chart, num } from "../components/UI";
export default function Pulse(p: RadarProps & { dataset: string }) {
  useLocale();
  const u = useUnits();
  const info = useApi<DatasetInfo>("/data/datasets/" + p.dataset);
  const [iata, setIata] = useState("ATL");
  useEffect(() => {
    if (info.data && !info.data.origins.includes(iata))
      setIata(info.data.origins[0]);
  }, [info.data, iata]);
  const r = useApi<{
    schedule_departures: number;
    hourly: { hour: number; flights: number }[];
    caveat: string;
  }>(`/airports/${iata}/pulse?dataset=${p.dataset}`);
  const ac = p.snapshot?.aircraft ?? [];
  const bins = [0, 10000, 20000, 30000, 40000].map((n) => ({
    band: `${u.number(n, "altitude")}–${u.format(n + 10000, "altitude")}`,
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
          {tx("Schedule airport")}
          <select
            aria-label={tx("Pulse airport")}
            value={iata}
            onChange={(e) => setIata(e.target.value)}
          >
            {(info.data?.origins ?? []).map((a) => (
              <option key={a}>{tx(a)}</option>
            ))}
          </select>
        </label>
        <Badge tone="amber">
          {tx(p.dataset.toUpperCase())} {tx(" SCHEDULES")}
        </Badge>
      </div>
      <State error={r.error} />
      <div className="stats-row">
        <Stat
          label={tx("SCHEDULE ROWS / COVERAGE")}
          value={num(r.data?.schedule_departures)}
        />
        <Stat
          label={tx(`SNAPSHOT / ${p.region.iata}`)}
          value={ac.length}
          note={tx(p.snapshot?.source)}
        />
        <Stat
          label={tx("CLIMBING POSITIONS")}
          value={ac.filter((a) => (a.vertical_rate_fpm ?? 0) > 300).length}
          note={tx(`Proxy: vertical rate >${u.format(300, "vertical")}`)}
        />
        <Stat
          label={tx("DESCENDING POSITIONS")}
          value={ac.filter((a) => (a.vertical_rate_fpm ?? 0) < -300).length}
          note={tx(`Proxy: vertical rate <${u.format(-300, "vertical")}`)}
        />
      </div>
      <div className="two-col">
        <Panel title={tx("Scheduled departures by local hour")}>
          <Chart
            data={r.data?.hourly ?? []}
            keys={["flights"]}
            type="bar"
            x="hour"
          />
        </Panel>
        <Panel title={tx("Observed altitude distribution")}>
          <Chart data={bins} keys={["aircraft"]} type="bar" x="band" />
        </Panel>
      </div>
      <div className="notice">
        {tx(r.data?.caveat)}
        {tx(
          ". Climb/descent proxies refer to the selected radar geography, may include overflights, and are not official airport movements.",
        )}
      </div>
    </>
  );
}
