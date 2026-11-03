import { tx, useLocale } from "../i18n";
import { useEffect, useState } from "react";
import { GitBranch, SlidersHorizontal } from "lucide-react";
import { useApi, post } from "../api";
import type { Network, Simulation } from "../types";
import { Badge, State, Stat, Panel, Chart, num } from "../components/UI";
export default function Simulator({ dataset }: { dataset: string }) {
  useLocale();
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
  useEffect(() => {
    if (nodes.length && !nodes.some((n) => n.iata === airport))
      setAirport(nodes[0].iata);
  }, [network.data, airport]);
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
          {tx(
            "SIMULATION · Hypothetical capacity shock with stylized connection assumptions. Outputs are computed, not operational forecasts or identified causal effects.",
          )}
        </span>
      </div>
      <div className="scenario-grid">
        <Panel
          title={tx("Route network")}
          aside={
            <Badge tone="amber">
              {tx(dataset.toUpperCase())} {tx(" NETWORK")}
            </Badge>
          }
        >
          <svg
            viewBox="0 0 620 420"
            className="network-svg"
            aria-label={tx("Airport network graph")}
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
                aria-label={tx(`Simulate ${n.iata}`)}
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
                  {tx(n.iata)}
                </text>
                <text textAnchor="middle" y="49" fill="#8296a7" fontSize="10">
                  {tx(num(n.traffic))} {tx(" route observations")}
                </text>
              </g>
            ))}
          </svg>
          <p className="small muted">
            {tx(network.data?.risk_definition)} {tx(" ·")}
            {tx(" ")}
            {tx(network.data?.coverage.join(" → "))}
          </p>
        </Panel>
        <Panel
          title={tx("Configure intervention")}
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
              {tx("Affected airport")}
              <select
                aria-label={tx("Scenario airport")}
                value={airport}
                onChange={(e) => setAirport(e.target.value)}
              >
                {nodes.map((n) => (
                  <option key={n.iata}>{tx(n.iata)}</option>
                ))}
              </select>
            </label>
            <label className="range-label">
              {tx("Capacity reduction")}
              <strong>
                {tx(reduction)}
                {tx("%")}
              </strong>
              <input
                aria-label={tx("Capacity reduction")}
                type="range"
                min="0"
                max="70"
                value={reduction}
                onChange={(e) => setReduction(+e.target.value)}
              />
            </label>
            <label className="range-label">
              {tx("Disruption duration")}
              <strong>
                {tx(duration)} {tx(" min")}
              </strong>
              <input
                aria-label={tx("Disruption duration")}
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
                {tx("Replications")}
                <input
                  aria-label={tx("Replications")}
                  type="number"
                  min="1"
                  max="100"
                  value={repetitions}
                  onChange={(e) => setRepetitions(+e.target.value)}
                />
              </label>
              <label>
                {tx("Random seed")}
                <input
                  aria-label={tx("Random seed")}
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
              {tx(busy ? "Running paired simulations…" : "Run simulation")}
            </button>
            {busy && <progress aria-label={tx("Simulation running")} />}
          </form>
          <State error={error} />
          <p className="small muted">
            {tx(
              "Paired baseline and intervention use identical arrivals and service draws for each seed. Zero capacity loss produces identical outcomes.",
            )}
          </p>
        </Panel>
      </div>
      {result && (
        <div aria-label={tx("Simulation results")}>
          <div className="stats-row">
            <Stat
              label={tx("BASELINE QUEUE DELAY")}
              value={num(result.baseline_mean_minutes, 1)}
              unit=" min"
            />
            <Stat
              label={tx("SCENARIO QUEUE DELAY")}
              value={num(result.scenario_mean_minutes, 1)}
              unit=" min"
            />
            <Stat
              label={tx("ADDITIONAL DELAY")}
              value={num(result.additional_delay_minutes, 1)}
              unit=" min"
              note={tx(
                `Replication P10–P90: ${result.delta_p10_p90.map((v) => num(v, 1)).join("–")} min`,
              )}
            />
            <Stat
              label={tx("STYLIZED DOWNSTREAM DELAY")}
              value={num(result.downstream_mean_minutes, 1)}
              unit=" min"
              note={tx("Assumed 20–60 min connection slack")}
            />
          </div>
          <div className="two-col">
            <Panel
              title={tx("Queue delay · first replication")}
              aside={<span className="tiny">{tx("MINUTES BY HOUR")}</span>}
            >
              <Chart
                data={result.chart}
                x="minute"
                keys={["baseline", "scenario"]}
              />
            </Panel>
            <Panel title={tx("Additional delay by replication")}>
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
          <Panel title={tx("Assumptions & reproducibility")}>
            <ul className="assumptions">
              {result.assumptions.map((a) => (
                <li key={a}>{tx(a)}</li>
              ))}
            </ul>
            <p className="small muted">
              {tx("Seed ")}
              {tx(result.seed)} {tx(" · ")}
              {tx(result.repetitions)}{" "}
              {tx(" replications · Peak in-system aircraft ")}
              {tx(result.peak_queue_aircraft)} {tx(" · Run ")}
              {tx(result.id)}
            </p>
          </Panel>
        </div>
      )}
      <Panel title={tx("Network diagnostics")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx("Airport")}</th>
                <th>{tx("Directed degree")}</th>
                <th>{tx("Betweenness")}</th>
                <th>{tx("Traffic observations")}</th>
                <th>{tx("Descriptive risk index")}</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.iata}>
                  <td>{tx(n.iata)}</td>
                  <td>{tx(n.degree)}</td>
                  <td>{tx(num(n.betweenness, 4))}</td>
                  <td>{tx(num(n.traffic))}</td>
                  <td>{tx(num(n.risk_index, 4))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
