import { useCallback } from "react";
import DataOperations from "./DataOperations";
import { useApi } from "../api";
import type { Sources, Model } from "../types";
import { Badge, State, Panel, num } from "../components/UI";
export default function DataPage() {
  const r = useApi<Sources>("/data/sources");
  const m = useApi<Model[]>("/models");
  const refresh = useCallback(() => {
    r.reload();
    m.reload();
  }, [r.reload, m.reload]);
  return (
    <>
      <State error={r.error || m.error} />
      <DataOperations onChange={refresh} />
      <Panel
        title="Source catalog"
        aside={
          <button
            onClick={() => {
              r.reload();
              m.reload();
            }}
          >
            Refresh inventory
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Data class</th>
                <th>License / terms</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.sources.map((s) => (
                <tr key={s.name}>
                  <td>
                    {s.name}
                    {s.rows && <small> · {num(s.rows)} rows</small>}
                  </td>
                  <td>
                    <Badge tone="amber">{s.class}</Badge>
                  </td>
                  <td>{s.license}</td>
                  <td>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        Source documentation ↗
                      </a>
                    ) : (
                      "Bundled seeded examples"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="two-col">
        <Panel title="Import provenance">
          {r.data?.bts_import ? (
            <pre>{JSON.stringify(r.data.bts_import, null, 2)}</pre>
          ) : (
            <>
              <Badge tone="amber">NO REAL BTS DATA IMPORTED</Badge>
              <p className="muted">
                Import an official CSV above or use the CLI. Source checksum,
                duplicate count, null coverage, cancellation flags and timezone
                mappings are saved locally.
              </p>
              <pre>
                python -m aerotwin.cli ingest-bts --input /path/to/bts.csv
              </pre>
            </>
          )}
        </Panel>
        <Panel title="Local experiment inventory">
          {r.data?.experiments.map((e, i) => (
            <pre key={i}>{JSON.stringify(e, null, 2)}</pre>
          ))}
          <p className="small muted">
            Model artifacts and downloaded datasets stay on this machine. The
            app loads only its own fixed model paths.
          </p>
        </Panel>
      </div>
      <Panel title="Validation reports">
        {m.data?.map((model) => (
          <details key={model.model_id}>
            <summary>
              {model.label} · {model.selected_model} · {model.trained_at}
            </summary>
            <pre>{JSON.stringify(model, null, 2)}</pre>
          </details>
        ))}
      </Panel>
      <Panel title="Simulation history · persistent local ledger">
        {r.data?.simulation_history.length ? (
          r.data.simulation_history.map((s) => (
            <div className="integrity-row" key={s.id}>
              <span>
                {s.airport} · seed {s.seed} · {s.repetitions} replications
              </span>
              <strong>+{num(s.additional_delay_minutes, 2)} min</strong>
            </div>
          ))
        ) : (
          <p className="muted">
            Run a scenario in the simulator to record a persistent local
            experiment.
          </p>
        )}
      </Panel>
    </>
  );
}
