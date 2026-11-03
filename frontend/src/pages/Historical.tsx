import { tx, useLocale } from "../i18n";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowDownToLine } from "lucide-react";
import { useApi } from "../api";
import type { Mode, History, Summary, DatasetInfo } from "../types";
import { Badge, State, Panel, Chart, num } from "../components/UI";
export default function Historical({
  dataset,
  setMode,
}: {
  dataset: string;
  setMode: (m: Mode) => void;
}) {
  useLocale();
  const info = useApi<DatasetInfo>("/data/datasets/" + dataset);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(1);
  const q = new URLSearchParams({ dataset, search, origin });
  if (start) q.set("start", start);
  if (end) q.set("end", end);
  const r = useApi<History>(
    "/historical/flights?" + q + `&page=${page}&page_size=25`,
  );
  const s = useApi<Summary>("/historical/summary?dataset=" + dataset);
  useEffect(() => {
    if (info.data && origin && !info.data.origins.includes(origin))
      setOrigin("");
  }, [info.data, origin]);
  useEffect(() => setPage(1), [search, origin, start, end, dataset]);
  return (
    <>
      <div className="controls-bar">
        <div className="search">
          <Search size={15} />
          <input
            aria-label={tx("Search historical flights")}
            placeholder={tx("Flight ID, airline or destination")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label>
          {tx("Origin")}
          <select
            aria-label={tx("Historical origin")}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          >
            <option value="">{tx("All airports")}</option>
            {(info.data?.origins ?? []).map((a) => (
              <option key={a}>{tx(a)}</option>
            ))}
          </select>
        </label>
        <label>
          {tx("From")}
          <input
            aria-label={tx("From date")}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          {tx("To")}
          <input
            aria-label={tx("To date")}
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <a className="button" href={"/api/v1/historical/export?" + q}>
          <ArrowDownToLine size={14} />
          {tx("Export CSV (max 500)")}
        </a>
        <Link className="button" to="/radar" onClick={() => setMode("replay")}>
          {tx("Replay snapshots")}
        </Link>
      </div>
      <State error={r.error || s.error} loading={!r.data && !r.error} />
      <div className="two-col">
        <Panel title={tx("Daily departure delay / minutes")}>
          <Chart data={s.data?.daily ?? []} />
        </Panel>
        <Panel title={tx("Airline aggregates · full dataset")}>
          <Chart
            data={s.data?.airlines ?? []}
            type="bar"
            x="carrier"
            keys={["delay"]}
          />
        </Panel>
      </div>
      <Panel
        title={tx("Flight records")}
        aside={
          <Badge tone="amber">
            {tx(dataset === "synthetic" ? "SYNTHETIC DEMO" : "BTS IMPORT")}
          </Badge>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Flight ID",
                  "Date",
                  "Carrier",
                  "Route",
                  "Schedule UTC",
                  "Delay / min",
                  "Status",
                ].map((h) => (
                  <th key={h}>{tx(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.data?.rows.map((f) => (
                <tr key={f.flight_id}>
                  <td className="mono">{tx(f.flight_id)}</td>
                  <td>{tx(f.date)}</td>
                  <td>{tx(f.carrier)}</td>
                  <td>
                    {tx(f.origin)} {tx(" → ")}
                    {tx(f.dest)}
                  </td>
                  <td>
                    {tx(new Date(f.scheduled_utc).toISOString().slice(11, 16))}
                  </td>
                  <td className={(f.dep_delay ?? 0) >= 15 ? "amber-text" : ""}>
                    {tx(num(f.dep_delay, 1))}
                  </td>
                  <td>
                    {tx(
                      f.cancelled
                        ? "Cancelled"
                        : f.diverted
                          ? "Diverted"
                          : "Scheduled example / observed record",
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.data?.total === 0 && (
            <div className="notice">
              {tx("No flights match the selected filters.")}
            </div>
          )}
        </div>
        <div className="pagination">
          <span>
            {tx(num(r.data?.total))} {tx(" matching rows · Coverage")}
            {tx(" ")}
            {tx(r.data?.coverage.join(" → "))}
          </span>
          <div>
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              {tx("Previous")}
            </button>
            <span>
              {tx("Page ")}
              {tx(page)}
            </span>
            <button
              disabled={!r.data || page * 25 >= r.data.total}
              onClick={() => setPage(page + 1)}
            >
              {tx("Next")}
            </button>
          </div>
        </div>
      </Panel>
      <p className="small muted">
        {tx(
          "Charts summarize the full loaded dataset; date/search/origin filters apply to the flight table and CSV. Import real data with the documented CLI; synthetic records are never presented as BTS observations.",
        )}
      </p>
    </>
  );
}
