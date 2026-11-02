import { useState } from "react";
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
  const [result, setResult] = useState<Prediction>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <State error={r.error} />
      <div className="controls-bar">
        <label>
          Model
          <select
            aria-label="Trained model"
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setResult(undefined);
            }}
          >
            {r.data?.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.label} / {m.selected_model}
              </option>
            ))}
          </select>
        </label>
        <Badge tone="amber">{model?.label ?? "NO MODEL"}</Badge>
        <span className="small muted">
          Departure delay regression · Forecast issued 120 minutes before
          schedule
        </span>
      </div>
      {!model && (
        <div className="notice">
          No trained model available. Run{" "}
          <code>python -m aerotwin.cli train --dataset synthetic</code>.
        </div>
      )}
      <div className="forecast-grid">
        <Panel
          title="Schedule-only prediction"
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
            <div className="form-grid">
              {(["origin", "dest", "carrier"] as const).map((k) => (
                <label key={k}>
                  {k === "dest"
                    ? "Destination"
                    : k === "origin"
                      ? "Origin airport"
                      : "Carrier"}
                  <input
                    aria-label={`Forecast ${k}`}
                    required
                    pattern={k === "carrier" ? "[A-Z0-9]{2,3}" : "[A-Z]{3}"}
                    value={values[k]}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [k]: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
              ))}
              {(["hour", "month", "dow", "distance"] as const).map((k) => (
                <label key={k}>
                  {
                    {
                      hour: "Local departure hour",
                      month: "Month",
                      dow: "Weekday (Mon = 0)",
                      distance: "Distance / miles",
                    }[k]
                  }
                  <input
                    aria-label={`Forecast ${k}`}
                    type="number"
                    required
                    min={k === "distance" || k === "month" ? 1 : 0}
                    max={{ hour: 23, month: 12, dow: 6, distance: 12000 }[k]}
                    value={values[k]}
                    onChange={(e) =>
                      setValues({ ...values, [k]: +e.target.value })
                    }
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
              {busy ? "Computing prediction…" : "Predict departure delay"}
            </button>
          </form>
          <State error={error} />
          {result && (
            <div className="prediction-result" aria-label="Prediction result">
              <span className="eyebrow">{result.label} / T−120 MIN</span>
              <strong>
                {num(result.prediction_minutes, 1)}
                <small> min</small>
              </strong>
              <p>
                Nominal 90% residual interval:{" "}
                <b>
                  {num(result.interval_minutes[0], 1)} to{" "}
                  {num(result.interval_minutes[1], 1)} min
                </b>
              </p>
              <p className="small muted">
                {result.caveat} {result.warnings.join(" ")}
              </p>
            </div>
          )}
        </Panel>
        <Panel
          title="Temporal holdout evaluation"
          aside={<span className="tiny">ACTUALLY MEASURED</span>}
        >
          <table className="metric-table">
            <thead>
              <tr>
                <th>Estimator</th>
                <th>Test MAE</th>
                <th>Test RMSE</th>
              </tr>
            </thead>
            <tbody>
              {model &&
                Object.entries(model.metrics).map(([name, m]) => (
                  <tr key={name}>
                    <td>
                      {name.replaceAll("_", " ")}
                      {name === model.selected_model && (
                        <span className="selected-tag">selected</span>
                      )}
                    </td>
                    <td>{num(m.test.mae, 2)}</td>
                    <td>{num(m.test.rmse, 2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="split-row">
            {model &&
              Object.entries(model.n).map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{num(v)}</strong>
                  <small>
                    {model.windows[k]?.map((w) => w.slice(0, 10)).join(" → ")}
                  </small>
                </div>
              ))}
          </div>
          <p className="small muted">
            Selection uses validation MAE. Test metrics are final holdout
            results. Training labels must be available before the next split’s
            earliest issuance; 24h label embargo. Realized flight times and
            delay causes are excluded.
          </p>
          <div className="integrity-row">
            <span>Measured test interval coverage</span>
            <strong>
              {num((model?.interval_test_coverage ?? 0) * 100, 1)}%
            </strong>
          </div>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Holdout: predicted vs actual delay">
          <div className="chart">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="#233240" />
                <XAxis
                  type="number"
                  dataKey="actual"
                  name="Actual / min"
                  tick={{ fill: "#8195a6", fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="predicted"
                  name="Predicted / min"
                  tick={{ fill: "#8195a6", fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ background: "#101c2a" }}
                />
                <Scatter data={model?.validation_chart ?? []} fill="#48c7dd" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Global permutation importance"
          aside={<span className="tiny">VALIDATION Δ MAE / MIN</span>}
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
            Global predictive sensitivity measured on validation rows. These are
            not per-flight explanations or causal effects.
          </p>
        </Panel>
      </div>
      <Panel title="Train with official data">
        <p className="muted">
          The bundled model learns a seeded synthetic process. Its scores are
          not an aviation benchmark. Download official BTS data, import it, then
          train a separate real-data artifact.
        </p>
        <pre>
          python -m aerotwin.cli ingest-bts --input /path/to/bts.csv
          --timezone-map /path/to/zones.json{"\n"}python -m aerotwin.cli train
          --dataset bts
        </pre>
        <p className="small muted">
          Expanding-origin ridge backtests completed:{" "}
          {model?.rolling_origin.length ?? 0}. Full fold metrics are available
          in Data & experiments and the model report JSON.
        </p>
      </Panel>
    </>
  );
}
