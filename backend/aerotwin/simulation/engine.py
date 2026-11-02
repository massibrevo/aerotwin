"""Paired discrete-event queues; stylized downstream connections, not causal forecasts."""

import networkx as nx
import numpy as np
import simpy
from aerotwin.config import AIRPORTS
from aerotwin.data.store import load


def network(dataset="synthetic"):
    f = load(dataset)
    edges = f.groupby(["origin", "dest"]).size().reset_index(name="flights")
    g = nx.from_pandas_edgelist(edges, "origin", "dest", ["flights"], create_using=nx.DiGraph)
    between = nx.betweenness_centrality(g, normalized=True)
    traffic = dict(g.degree(weight="flights"))
    total = max(1, sum(traffic.values()))
    coords = {a["iata"]: a for a in AIRPORTS}
    return {
        "data_class": dataset,
        "coverage": [str(f.date.min()), str(f.date.max())],
        "nodes": [
            {
                "iata": n,
                "degree": g.degree(n),
                "betweenness": between[n],
                "traffic": traffic[n],
                "risk_index": traffic[n] / total * (1 + between[n]),
                "lat": coords.get(n, {}).get("lat"),
                "lon": coords.get(n, {}).get("lon"),
            }
            for n in g.nodes
        ],
        "edges": edges.to_dict("records"),
        "risk_definition": "traffic share × (1 + unweighted betweenness), descriptive only",
    }


def _queue(arrivals, services, reduction, duration):
    env = simpy.Environment()
    runway = simpy.Resource(env, capacity=1)
    delays = np.zeros(len(arrivals))
    completions = np.zeros(len(arrivals))

    def flight(i):
        yield env.timeout(float(arrivals[i]))
        with runway.request() as request:
            yield request
            delays[i] = env.now - arrivals[i]
            remaining = services[i]
            # Capacity changes apply to work in progress at the event boundary.
            while remaining > 1e-9:
                now = env.now
                factor = 1 - reduction if 60 <= now < 60 + duration else 1
                boundary = 60 if now < 60 else 60 + duration if now < 60 + duration else float("inf")
                step = min(remaining / factor, boundary - now)
                yield env.timeout(float(step))
                remaining -= step * factor
            completions[i] = env.now

    for i in range(len(arrivals)):
        env.process(flight(i))
    env.run()
    return delays, completions


def simulate(airport="ATL", reduction=0.4, duration=120, repetitions=30, seed=42, dataset="synthetic"):
    if not 0 <= reduction <= 0.7 or not 15 <= duration <= 360 or not 1 <= repetitions <= 100:
        raise ValueError("Scenario limits: reduction 0–0.7, duration 15–360 min, repetitions 1–100")
    f = load(dataset)
    observed = f[f.origin == airport]
    if observed.empty:
        raise ValueError("Airport has no departures in the selected dataset")
    rng = np.random.default_rng(seed)
    base, shock, propagated, peak_queue = [], [], [], []
    chart = []
    for run in range(repetitions):
        # 150 stylized departures over 6h, not inferred operational airport capacity.
        arrivals = np.sort(rng.uniform(0, 360, 150))
        services = rng.lognormal(np.log(1.8) - 0.5 * 0.15**2, 0.15, 150)
        slack = rng.uniform(20, 60, 150)
        b, bc = _queue(arrivals, services, 0, duration)
        s, sc = _queue(arrivals, services, reduction, duration)
        base.append(float(b.mean()))
        shock.append(float(s.mean()))
        propagated.extend(np.maximum(0, s - b - slack).tolist())
        peak_queue.append(int(max(np.sum((arrivals <= t) & (sc > t)) for t in arrivals)))
        if run == 0:
            for hour in range(6):
                mask = (arrivals >= hour * 60) & (arrivals < (hour + 1) * 60)
                chart.append(
                    {
                        "minute": hour * 60,
                        "baseline": float(b[mask].mean()),
                        "scenario": float(s[mask].mean()),
                    }
                )
            assert np.all(np.diff(bc) >= 0) and np.all(np.diff(sc) >= 0)
    delta = np.array(shock) - base
    return {
        "mode": "SIMULATION",
        "airport": airport,
        "data_class": dataset,
        "seed": seed,
        "repetitions": repetitions,
        "capacity_reduction": reduction,
        "duration_minutes": duration,
        "baseline_mean_minutes": float(np.mean(base)),
        "scenario_mean_minutes": float(np.mean(shock)),
        "additional_delay_minutes": float(delta.mean()),
        "delta_p10_p90": np.quantile(delta, [0.1, 0.9]).tolist(),
        "downstream_mean_minutes": float(np.mean(propagated)),
        "peak_queue_aircraft": max(peak_queue),
        "chart": chart,
        "replication_deltas": delta.tolist(),
        "assumptions": [
            "150 uniform arrivals / 360min; one FCFS equivalent runway",
            "Lognormal service mean 1.8min, CV approximately 15%",
            "Shock starts at minute 60; baseline/scenario share random inputs",
            "Stylized connection slack uniform 20–60min; no real tail linkage",
            "Imported data supplies airport/network identity, not measured capacity",
            "No causal identification, operational validation or safety certification",
        ],
    }
