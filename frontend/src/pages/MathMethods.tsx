import { Link } from "react-router-dom";
import { Panel } from "../components/UI";
export default function MathMethods() {
  const sections = [
    [
      "Samples and denominators",
      "Eₚ = noncancelled, nondiverted flights with delay labels in P\nCancellation rate = cancelled / all rows\nDelay ≥15 min rate = count(y ≥ 15 in Eₚ) / |Eₚ|",
      "Missing denominators remain unavailable. Period dates are inclusive and do not overlap.",
    ],
    [
      "Period comparisons",
      "Δraw = mean(yB) − mean(yA)\nwg = nA,g / Σh∈G nA,h\nΔstd = Σg∈G wg [mean(yB,g) − mean(yA,g)]",
      "Shared groups require ≥30 labels in both periods. A-label coverage is shown. Standardisation is descriptive, not causal.",
    ],
    [
      "Forecast error",
      "MAE = (1/n) Σ |ŷᵢ − yᵢ|\nRMSE = √[(1/n) Σ (ŷᵢ − yᵢ)²]\nBias = (1/n) Σ (ŷᵢ − yᵢ)\nImprovement = MAEbaseline − MAEmodel",
      "Positive bias means overprediction; positive improvement means lower model error. Validation chooses the estimator, never final test results.",
    ],
    [
      "Temporal leakage prevention",
      "issueᵢ = scheduledᵢ − 120 min\navailableᵢ = scheduledᵢ + max(0, delayᵢ) + 24 h\nTrain: available < b₁\nValidation: issue ≥ b₁ and available < b₂\nTest: issue ≥ b₂",
      "b₁/b₂ are chronological 60%/80% issuance boundaries. Embargoes change final sample proportions.",
    ],
    [
      "Residual interval",
      "rᵢ = |yᵢ − ŷᵢ| on validation\np* = min(1, ceil((m+1)·0.9) / m)\nq = quantile_higher(r, p*)\nI(x) = [f(x) − q, f(x) + q]",
      "The full appendix defines NumPy's order-statistic convention. Time dependence and drift prevent guaranteed coverage.",
    ],
    [
      "Coverage uncertainty",
      "p̂ = covered / n; z = 1.95996398454\na = (p̂ + z²/(2n)) / (1 + z²/n)\nb = z √[p̂(1−p̂)/n + z²/(4n²)] / (1 + z²/n)\nWilson 95% = [max(0,a−b), min(1,a+b)]",
      "This assumes independent flight outcomes and can be too narrow for correlated delays. It is not an individual prediction interval.",
    ],
    [
      "Paired date-block bootstrap",
      "D*b = Σj∈Sb (baseline_error_sumⱼ − model_error_sumⱼ) / Σj∈Sb nⱼ\nCI95 = [quantile₀.₀₂₅(D*), quantile₀.₉₇₅(D*)]",
      "500 seeded resamples of whole schedule dates; unavailable below 5 dates. Daily blocks must be exchangeable. This evaluates fixed models, not retraining uncertainty.",
    ],
    [
      "Input shift and sensitivity",
      "TV(p,q) = ½ Σk |pk − qk|\nδk(x) = f(x with feature k replaced by training reference) − f(x)",
      "TV measures input-frequency differences, not proof of performance drift. Single-feature prediction changes are not additive contributions or causal effects.",
    ],
    [
      "Simulation",
      "Bᵢ = max(Aᵢ, Cᵢ₋₁); Wᵢ = Bᵢ − Aᵢ\n∫ from Bᵢ to Cᵢ μ(t) dt = service_workᵢ\nPropagationᵢ = max(0, Wscenarioᵢ − Wbaselineᵢ − slackᵢ)",
      "A fixed 150 uniform arrivals over 360 minutes and lognormal service form a stylised FCFS queue. Paired scenarios share random draws. Replication P10/P90 are not confidence bounds.",
    ],
  ];
  return (
    <div className="methodology">
      <Panel title="Mathematical methods">
        <p>
          The formulas below describe the implemented calculations, with units
          and assumptions. They are not an operational aviation model.{" "}
          <a
            href="https://github.com/massibrevo/aerotwin/blob/main/docs/mathematical-methods.md"
            target="_blank"
            rel="noreferrer"
          >
            Read the complete mathematical appendix ↗
          </a>{" "}
          for quantiles, network equations, simulation distributions, geometry,
          units and code references.
        </p>
        <p>
          <Link to="/analytics">Analytics studio</Link> ·{" "}
          <Link to="/forecast">Forecast lab</Link> ·{" "}
          <Link to="/about">Methodology and sources</Link>
        </p>
      </Panel>
      {sections.map(([title, equation, caveat]) => (
        <Panel title={title} key={title}>
          <pre className="math-equation">{equation}</pre>
          <p>{caveat}</p>
        </Panel>
      ))}
    </div>
  );
}
