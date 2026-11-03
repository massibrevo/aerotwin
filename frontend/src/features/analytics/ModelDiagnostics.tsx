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
  const u = useUnits();
  const [small, setSmall] = useState(false);
  if (!data)
    return (
      <Panel title="Extended model diagnostics">
        <p>
          This model predates the extended evaluation.{" "}
          <Link to="/data">Train the selected dataset</Link> to compute
          residuals, subgroup coverage, support shift and paired baseline
          uncertainty. Existing predictions remain available.
        </p>
      </Panel>
    );
  const ci = data.baseline_improvement_block_bootstrap_95;
  return (
    <div aria-label="Extended model diagnostics">
      <div className="diagnostic-source">
        <Badge tone="amber">{label}</Badge>
        <span>T−120 min · chronological final holdout</span>
      </div>
      <div className="stats-row">
        <Stat
          label="TEST RESIDUAL BIAS"
          value={num(data.bias_minutes, 2)}
          unit=" min"
          note="Predicted − actual; positive = overprediction"
        />
        <Stat
          label="P90 ABSOLUTE ERROR"
          value={num(data.p90_absolute_error, 2)}
          unit=" min"
          note={`Median absolute error ${num(data.median_absolute_error, 2)} min`}
        />
        <Stat
          label="MAE IMPROVEMENT VS MEDIAN"
          value={num(data.baseline_mae_improvement_minutes, 2)}
          unit=" min"
          note="Positive = lower error than the baseline"
        />
        <Stat
          label="EVALUATED TEST FLIGHTS"
          value={num(data.test_n)}
          note={`${data.bootstrap_blocks} schedule-date blocks`}
        />
      </div>
      <Panel title="Evidence against the baseline">
        <p>
          95% paired daily-block bootstrap interval for MAE improvement:{" "}
          <strong>
            {ci
              ? `${num(ci[0], 2)} to ${num(ci[1], 2)} min`
              : "Unavailable: fewer than five test dates"}
          </strong>
          .
        </p>
        <p>
          {!ci
            ? "Insufficient date blocks for a bootstrap estimate."
            : ci[0] > 0
              ? "The interval is above zero: the selected model has lower measured MAE under this resampling scheme."
              : ci[1] < 0
                ? "The interval is below zero: the historical-median baseline performs better on this holdout."
                : "The interval includes zero: this evaluation does not establish a clear improvement over the baseline."}
        </p>
        <p className="small muted">
          {data.bootstrap_caveat} {data.bootstrap_repetitions} resamples, seed
          42.
        </p>
        <p>
          Approximate 95% Wilson interval for observed coverage:{" "}
          <strong>
            {data.coverage_wilson_95
              ?.map((v) => num(v * 100, 1) + "%")
              .join(" → ") ?? "Unavailable"}
          </strong>
          .
        </p>
        <p className="small muted">{data.coverage_caveat}</p>
      </Panel>
      <div className="two-col">
        <Panel title="Residual distribution · predicted − actual / min">
          <Chart
            data={data.residual_histogram}
            keys={["flights"]}
            x="band"
            type="bar"
          />
        </Panel>
        <Panel title="Daily holdout MAE · minutes">
          <Chart data={data.daily_errors} keys={["mae", "baseline_mae"]} />
          <p className="small muted">
            mae = selected model · baseline_mae = training historical median.
            Each point is a date's observed error.
          </p>
        </Panel>
      </div>
      <Panel
        title="Subgroup reliability"
        aside={
          <label className="inline-check">
            <input
              type="checkbox"
              checked={small}
              onChange={(e) => setSmall(e.target.checked)}
            />
            Include groups below 30
          </label>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dimension / group</th>
                <th>Test n</th>
                <th>MAE / min</th>
                <th>Bias / min</th>
                <th>Interval coverage</th>
                <th>Sample</th>
              </tr>
            </thead>
            <tbody>
              {data.subgroups
                .filter((g) => small || !g.small_sample)
                .map((g) => (
                  <tr key={g.dimension + g.group}>
                    <td>
                      {g.dimension} / {g.group}
                    </td>
                    <td>{g.n}</td>
                    <td>{num(g.mae, 2)}</td>
                    <td>{num(g.bias, 2)}</td>
                    <td>{num(g.coverage * 100, 1)}%</td>
                    <td>{g.small_sample ? "Small sample" : "≥30"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          These are held-out descriptive subgroup metrics, not fairness
          guarantees or a basis for selecting the model after viewing the test
          set.
        </p>
      </Panel>
      <Panel title="Train → test support and distribution shift">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Category total variation</th>
                <th>Unseen test rows</th>
              </tr>
            </thead>
            <tbody>
              {data.categorical_shift.map((r) => (
                <tr key={r.feature}>
                  <td>{r.feature}</td>
                  <td>{num(r.total_variation, 3)}</td>
                  <td>{r.unseen_test_rows}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table>
            <thead>
              <tr>
                <th>Numeric feature</th>
                <th>Training range</th>
                <th>Test rows outside range</th>
              </tr>
            </thead>
            <tbody>
              {data.numeric_support.map((r) => (
                <tr key={r.feature}>
                  <td>
                    {r.feature}
                    {r.feature === "distance"
                      ? ` / ${u.label("routeDistance")}`
                      : ""}
                  </td>
                  <td>
                    {r.feature === "distance"
                      ? u.number(r.train_min, "routeDistance", 1)
                      : num(r.train_min, 1)}{" "}
                    →{" "}
                    {r.feature === "distance"
                      ? u.number(r.train_max, "routeDistance", 1)
                      : num(r.train_max, 1)}
                  </td>
                  <td>{r.test_outside_range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Total variation ranges from 0 (same category frequencies) to 1
          (disjoint). This is covariate shift, not proof of performance drift.
          Calendar features may naturally move outside training ranges. Numeric
          JSON model-report ranges retain source units; displayed distance
          follows your unit settings.
        </p>
      </Panel>
    </div>
  );
}
