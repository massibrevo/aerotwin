import { saveJson } from "../features/analytics/export";
import { useEffect, useState } from "react";
import { useApi } from "../api";
import { Badge, Chart, Panel, State, Stat, num } from "../components/UI";
type Period = {
  start: string;
  end: string;
  rows: number;
  eligible: number;
  labelled: number;
  missing_labels: number;
  cancelled: number;
  diverted: number;
  cancel_rate: number | null;
  mean_delay: number | null;
  median_delay: number | null;
  p90_delay: number | null;
  delayed_15_rate: number | null;
};
type Comparison = {
  data_class: string;
  dataset_revision: string;
  coverage: string[];
  periods: { a: Period; b: Period };
  group_by: string;
  groups: {
    group: string;
    a: Period;
    b: Period;
    delta_mean: number | null;
    small_sample: boolean;
  }[];
  total_groups: number;
  daily: ({ date: string; period: string } & Period)[];
  distribution: { band: string; a: number; b: number }[];
  standardised_delta: number | null;
  standardised_groups: number;
  standardised_a_label_coverage: number;
  quality: {
    rows: number;
    duplicate_flight_ids: number;
    missing_delay_labels: number;
  };
  caveat: string;
};
export default function Analytics({ dataset }: { dataset: string }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("carrier");
  const [dates, setDates] = useState({
    a_start: "",
    a_end: "",
    b_start: "",
    b_end: "",
  });
  const [showSmall, setShowSmall] = useState(false);
  const r = useApi<Comparison>(
    `/analytics/comparison?dataset=${dataset}${query}`,
  );
  useEffect(() => {
    setQuery("");
  }, [dataset]);
  useEffect(() => {
    if (r.data) {
      const { a, b } = r.data.periods;
      setDates({
        a_start: a.start,
        a_end: a.end,
        b_start: b.start,
        b_end: b.end,
      });
      setGroup(r.data.group_by);
    }
  }, [r.data]);
  const data = r.data;
  const delta =
    data &&
    data.periods.a.mean_delay !== null &&
    data.periods.b.mean_delay !== null
      ? data.periods.b.mean_delay - data.periods.a.mean_delay
      : null;
  const rows = data?.groups.filter((g) => showSmall || !g.small_sample) ?? [];
  return (
    <>
      <Panel
        title="Compare schedule periods"
        aside={
          <Badge tone="amber">
            {dataset === "synthetic"
              ? "SYNTHETIC EXAMPLES"
              : "IMPORTED BTS · AUTHENTICITY UNVERIFIED"}
          </Badge>
        }
      >
        <p className="muted">
          Compare earlier period A with later period B. Default windows split
          the dataset's distinct schedule dates in half. These statistics
          describe schedule records, independently of the live radar.
        </p>
        <form
          className="comparison-form"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery("&" + new URLSearchParams({ ...dates, group }).toString());
          }}
        >
          {Object.entries(dates).map(([key, value]) => (
            <label key={key}>
              {
                {
                  a_start: "A · start",
                  a_end: "A · end",
                  b_start: "B · start",
                  b_end: "B · end",
                }[key]
              }
              <input
                aria-label={`Comparison ${key}`}
                required
                type="date"
                value={value}
                min={data?.coverage[0]}
                max={data?.coverage[1]}
                onChange={(e) => setDates({ ...dates, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Compare by
            <select
              aria-label="Comparison grouping"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="carrier">Carrier</option>
              <option value="origin">Origin airport</option>
              <option value="dest">Destination airport</option>
              <option value="route">Route</option>
            </select>
          </label>
          <button className="primary" disabled={!dates.a_start}>
            Compare periods
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              r.reload();
            }}
          >
            Reset periods
          </button>
        </form>
        <State error={r.error} loading={!data && !r.error} />
      </Panel>
      {data && (
        <div aria-label="Schedule analytics results">
          <div className="stats-row">
            <Stat
              label="MEAN DELAY CHANGE · B − A"
              value={num(delta, 2)}
              unit=" min"
              note="Labelled, noncancelled/nondiverted flights"
            />
            <Stat
              label="MIX-STANDARDISED CHANGE"
              value={num(data.standardised_delta, 2)}
              unit=" min"
              note={`${data.standardised_groups} shared groups · ${num(data.standardised_a_label_coverage * 100, 1)}% of A labels covered`}
            />
            <Stat
              label="ROWS IN COMPARISON"
              value={num(data.periods.a.rows + data.periods.b.rows)}
              note="A + B; not a live movement count"
            />
            <Stat
              label="DUPLICATE FLIGHT IDS · DATASET"
              value={num(data.quality.duplicate_flight_ids)}
              note={`${num(data.quality.missing_delay_labels)} missing delay labels across ${num(data.quality.rows)} records`}
            />
          </div>
          <Panel
            title="Period scorecard"
            aside={
              <button
                onClick={() =>
                  saveJson(data, `aerotwin-${dataset}-comparison.json`)
                }
              >
                Export analysis JSON
              </button>
            }
          >
            <div className="table-wrap">
              <table className="comparison-scorecard">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Rows / labels</th>
                    <th>Mean / median delay</th>
                    <th>P90 delay</th>
                    <th>≥15 min / labelled</th>
                    <th>Cancelled / all rows</th>
                    <th>Missing eligible labels</th>
                  </tr>
                </thead>
                <tbody>
                  {(["a", "b"] as const).map((key) => {
                    const p = data.periods[key];
                    return (
                      <tr key={key}>
                        <td>
                          <strong>{key.toUpperCase()}</strong>
                          <small>
                            {p.start} → {p.end}
                          </small>
                        </td>
                        <td>
                          {num(p.rows)} / {num(p.labelled)}
                        </td>
                        <td>
                          {num(p.mean_delay, 2)} / {num(p.median_delay, 2)} min
                        </td>
                        <td>{num(p.p90_delay, 2)} min</td>
                        <td>
                          {num(
                            p.delayed_15_rate == null
                              ? null
                              : p.delayed_15_rate * 100,
                            1,
                          )}
                          %
                        </td>
                        <td>
                          {num(
                            p.cancel_rate == null ? null : p.cancel_rate * 100,
                            1,
                          )}
                          % ({p.cancelled})
                        </td>
                        <td>{p.missing_labels}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              Negative delay means an early departure. P90 is a distribution
              percentile, not a confidence interval. Rates use the denominators
              shown; cancelled/diverted rows are excluded from delay statistics.
            </p>
          </Panel>
          <div className="two-col">
            <Panel title="Daily mean departure delay · minutes">
              <Chart data={data.daily} keys={["mean_delay"]} />
            </Panel>
            <Panel title="Departure delay distribution · flight counts">
              <Chart
                data={data.distribution}
                keys={["a", "b"]}
                type="bar"
                x="band"
              />
              <p className="small muted">
                A = earlier period · B = later period. Counts reflect different
                period sizes; the scorecard compares rates.
              </p>
            </Panel>
          </div>
          <Panel
            title={`Group comparison · ${data.group_by}`}
            aside={
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={showSmall}
                  onChange={(e) => setShowSmall(e.target.checked)}
                />
                Include small samples
              </label>
            }
          >
            <p className="small muted">
              Groups need ≥30 valid labels in both periods by default. Lower
              samples are flagged. Sorted by combined volume; showing up to 100
              of {data.total_groups} groups. Standardisation uses all qualifying
              groups, weighted by A's label counts.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>A labels</th>
                    <th>B labels</th>
                    <th>A mean / min</th>
                    <th>B mean / min</th>
                    <th>Change B − A / min</th>
                    <th>Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => (
                    <tr key={g.group}>
                      <td>{g.group}</td>
                      <td>{g.a.labelled}</td>
                      <td>{g.b.labelled}</td>
                      <td>{num(g.a.mean_delay, 2)}</td>
                      <td>{num(g.b.mean_delay, 2)}</td>
                      <td>{num(g.delta_mean, 2)}</td>
                      <td>
                        {g.small_sample
                          ? "Small / missing group"
                          : "≥30 per period"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p>
                  No groups meet the sample threshold. Enable small samples to
                  inspect available groups.
                </p>
              )}
            </div>
          </Panel>
          <div className="notice">{data.caveat}</div>
          <p className="small muted dataset-revision">
            Dataset revision: {data.dataset_revision}
          </p>
        </div>
      )}
    </>
  );
}
