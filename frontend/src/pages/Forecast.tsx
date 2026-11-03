import { tx, useLocale } from "../i18n";
import { Link } from "react-router-dom";
import { saveJson } from "../features/analytics/export";
import ModelDiagnostics from "../features/analytics/ModelDiagnostics";
import { useUnits } from "../units";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi, post } from "../api";
import type { Model, Prediction } from "../types";
import { Badge, State, Panel, Chart, num } from "../components/UI";
export default function Forecast() {
  useLocale();
  const u = useUnits();
  const r = useApi<Model[]>("/models");
  const [modelId, setModelId] = useState("synthetic");
  const model = r.data?.find((m) => m.model_id === modelId);
  const [values, setValues] = useState({
    origin: "ATL",
    dest: "JFK",
    carrier: "DL",
    hour: 18,
    month: 4,
    dow: 4,
    distance: 760,
  });
  useEffect(() => {
    if (model?.support)
      setValues((v) => ({
        ...v,
        origin: model.support!.origins.includes(v.origin)
          ? v.origin
          : model.support!.origins[0],
        dest: model.support!.destinations.includes(v.dest)
          ? v.dest
          : model.support!.destinations[0],
        carrier: model.support!.carriers.includes(v.carrier)
          ? v.carrier
          : model.support!.carriers[0],
      }));
  }, [model]);
  const [result, setResult] = useState<Prediction>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <p>
        <Link to="/math">{tx("Math formulas and assumptions →")}</Link>
      </p>
      <State error={r.error} />
      <div className="controls-bar">
        <label>
          {tx("Model")}
          <select
            aria-label={tx("Trained model")}
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setResult(undefined);
            }}
          >
            {r.data?.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {tx(m.label)} {tx(" / ")}
                {tx(m.selected_model)}
              </option>
            ))}
          </select>
        </label>
        <Badge tone="amber">{tx(model?.label ?? "NO MODEL")}</Badge>
        <span className="small muted">
          {tx(
            "Departure delay regression · Forecast issued 120 minutes before schedule",
          )}
        </span>
      </div>
      {!model && (
        <div className="notice">
          {tx("No trained model available. Run")}
          {tx(" ")}
          <code>{tx("python -m aerotwin.cli train --dataset synthetic")}</code>
          {tx(".")}
        </div>
      )}
      <div className="forecast-grid">
        <Panel
          title={tx("Schedule-only prediction")}
          aside={<FlaskConical size={17} />}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setResult(undefined);
              try {
                setResult(
                  await post<Prediction>("/predict", {
                    model_id: modelId,
                    ...values,
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="small muted">
              {tx("Training support: airports")}
              {tx(" ")}
              {tx(model?.support?.origins.join(", ") ?? "see model report")}
              {tx("; carriers ")}
              {tx(model?.support?.carriers.join(", ") ?? "unknown")}
              {tx(". Unseen airports/carriers are rejected.")}
            </p>
            <div className="form-grid">
              {(["origin", "dest", "carrier"] as const).map((k) => (
                <label key={k}>
                  {tx(
                    k === "dest"
                      ? "Destination"
                      : k === "origin"
                        ? "Origin airport"
                        : "Carrier",
                  )}
                  <input
                    aria-label={tx(`Forecast ${k}`)}
                    required
                    pattern={k === "carrier" ? "[A-Z0-9]{2,3}" : "[A-Z]{3}"}
                    value={values[k]}
                    onChange={(e) => {
                      setResult(undefined);
                      setValues({
                        ...values,
                        [k]: e.target.value.toUpperCase(),
                      });
                    }}
                  />
                </label>
              ))}
              {(["hour", "month", "dow", "distance"] as const).map((k) => (
                <label key={k}>
                  {tx(
                    {
                      hour: "Local departure hour",
                      month: "Month",
                      dow: "Weekday (Mon = 0)",
                      distance: `Distance / ${u.label("routeDistance")}`,
                    }[k],
                  )}
                  <input
                    aria-label={tx(`Forecast ${k}`)}
                    type="number"
                    required
                    min={
                      k === "distance"
                        ? u.convert(1, "routeDistance")
                        : k === "month"
                          ? 1
                          : 0
                    }
                    step={k === "distance" ? "any" : 1}
                    max={
                      {
                        hour: 23,
                        month: 12,
                        dow: 6,
                        distance: u.convert(12000, "routeDistance"),
                      }[k]
                    }
                    value={
                      k === "distance"
                        ? +u.convert(values[k], "routeDistance").toFixed(6)
                        : values[k]
                    }
                    onChange={(e) => {
                      setResult(undefined);
                      setValues({
                        ...values,
                        [k]:
                          k === "distance"
                            ? u.fromDisplay(+e.target.value, "routeDistance")
                            : +e.target.value,
                      });
                    }}
                  />
                </label>
              ))}
            </div>
            <button
              className="primary wide"
              disabled={busy || !model}
              type="submit"
            >
              <FlaskConical size={15} />
              {tx(busy ? "Computing prediction…" : "Predict departure delay")}
            </button>
          </form>
          <State error={error} />
          {result && (
            <div
              className="prediction-result"
              aria-label={tx("Prediction result")}
            >
              <span className="eyebrow">
                {tx(result.label)} {tx(" / T−120 MIN")}
              </span>
              <strong>
                {tx(num(result.prediction_minutes, 1))}
                <small> {tx(" min")}</small>
              </strong>
              <p>
                {tx("Nominal 90% residual interval:")}
                {tx(" ")}
                <b>
                  {tx(num(result.interval_minutes[0], 1))} {tx(" to")}
                  {tx(" ")}
                  {tx(num(result.interval_minutes[1], 1))} {tx(" min")}
                </b>
              </p>
              {!!result.sensitivity?.length && (
                <div
                  className="prediction-sensitivity"
                  aria-label={tx("Per-flight sensitivity")}
                >
                  <h3>{tx("What changes this prediction?")}</h3>
                  <p className="small muted">{tx(result.sensitivity_caveat)}</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{tx("Feature")}</th>
                          <th>{tx("Training reference")}</th>
                          <th>{tx("Prediction change / min")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.sensitivity.map((row) => (
                          <tr key={row.feature}>
                            <td>{tx(row.feature)}</td>
                            <td>
                              {tx(
                                row.feature === "distance"
                                  ? u.format(
                                      Number(row.reference_value),
                                      "routeDistance",
                                      1,
                                    )
                                  : String(row.reference_value),
                              )}
                            </td>
                            <td>{tx(num(row.change_minutes, 2))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <p className="small muted">
                {tx(result.caveat)} {tx(result.warnings.join(" "))}
              </p>
            </div>
          )}
        </Panel>
        <Panel
          title={tx("Temporal holdout evaluation")}
          aside={
            <button
              disabled={!model}
              onClick={() =>
                model &&
                saveJson(model, `aerotwin-${modelId}-model-report.json`)
              }
            >
              {tx("Export model report")}
            </button>
          }
        >
          <table className="metric-table">
            <thead>
              <tr>
                <th>{tx("Estimator")}</th>
                <th>{tx("Test MAE")}</th>
                <th>{tx("Test RMSE")}</th>
              </tr>
            </thead>
            <tbody>
              {model &&
                Object.entries(model.metrics).map(([name, m]) => (
                  <tr key={name}>
                    <td>
                      {tx(name.replaceAll("_", " "))}
                      {name === model.selected_model && (
                        <span className="selected-tag">{tx("selected")}</span>
                      )}
                    </td>
                    <td>{tx(num(m.test.mae, 2))}</td>
                    <td>{tx(num(m.test.rmse, 2))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="split-row">
            {model &&
              Object.entries(model.n).map(([k, v]) => (
                <div key={k}>
                  <span>{tx(k)}</span>
                  <strong>{tx(num(v))}</strong>
                  <small>
                    {tx(
                      model.windows[k]?.map((w) => w.slice(0, 10)).join(" → "),
                    )}
                  </small>
                </div>
              ))}
          </div>
          <p className="small muted">
            {tx(
              "Selection uses validation MAE. Test metrics are final holdout results. Training labels must be available before the next split’s earliest issuance; 24h label embargo. Realized flight times and delay causes are excluded.",
            )}
          </p>
          <div className="integrity-row">
            <span>{tx("Measured test interval coverage")}</span>
            <strong>
              {tx(num(model ? model.interval_test_coverage * 100 : null, 1))}
              {tx("%")}
            </strong>
          </div>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title={tx("Holdout: predicted vs actual delay")}>
          <div className="chart">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="var(--chart-grid)" />
                <XAxis
                  type="number"
                  dataKey="actual"
                  name={tx("Actual / min")}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="predicted"
                  name={tx("Predicted / min")}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                />
                <Scatter
                  data={model?.validation_chart ?? []}
                  fill="var(--accent)"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title={tx("Global permutation importance")}
          aside={<span className="tiny">{tx("VALIDATION Δ MAE / MIN")}</span>}
        >
          <Chart
            data={Object.entries(
              model?.global_permutation_importance ?? {},
            ).map(([feature, importance]) => ({ feature, importance }))}
            keys={["importance"]}
            type="bar"
            x="feature"
          />
          <p className="small muted">
            {tx(
              "Global predictive sensitivity measured on validation rows. These are not per-flight explanations or causal effects.",
            )}
          </p>
        </Panel>
      </div>
      <ModelDiagnostics
        data={model?.diagnostics}
        label={tx(model?.label ?? "Model not selected")}
      />
      <Panel title={tx("Train with official data")}>
        <p className="muted">
          {tx(
            "The bundled model learns a seeded synthetic process. Its scores are not an aviation benchmark. Download official BTS data, import it, then train a separate real-data artifact.",
          )}
        </p>
        <pre>
          {tx(
            "python -m aerotwin.cli ingest-bts --input /path/to/bts.csv --timezone-map /path/to/zones.json",
          )}
          {tx("\n")}
          {tx("python -m aerotwin.cli train --dataset bts")}
        </pre>
        <p className="small muted">
          {tx("Expanding-origin ridge backtests completed:")}
          {tx(" ")}
          {tx(model?.rolling_origin.length ?? 0)}
          {tx(
            ". Full fold metrics are available in Data & experiments and the model report JSON.",
          )}
        </p>
      </Panel>
    </>
  );
}
