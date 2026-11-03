import { Link } from "react-router-dom";
import { Radio, Layers, FlaskConical, GitBranch } from "lucide-react";
import { Panel } from "../components/UI";
export default function About() {
  return (
    <div className="methodology">
      <p>
        <Link to="/math">
          Mathematical appendix: formulas and assumptions →
        </Link>
      </p>
      <Panel title="A transparent twin, built for learning">
        <p>
          AeroTwin connects observations, schedule analytics, temporal machine
          learning and hypothetical queues in one local research workspace. Each
          layer keeps its provenance and uncertainty visible. It is not
          certified for dispatch, air traffic control or safety decisions.
        </p>
        <div className="method-grid">
          <div>
            <Radio />
            <h3>01 / Observe</h3>
            <p>
              Live ADSB.lol positions are community observations, with partial
              coverage and delayed reports. Callsigns cannot establish verified
              routes, destinations or flight delays. Position timestamps derive
              from position age at receipt.
            </p>
          </div>
          <div>
            <Layers />
            <h3>02 / Reconstruct</h3>
            <p>
              Official BTS files are imported explicitly. Local scheduled times
              are converted using airport IANA timezones. Unknown zones and
              ambiguous DST times are rejected. Cancelled and diverted rows
              remain in analytics and are excluded from model training.
            </p>
          </div>
          <div>
            <FlaskConical />
            <h3>03 / Forecast</h3>
            <p>
              At T−120 minutes, only schedule features are available. The model
              learns departure delay from chronological training rows, validates
              on a later interval, and evaluates once on a final holdout. A
              conservative 24-hour label availability rule creates an embargo at
              each boundary.
            </p>
          </div>
          <div>
            <GitBranch />
            <h3>04 / Stress test</h3>
            <p>
              A single-server first-come, first-served queue uses identical
              random arrivals and service requirements for paired baseline and
              shock runs. A capacity reduction slows service during a bounded
              event. Downstream links use explicitly stylized slack rather than
              invented real aircraft rotations.
            </p>
          </div>
        </div>
      </Panel>
      <Panel title="Metrics, uncertainty & limitations">
        <p>
          <b>MAE</b> = mean |y − ŷ|. <b>RMSE</b> = √mean (y − ŷ)². A
          historical-median baseline and ridge regression are measured alongside
          gradient boosting. Model selection uses validation MAE, never final
          test error.
        </p>
        <p>
          The prediction interval is ŷ ± q, where q is a finite-sample corrected
          90th percentile of absolute validation residuals. Time dependence
          violates exchangeability: this is an empirical uncertainty estimate,
          with measured test coverage, and no guaranteed coverage under drift.
        </p>
        <p>
          Permutation importance measures the increase in validation MAE after
          shuffling one feature. It describes global predictive sensitivity, not
          a cause of any flight’s delay. Network betweenness is based on
          unweighted shortest paths; the descriptive risk index multiplies
          traffic share by one plus betweenness.
        </p>
        <p>
          The bundled flights and replay positions are deterministic synthetic
          examples at a fixed 2025 epoch. There is no real BTS benchmark until
          you import official data and train a separate model. The simulator
          assumes uniform demand and an equivalent runway with lognormal
          service; it omits weather, sector restrictions, fleets and validated
          tail rotation.
        </p>
      </Panel>
      <Panel title="Period comparisons and model diagnostics">
        <p>
          Analytics studio compares non-overlapping schedule periods. Delay
          statistics exclude cancelled/diverted and missing labels; cancellation
          rates use all rows. Mix-standardisation uses A's labelled-flight
          weights for shared groups with at least 30 labels per period. Coverage
          is shown. Neither raw nor standardised changes identify causal
          effects.
        </p>
        <p>
          Forecast diagnostics use the final holdout. A 500-resample paired
          date-block bootstrap compares MAE with the training-median baseline;
          it assumes exchangeable date blocks. Wilson coverage intervals assume
          independent flights and can be too narrow under correlation. Subgroup
          metrics and category distribution shifts are descriptive; input shift
          does not establish performance drift. Per-flight sensitivity replaces
          one feature at a time with a training reference, recomputing the
          model: changes are neither additive nor causal.
        </p>
        <p>
          HexDB manufacturer/model and registered-owner details are optional
          database references. Callsign route records may be old or reused; they
          are labelled unverified for the selected observation, with source
          dates. Missing metadata stays unknown.
        </p>
      </Panel>
      <Panel title="Open data, offline by design">
        <p>
          Code and seeded examples: MIT. Offline basemap: Natural Earth public
          domain. Live observations: ADSB.lol / ODbL; respect attribution and
          database redistribution obligations. Optional online map: OpenFreeMap
          and OpenStreetMap contributors. No tile bulk caching. No weather, GNN,
          LLM, paid service or telemetry dependency.
        </p>
        <p>
          See the repository’s methodology, datasets-and-licenses, evaluation
          and troubleshooting guides for the full reproducibility workflow and
          implementation tradeoffs.
        </p>
      </Panel>
    </div>
  );
}
