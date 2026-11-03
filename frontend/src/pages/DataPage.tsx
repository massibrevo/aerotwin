import { tx, useLocale } from "../i18n";
import { useCallback } from "react";
import DataOperations from "./DataOperations";
import { useApi } from "../api";
import type { Sources, Model } from "../types";
import { Badge, State, Panel, num } from "../components/UI";
export default function DataPage() {
  useLocale();
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
        title={tx("Source catalog")}
        aside={
          <button
            onClick={() => {
              r.reload();
              m.reload();
            }}
          >
            {tx("Refresh inventory")}
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx("Source")}</th>
                <th>{tx("Data class")}</th>
                <th>{tx("License / terms")}</th>
                <th>{tx("Reference")}</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.sources.map((s) => (
                <tr key={s.name}>
                  <td>
                    {tx(s.name)}
                    {s.rows && (
                      <small>
                        {" "}
                        {tx(" · ")}
                        {tx(num(s.rows))} {tx(" rows")}
                      </small>
                    )}
                  </td>
                  <td>
                    <Badge tone="amber">{tx(s.class)}</Badge>
                  </td>
                  <td>{tx(s.license)}</td>
                  <td>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {tx("Source documentation ↗")}
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
        <Panel title={tx("Import provenance")}>
          {r.data?.bts_import ? (
            <pre>{tx(JSON.stringify(r.data.bts_import, null, 2))}</pre>
          ) : (
            <>
              <Badge tone="amber">{tx("NO REAL BTS DATA IMPORTED")}</Badge>
              <p className="muted">
                {tx(
                  "Import an official CSV above or use the CLI. Source checksum, duplicate count, null coverage, cancellation flags and timezone mappings are saved locally.",
                )}
              </p>
              <pre>
                {tx(
                  "python -m aerotwin.cli ingest-bts --input /path/to/bts.csv",
                )}
              </pre>
            </>
          )}
        </Panel>
        <Panel title={tx("Local experiment inventory")}>
          {r.data?.experiments.map((e, i) => (
            <pre key={i}>{tx(JSON.stringify(e, null, 2))}</pre>
          ))}
          <p className="small muted">
            {tx(
              "Model artifacts and downloaded datasets stay on this machine. The app loads only its own fixed model paths.",
            )}
          </p>
        </Panel>
      </div>
      <Panel title={tx("Validation reports")}>
        {m.data?.map((model) => (
          <details key={model.model_id}>
            <summary>
              {tx(model.label)} {tx(" · ")}
              {tx(model.selected_model)} {tx(" · ")}
              {tx(model.trained_at)}
            </summary>
            <pre>{tx(JSON.stringify(model, null, 2))}</pre>
          </details>
        ))}
      </Panel>
      <Panel title={tx("Simulation history · persistent local ledger")}>
        {r.data?.simulation_history.length ? (
          r.data.simulation_history.map((s) => (
            <div className="integrity-row" key={s.id}>
              <span>
                {tx(s.airport)} {tx(" · seed ")}
                {tx(s.seed)} {tx(" · ")}
                {tx(s.repetitions)} {tx(" replications")}
              </span>
              <strong>
                {tx("+")}
                {tx(num(s.additional_delay_minutes, 2))} {tx(" min")}
              </strong>
            </div>
          ))
        ) : (
          <p className="muted">
            {tx(
              "Run a scenario in the simulator to record a persistent local experiment.",
            )}
          </p>
        )}
      </Panel>
    </>
  );
}
