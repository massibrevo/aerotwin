import { tx, useLocale } from "../i18n";
import { Link } from "react-router-dom";
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
  useLocale();
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
        title={tx("Compare schedule periods")}
        aside={
          <Badge tone="amber">
            {tx(
              dataset === "synthetic"
                ? "SYNTHETIC EXAMPLES"
                : "IMPORTED BTS · AUTHENTICITY UNVERIFIED",
            )}
          </Badge>
        }
      >
        <p>
          <Link to="/math">{tx("Math formulas and assumptions →")}</Link>
        </p>
        <p className="muted">
          {tx(
            "Compare earlier period A with later period B. Default windows split the dataset's distinct schedule dates in half. These statistics describe schedule records, independently of the live radar.",
          )}
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
              {tx(
                {
                  a_start: "A · start",
                  a_end: "A · end",
                  b_start: "B · start",
                  b_end: "B · end",
                }[key],
              )}
              <input
                aria-label={tx(`Comparison ${key}`)}
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
            {tx("Compare by")}
            <select
              aria-label={tx("Comparison grouping")}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="carrier">{tx("Carrier")}</option>
              <option value="origin">{tx("Origin airport")}</option>
              <option value="dest">{tx("Destination airport")}</option>
              <option value="route">{tx("Route")}</option>
            </select>
          </label>
          <button className="primary" disabled={!dates.a_start}>
            {tx("Compare periods")}
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              r.reload();
            }}
          >
            {tx("Reset periods")}
          </button>
        </form>
        <State error={r.error} loading={!data && !r.error} />
      </Panel>
      {data && (
        <div aria-label={tx("Schedule analytics results")}>
          <div className="stats-row">
            <Stat
              label={tx("MEAN DELAY CHANGE · B − A")}
              value={num(delta, 2)}
              unit=" min"
              note={tx("Labelled, noncancelled/nondiverted flights")}
            />
            <Stat
              label={tx("MIX-STANDARDISED CHANGE")}
              value={num(data.standardised_delta, 2)}
              unit=" min"
              note={tx(
                `${data.standardised_groups} shared groups · ${num(data.standardised_a_label_coverage * 100, 1)}% of A labels covered`,
              )}
            />
            <Stat
              label={tx("ROWS IN COMPARISON")}
              value={num(data.periods.a.rows + data.periods.b.rows)}
              note={tx("A + B; not a live movement count")}
            />
            <Stat
              label={tx("DUPLICATE FLIGHT IDS · DATASET")}
              value={num(data.quality.duplicate_flight_ids)}
              note={tx(
                `${num(data.quality.missing_delay_labels)} missing delay labels across ${num(data.quality.rows)} records`,
              )}
            />
          </div>
          <Panel
            title={tx("Period scorecard")}
            aside={
              <button
                onClick={() =>
                  saveJson(data, `aerotwin-${dataset}-comparison.json`)
                }
              >
                {tx("Export analysis JSON")}
              </button>
            }
          >
            <div className="table-wrap">
              <table className="comparison-scorecard">
                <thead>
                  <tr>
                    <th>{tx("Period")}</th>
                    <th>{tx("Rows / labels")}</th>
                    <th>{tx("Mean / median delay")}</th>
                    <th>{tx("P90 delay")}</th>
                    <th>{tx("≥15 min / labelled")}</th>
                    <th>{tx("Cancelled / all rows")}</th>
                    <th>{tx("Missing eligible labels")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(["a", "b"] as const).map((key) => {
                    const p = data.periods[key];
                    return (
                      <tr key={key}>
                        <td>
                          <strong>{tx(key.toUpperCase())}</strong>
                          <small>
                            {tx(p.start)} {tx(" → ")}
                            {tx(p.end)}
                          </small>
                        </td>
                        <td>
                          {tx(num(p.rows))} {tx(" / ")}
                          {tx(num(p.labelled))}
                        </td>
                        <td>
                          {tx(num(p.mean_delay, 2))} {tx(" / ")}
                          {tx(num(p.median_delay, 2))} {tx(" min")}
                        </td>
                        <td>
                          {tx(num(p.p90_delay, 2))} {tx(" min")}
                        </td>
                        <td>
                          {tx(
                            num(
                              p.delayed_15_rate == null
                                ? null
                                : p.delayed_15_rate * 100,
                              1,
                            ),
                          )}
                          {tx("%")}
                        </td>
                        <td>
                          {tx(
                            num(
                              p.cancel_rate == null
                                ? null
                                : p.cancel_rate * 100,
                              1,
                            ),
                          )}
                          {tx("% (")}
                          {tx(p.cancelled)}
                          {tx(")")}
                        </td>
                        <td>{tx(p.missing_labels)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="small muted">
              {tx(
                "Negative delay means an early departure. P90 is a distribution percentile, not a confidence interval. Rates use the denominators shown; cancelled/diverted rows are excluded from delay statistics.",
              )}
            </p>
          </Panel>
          <div className="two-col">
            <Panel title={tx("Daily mean departure delay · minutes")}>
              <Chart data={data.daily} keys={["mean_delay"]} />
            </Panel>
            <Panel title={tx("Departure delay distribution · flight counts")}>
              <Chart
                data={data.distribution}
                keys={["a", "b"]}
                type="bar"
                x="band"
              />
              <p className="small muted">
                {tx(
                  "A = earlier period · B = later period. Counts reflect different period sizes; the scorecard compares rates.",
                )}
              </p>
            </Panel>
          </div>
          <Panel
            title={tx(`Group comparison · ${data.group_by}`)}
            aside={
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={showSmall}
                  onChange={(e) => setShowSmall(e.target.checked)}
                />
                {tx("Include small samples")}
              </label>
            }
          >
            <p className="small muted">
              {tx(
                "Groups need ≥30 valid labels in both periods by default. Lower samples are flagged. Sorted by combined volume; showing up to 100 of ",
              )}
              {tx(data.total_groups)}{" "}
              {tx(
                " groups. Standardisation uses all qualifying groups, weighted by A's label counts.",
              )}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{tx("Group")}</th>
                    <th>{tx("A labels")}</th>
                    <th>{tx("B labels")}</th>
                    <th>{tx("A mean / min")}</th>
                    <th>{tx("B mean / min")}</th>
                    <th>{tx("Change B − A / min")}</th>
                    <th>{tx("Sample")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => (
                    <tr key={g.group}>
                      <td>{tx(g.group)}</td>
                      <td>{tx(g.a.labelled)}</td>
                      <td>{tx(g.b.labelled)}</td>
                      <td>{tx(num(g.a.mean_delay, 2))}</td>
                      <td>{tx(num(g.b.mean_delay, 2))}</td>
                      <td>{tx(num(g.delta_mean, 2))}</td>
                      <td>
                        {tx(
                          g.small_sample
                            ? "Small / missing group"
                            : "≥30 per period",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p>
                  {tx(
                    "No groups meet the sample threshold. Enable small samples to inspect available groups.",
                  )}
                </p>
              )}
            </div>
          </Panel>
          <div className="notice">{tx(data.caveat)}</div>
          <p className="small muted dataset-revision">
            {tx("Dataset revision: ")}
            {tx(data.dataset_revision)}
          </p>
        </div>
      )}
    </>
  );
}
