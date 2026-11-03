import { tx, useLocale } from "../../i18n";
import { useUnits } from "../../units";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Panel, Stat, Chart, num } from "../../components/UI";
export type Diagnostics = {
  test_n: number;
  bias_minutes: number;
  median_absolute_error: number;
  p90_absolute_error: number;
  coverage_wilson_95: number[] | null;
  coverage_caveat: string;
  baseline_mae_improvement_minutes: number;
  baseline_improvement_block_bootstrap_95: number[] | null;
  bootstrap_blocks: number;
  bootstrap_repetitions: number;
  bootstrap_caveat: string;
  residual_histogram: { band: string; flights: number }[];
  daily_errors: {
    date: string;
    n: number;
    mae: number;
    baseline_mae: number;
    bias: number;
  }[];
  categorical_shift: {
    feature: string;
    total_variation: number;
    unseen_test_rows: number;
  }[];
  numeric_support: {
    feature: string;
    train_min: number;
    train_max: number;
    test_outside_range: number;
  }[];
  subgroups: {
    dimension: string;
    group: string;
    n: number;
    mae: number;
    bias: number;
    coverage: number;
    small_sample: boolean;
  }[];
};
export default function ModelDiagnostics({
  data,
  label,
}: {
  data?: Diagnostics;
  label: string;
}) {
  useLocale();
  const u = useUnits();
  const [small, setSmall] = useState(false);
  if (!data)
    return (
      <Panel title={tx("Extended model diagnostics")}>
        <p>
          {tx("This model predates the extended evaluation.")}
          {tx(" ")}
          <Link to="/data">{tx("Train the selected dataset")}</Link>{" "}
          {tx(
            " to compute residuals, subgroup coverage, support shift and paired baseline uncertainty. Existing predictions remain available.",
          )}
        </p>
      </Panel>
    );
  const ci = data.baseline_improvement_block_bootstrap_95;
  return (
    <div aria-label={tx("Extended model diagnostics")}>
      <div className="diagnostic-source">
        <Badge tone="amber">{tx(label)}</Badge>
        <span>{tx("T−120 min · chronological final holdout")}</span>
      </div>
      <div className="stats-row">
        <Stat
          label={tx("TEST RESIDUAL BIAS")}
          value={num(data.bias_minutes, 2)}
          unit=" min"
          note={tx("Predicted − actual; positive = overprediction")}
        />
        <Stat
          label={tx("P90 ABSOLUTE ERROR")}
          value={num(data.p90_absolute_error, 2)}
          unit=" min"
          note={tx(
            `Median absolute error ${num(data.median_absolute_error, 2)} min`,
          )}
        />
        <Stat
          label={tx("MAE IMPROVEMENT VS MEDIAN")}
          value={num(data.baseline_mae_improvement_minutes, 2)}
          unit=" min"
          note={tx("Positive = lower error than the baseline")}
        />
        <Stat
          label={tx("EVALUATED TEST FLIGHTS")}
          value={num(data.test_n)}
          note={tx(`${data.bootstrap_blocks} schedule-date blocks`)}
        />
      </div>
      <Panel title={tx("Evidence against the baseline")}>
        <p>
          {tx("95% paired daily-block bootstrap interval for MAE improvement:")}
          {tx(" ")}
          <strong>
            {tx(
              ci
                ? `${num(ci[0], 2)} to ${num(ci[1], 2)} min`
                : "Unavailable: fewer than five test dates",
            )}
          </strong>
          {tx(".")}
        </p>
        <p>
          {tx(
            !ci
              ? "Insufficient date blocks for a bootstrap estimate."
              : ci[0] > 0
                ? "The interval is above zero: the selected model has lower measured MAE under this resampling scheme."
                : ci[1] < 0
                  ? "The interval is below zero: the historical-median baseline performs better on this holdout."
                  : "The interval includes zero: this evaluation does not establish a clear improvement over the baseline.",
          )}
        </p>
        <p className="small muted">
          {tx(data.bootstrap_caveat)} {tx(data.bootstrap_repetitions)}{" "}
          {tx(" resamples, seed 42.")}
        </p>
        <p>
          {tx("Approximate 95% Wilson interval for observed coverage:")}
          {tx(" ")}
          <strong>
            {tx(
              data.coverage_wilson_95
                ?.map((v) => num(v * 100, 1) + "%")
                .join(" → ") ?? "Unavailable",
            )}
          </strong>
          {tx(".")}
        </p>
        <p className="small muted">{tx(data.coverage_caveat)}</p>
      </Panel>
      <div className="two-col">
        <Panel title={tx("Residual distribution · predicted − actual / min")}>
          <Chart
            data={data.residual_histogram}
            keys={["flights"]}
            x="band"
            type="bar"
          />
        </Panel>
        <Panel title={tx("Daily holdout MAE · minutes")}>
          <Chart data={data.daily_errors} keys={["mae", "baseline_mae"]} />
          <p className="small muted">
            {tx(
              "mae = selected model · baseline_mae = training historical median. Each point is a date's observed error.",
            )}
          </p>
        </Panel>
      </div>
      <Panel
        title={tx("Subgroup reliability")}
        aside={
          <label className="inline-check">
            <input
              type="checkbox"
              checked={small}
              onChange={(e) => setSmall(e.target.checked)}
            />
            {tx("Include groups below 30")}
          </label>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx("Dimension / group")}</th>
                <th>{tx("Test n")}</th>
                <th>{tx("MAE / min")}</th>
                <th>{tx("Bias / min")}</th>
                <th>{tx("Interval coverage")}</th>
                <th>{tx("Sample")}</th>
              </tr>
            </thead>
            <tbody>
              {data.subgroups
                .filter((g) => small || !g.small_sample)
                .map((g) => (
                  <tr key={g.dimension + g.group}>
                    <td>
                      {tx(g.dimension)} {tx(" / ")}
                      {tx(g.group)}
                    </td>
                    <td>{tx(g.n)}</td>
                    <td>{tx(num(g.mae, 2))}</td>
                    <td>{tx(num(g.bias, 2))}</td>
                    <td>
                      {tx(num(g.coverage * 100, 1))}
                      {tx("%")}
                    </td>
                    <td>{tx(g.small_sample ? "Small sample" : "≥30")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          {tx(
            "These are held-out descriptive subgroup metrics, not fairness guarantees or a basis for selecting the model after viewing the test set.",
          )}
        </p>
      </Panel>
      <Panel title={tx("Train → test support and distribution shift")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx("Feature")}</th>
                <th>{tx("Category total variation")}</th>
                <th>{tx("Unseen test rows")}</th>
              </tr>
            </thead>
            <tbody>
              {data.categorical_shift.map((r) => (
                <tr key={r.feature}>
                  <td>{tx(r.feature)}</td>
                  <td>{tx(num(r.total_variation, 3))}</td>
                  <td>{tx(r.unseen_test_rows)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <thead>
              <tr>
                <th>{tx("Numeric feature")}</th>
                <th>{tx("Training range")}</th>
                <th>{tx("Test rows outside range")}</th>
              </tr>
            </thead>
            <tbody>
              {data.numeric_support.map((r) => (
                <tr key={r.feature}>
                  <td>
                    {tx(r.feature)}
                    {tx(
                      r.feature === "distance"
                        ? ` / ${u.label("routeDistance")}`
                        : "",
                    )}
                  </td>
                  <td>
                    {tx(
                      r.feature === "distance"
                        ? u.number(r.train_min, "routeDistance", 1)
                        : num(r.train_min, 1),
                    )}
                    {tx(" ")}
                    {tx("→")}
                    {tx(" ")}
                    {tx(
                      r.feature === "distance"
                        ? u.number(r.train_max, "routeDistance", 1)
                        : num(r.train_max, 1),
                    )}
                  </td>
                  <td>{tx(r.test_outside_range)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          {tx(
            "Total variation ranges from 0 (same category frequencies) to 1 (disjoint). This is covariate shift, not proof of performance drift. Calendar features may naturally move outside training ranges. Numeric JSON model-report ranges retain source units; displayed distance follows your unit settings.",
          )}
        </p>
      </Panel>
    </div>
  );
}
