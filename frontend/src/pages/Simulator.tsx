import { useState } from "react";
import { GitBranch, SlidersHorizontal } from "lucide-react";
import { useApi, post } from "../api";
import type { Network, Simulation } from "../types";
import { Badge, State, Stat, Panel, Chart, num } from "../components/UI";
export default function Simulator({ dataset }: { dataset: string }) {
  const network = useApi<Network>("/network?dataset=" + dataset);
  const [airport, setAirport] = useState("ATL");
  const [reduction, setReduction] = useState(40);
  const [duration, setDuration] = useState(120);
  const [repetitions, setRepetitions] = useState(30);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState<Simulation>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nodes = network.data?.nodes ?? [];
  const coords = Object.fromEntries(
    nodes.map((n, i) => [
      n.iata,
      [
        310 + 210 * Math.cos((i / nodes.length) * Math.PI * 2 - Math.PI / 2),
        210 + 155 * Math.sin((i / nodes.length) * Math.PI * 2 - Math.PI / 2),
      ],
    ]),
  );
  return (
    <>
      <State error={network.error} />
      <div className="notice">
        <GitBranch size={17} />
        <span>
          SIMULATION · Hypothetical capacity shock with stylized connection
          assumptions. Outputs are computed, not operational forecasts or
          identified causal effects.
        </span>
      </div>
      <div className="scenario-grid">
        <Panel
          title="Route network"
          aside={<Badge tone="amber">{dataset.toUpperCase()} NETWORK</Badge>}
        >
          <svg
            viewBox="0 0 620 420"
            className="network-svg"
            aria-label="Airport network graph"
          >
            {network.data?.edges.map((e) => (
              <line
                key={e.origin + e.dest}
                x1={coords[e.origin]?.[0]}
                y1={coords[e.origin]?.[1]}
                x2={coords[e.dest]?.[0]}
                y2={coords[e.dest]?.[1]}
                stroke={
                  e.origin === airport || e.dest === airport
                    ? "#48c7dd"
                    : "#294052"
                }
                strokeOpacity={0.45}
                strokeWidth={Math.max(1, e.flights / 90)}
              />
            ))}
            {nodes.map((n) => (
              <g
                key={n.iata}
                transform={`translate(${coords[n.iata]})`}
                role="button"
                tabIndex={0}
                aria-label={`Simulate ${n.iata}`}
                className="network-node"
                onClick={() => setAirport(n.iata)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setAirport(n.iata);
                }}
              >
                <circle
                  r={n.iata === airport ? 34 : 27}
                  fill={n.iata === airport ? "#143d49" : "#132331"}
                  stroke={n.iata === airport ? "#48c7dd" : "#405366"}
                />
                <text textAnchor="middle" y="4" fill="#e1edf5" fontSize="13">
                  {n.iata}
                </text>
                <text textAnchor="middle" y="49" fill="#8296a7" fontSize="10">
                  {num(n.traffic)} route observations
                </text>
              </g>
            ))}
          </svg>
          <p className="small muted">
            {network.data?.risk_definition} ·{" "}
            {network.data?.coverage.join(" → ")}
          </p>
        </Panel>
        <Panel
          title="Configure intervention"
          aside={<SlidersHorizontal size={17} />}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setResult(undefined);
              try {
                setResult(
                  await post<Simulation>("/simulations", {
                    airport,
                    reduction: reduction / 100,
                    duration,
                    repetitions,
                    seed,
                    dataset,
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Affected airport
              <select
                aria-label="Scenario airport"
                value={airport}
                onChange={(e) => setAirport(e.target.value)}
              >
                {nodes.map((n) => (
                  <option key={n.iata}>{n.iata}</option>
                ))}
              </select>
            </label>
            <label className="range-label">
              Capacity reduction<strong>{reduction}%</strong>
              <input
                aria-label="Capacity reduction"
                type="range"
                min="0"
                max="70"
                value={reduction}
                onChange={(e) => setReduction(+e.target.value)}
              />
            </label>
            <label className="range-label">
              Disruption duration<strong>{duration} min</strong>
              <input
                aria-label="Disruption duration"
                type="range"
                min="15"
                max="360"
                step="15"
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Replications
                <input
                  aria-label="Replications"
                  type="number"
                  min="1"
                  max="100"
                  value={repetitions}
                  onChange={(e) => setRepetitions(+e.target.value)}
                />
              </label>
              <label>
                Random seed
                <input
                  aria-label="Random seed"
                  type="number"
                  min="0"
                  max="4294967295"
                  value={seed}
                  onChange={(e) => setSeed(+e.target.value)}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy || !nodes.length}
              className="primary wide"
            >
              <GitBranch size={16} />
              {busy ? "Running paired simulations…" : "Run simulation"}
            </button>
            {busy && <progress aria-label="Simulation running" />}
          </form>
          <State error={error} />
          <p className="small muted">
            Paired baseline and intervention use identical arrivals and service
            draws for each seed. Zero capacity loss produces identical outcomes.
          </p>
        </Panel>
      </div>
      {result && (
        <div aria-label="Simulation results">
          <div className="stats-row">
            <Stat
              label="BASELINE QUEUE DELAY"
              value={num(result.baseline_mean_minutes, 1)}
              unit=" min"
            />
            <Stat
              label="SCENARIO QUEUE DELAY"
              value={num(result.scenario_mean_minutes, 1)}
              unit=" min"
            />
            <Stat
              label="ADDITIONAL DELAY"
              value={num(result.additional_delay_minutes, 1)}
              unit=" min"
              note={`Replication P10–P90: ${result.delta_p10_p90.map((v) => num(v, 1)).join("–")} min`}
            />
            <Stat
              label="STYLIZED DOWNSTREAM DELAY"
              value={num(result.downstream_mean_minutes, 1)}
              unit=" min"
              note="Assumed 20–60 min connection slack"
            />
          </div>
          <div className="two-col">
            <Panel
              title="Queue delay · first replication"
              aside={<span className="tiny">MINUTES BY HOUR</span>}
            >
              <Chart
                data={result.chart}
                x="minute"
                keys={["baseline", "scenario"]}
              />
            </Panel>
            <Panel title="Additional delay by replication">
              <Chart
                data={result.replication_deltas.map((delta, i) => ({
                  replication: i + 1,
                  delta,
                }))}
                x="replication"
                keys={["delta"]}
                type="bar"
              />
            </Panel>
          </div>
          <Panel title="Assumptions & reproducibility">
            <ul className="assumptions">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="small muted">
              Seed {result.seed} · {result.repetitions} replications · Peak
              in-system aircraft {result.peak_queue_aircraft} · Run {result.id}
            </p>
          </Panel>
        </div>
      )}
      <Panel title="Network diagnostics">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Airport</th>
                <th>Directed degree</th>
                <th>Betweenness</th>
                <th>Traffic observations</th>
                <th>Descriptive risk index</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.iata}>
                  <td>{n.iata}</td>
                  <td>{n.degree}</td>
                  <td>{num(n.betweenness, 4)}</td>
                  <td>{num(n.traffic)}</td>
                  <td>{num(n.risk_index, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
