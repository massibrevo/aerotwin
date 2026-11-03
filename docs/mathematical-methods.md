# Mathematical methods · AeroTwin

This appendix describes the implemented calculations, not an operational aviation model. Symbols, units, sample populations and code paths are specified so results can be reproduced. Synthetic examples are not evidence of real aviation forecasting skill.

## 1. Samples, exclusions and time

For schedule row i, let yᵢ be departure delay in minutes (negative = early), cᵢ the cancellation flag, dᵢ the diversion flag and ℓᵢ the indicator that the delay label exists. The eligible labelled set in period P is

$$E_P=\{i:t_i\in P,\ c_i=0,\ d_i=0,\ \ell_i=1\},\qquad n_P=|E_P|.$$

Cancellation rate uses **all** schedule rows Nₚ; delay rates use nₚ. A missing denominator produces an unavailable result, never zero:

$$\widehat p_{cancel,P}=\frac{\sum_{i\in P}c_i}{N_P},\qquad \widehat p_{15,P}=\frac{\sum_{i\in E_P}\mathbf1[y_i\ge15]}{n_P}.$$

Eligible missing labels count noncancelled, nondiverted rows with ℓᵢ=0. Full-dataset missing-label counts include every row. Period dates are inclusive and ordered: A_start ≤ A_end < B_start ≤ B_end. Defaults split distinct schedule dates in half, not equal flight counts.

## 2. Descriptive statistics and comparison

$$\bar y_P=\frac1{n_P}\sum_{i\in E_P}y_i,\qquad \Delta_{raw}=\bar y_B-\bar y_A.$$

Positive Δraw means greater mean delay in B. Median/P90 use linearly interpolated empirical quantiles. For sorted observations x₍₁₎…x₍ₙ₎:

$$h=(n-1)p,\quad j=\lfloor h\rfloor,\quad a=h-j,\quad Q_p=(1-a)x_{(j+1)}+a x_{(\min(j+2,n))}.$$

P90 is a distribution percentile, **not** a confidence bound.

Histograms count eligible labels in [−∞,0), [0,15), [15,30), [30,60), [60,120), [120,∞). Counts are not normalised; unequal period sizes require rates/sample counts for interpretation.

For carrier, origin, destination or route group g, retain shared groups G with at least 30 eligible labels in each period. Use A's labelled-flight mix:

$$w_g=\frac{n_{A,g}}{\sum_{h\in G}n_{A,h}},\qquad \Delta_{std}=\sum_{g\in G}w_g(\bar y_{B,g}-\bar y_{A,g}),\qquad C_A=\frac{\sum_{g\in G}n_{A,g}}{n_A}.$$

Coverage Cₐ is displayed because restricted shared groups may not represent all flights. If G is empty, Δstd is unavailable. This is descriptive standardisation, not a causal adjustment or an estimate of an intervention. The regression test changes carrier mix so Δraw=17 min while every within-group difference is 2 min; the implementation recovers Δstd=2 min.

Code: [comparison.py](../backend/aerotwin/analytics/comparison.py).

## 3. Forecast inputs and temporal leakage prevention

The input vector contains only scheduled origin, destination, carrier, local hour, month, weekday and distance (statute miles in the API). Categories use training-fitted one-hot encoding; numerical fields use training-fitted standardisation. Unknown categories can be encoded, but prediction entry points reject unknown airports/carriers and warn about unseen routes or numeric extrapolation.

$$t_i^{issue}=t_i^{scheduled}-120\,\mathrm{min},\qquad t_i^{available}=t_i^{scheduled}+\max(0,y_i)\,\mathrm{min}+24\,\mathrm{h}.$$

Rows are sorted by issuance. Let b₁ and b₂ be issuance timestamps at the 60% and 80% row positions. Training requires availability < b₁. Validation requires issuance ≥ b₁ and availability < b₂. Test requires issuance ≥ b₂. Embargoes remove rows, so final counts need not equal exact 60/20/20 shares. Realised delays are labels, not inputs; future weather, actual arrival information and delay causes do not enter features.

The training historical-median baseline is constant. Ridge minimises squared training error plus α‖β‖² with α=10 after preprocessing. Histogram gradient boosting uses the configured finite ensemble; it does not model physical airport dynamics. The selected learned estimator minimises **validation MAE** over ridge and gradient boosting; final test results never choose the model. A worse result than the median baseline remains visible.

For numerical training feature k, StandardScaler uses training mean and population standard deviation (ddof=0):

$$z_{ik}=\frac{x_{ik}-\bar x_{train,k}}{\sqrt{n_{train}^{-1}\sum_{j\in train}(x_{jk}-\bar x_{train,k})^2}}.$$

A zero-variance numerical feature uses scale 1. Categorical one-hot columns are not scaled. For the resulting encoded vector z:

$$f_{median}(x)=\operatorname{median}_{i\in train}y_i,\qquad (\hat b,\hat\beta)=\arg\min_{b,\beta}\left[\sum_{i\in train}(y_i-b-z_i^T\beta)^2+10\lVert\beta\rVert_2^2\right].$$

The ridge intercept is not penalised. Gradient boosting has additive form

$$f_M(x)=f_0(x)+\eta\sum_{m=1}^{M}h_m(x),\qquad \eta=0.1,\quad M\le80.$$

The implementation uses histogram trees with at most 15 leaves, L2 leaf regularisation 10 and seed 42. Scikit-learn's default internal early stopping can apply on larger training sets; it remains inside the training partition. External chronological validation still selects ridge versus boosting; no final test result is used for selection.

$$MAE=\frac1n\sum_i|\hat y_i-y_i|,\quad RMSE=\sqrt{\frac1n\sum_i(\hat y_i-y_i)^2},\quad Bias=\frac1n\sum_i(\hat y_i-y_i).$$

Residual is prediction minus observation: positive bias means overprediction. Median/P90 absolute error are quantiles of |ŷ−y|. MAE improvement against baseline is D=MAE_baseline−MAE_model, so positive means lower model error.

## 4. Residual prediction interval

For m validation residual magnitudes rᵢ=|yᵢ−ŷᵢ|, the actual implementation uses

$$p^*=\min\left(1,\frac{\lceil(m+1)0.9\rceil}{m}\right),\qquad q=Q_{p^*}^{higher}(r),\qquad I(x)=[f(x)-q,f(x)+q].$$

Here NumPy's `higher` quantile chooses one-based order statistic 1+ceil((m−1)p*). This can be one order statistic more conservative than selecting the canonical conformal rank directly. It is important to reproduce the implemented quantile convention rather than silently change it. This is a symmetric empirical residual interval; dependence/drift invalidate an unconditional coverage guarantee.

$$\widehat c=\frac1n\sum_i\mathbf1[|y_i-\hat y_i|\le q].$$

Measured test coverage is a frequency on held-out observations, not the probability that any particular flight lies inside its interval.

## 5. Coverage uncertainty: Wilson interval

For s covered outcomes among n test rows, p̂=s/n and z=1.95996398454:

$$a=\frac{\widehat p+z^2/(2n)}{1+z^2/n},\qquad b=\frac{z\sqrt{\widehat p(1-\widehat p)/n+z^2/(4n^2)}}{1+z^2/n},\qquad CI=[\max(0,a-b),\min(1,a+b)].$$

Endpoints are clamped to exact 0/1 for all-failure/all-success cases. The interval assumes independent Bernoulli outcomes; correlated flight delays can make it too narrow. It is not a second prediction interval and does not prove calibration for future flights.

## 6. Paired date-block bootstrap against baseline

For each held-out schedule date j (the source origin-local schedule date), store flight count nⱼ and total absolute errors Aⱼ (selected model) and Bⱼ (training-median baseline). Resample J whole dates with replacement, preserving model/baseline pairing and within-date observations. For each of 500 replicates (seed 42):

$$D^{*(b)}=\frac{\sum_{j\in S_b}(B_j-A_j)}{\sum_{j\in S_b}n_j},\qquad CI_{95}=[Q_{.025}(D^*),Q_{.975}(D^*)].$$

The result is flight-weighted, not an unweighted average of daily MAEs. Below five test dates the interval is unavailable. It assumes exchangeable date blocks; cross-date serial correlation and few blocks reduce reliability. Models are held fixed: this does not include uncertainty from retraining, feature selection, hyperparameter search or future regime changes. An interval crossing zero does not establish a clear improvement under this scheme.

## 7. Subgroups and distribution shift

Origin/carrier subgroup MAE, bias and coverage use only the subgroup's held-out rows; n<30 is flagged and hidden by default. The threshold is a display rule, not a power calculation or evidence of adequate reliability. Group metrics are descriptive, not fairness guarantees or post-test tuning targets.

For categorical feature levels k and train/test relative frequencies pₖ,qₖ:

$$TV(p,q)=\frac12\sum_k|p_k-q_k|.$$

TV ranges from 0 (same frequencies) to 1 (disjoint support). Unseen test rows count levels absent from training. Numeric support checks count x outside the training min/max range. These measure input/covariate shift, **not** proven error/performance drift. Calendar variables naturally change across temporal splits.

Code: [diagnostics.py](../backend/aerotwin/analytics/diagnostics.py).

## 8. Predictive sensitivity, not causality

Global permutation importance on validation rows is the increase in MAE after shuffling one feature. The mean and spread across three seeded repeats are model/data-dependent and are not causal effects.

For a particular input x, replace feature k by training reference rₖ (modal categorical/calendar value, median distance), holding all others fixed:

$$\delta_k(x)=f(x_{-k},r_k)-f(x).$$

The app actually recomputes these predictions. Replacements producing equal origin/destination are omitted. Other combinations may be unsupported and are explicitly caveated. δₖ values do not sum to the original prediction and are not SHAP values, probabilities or effects of operational interventions.

Code: [engine.py](../backend/aerotwin/ml/engine.py).

## 9. Directed network description

Schedule-route counts form directed edge weights wᵤᵥ. Traffic Tᵥ is weighted in-degree plus weighted out-degree; each flight contributes to both endpoints. Unweighted directed shortest paths define normalised betweenness (n>2):

$$BC(v)=\frac1{(n-1)(n-2)}\sum_{s\ne t,\;s,t\ne v}\frac{\sigma_{st}(v)}{\sigma_{st}},\qquad R_v=\frac{T_v}{\sum_uT_u}(1+BC(v)).$$

Unreachable source/target pairs contribute zero. Rᵥ is a descriptive index. Neither weights nor betweenness identify actual disruption propagation or causal vulnerability.

## 10. Paired discrete-event queue simulation

A replication draws 150 sorted arrivals uniformly over 360 minutes. Service work S is lognormal with σ=0.15 and μ=ln(1.8)−σ²/2, giving E[S]=1.8 minutes and CV=√(exp(σ²)−1)≈15%. This fixed-count uniform-arrival model is **not** an M/M/1 queue or an inferred operational capacity.

For FCFS service, Bᵢ=max(Aᵢ,Cᵢ₋₁), waiting Wᵢ=Bᵢ−Aᵢ. Work rate μ(t) is 1 normally and 1−r during [60,60+duration); completion satisfies

$$\int_{B_i}^{C_i}\mu(t)\,dt=S_i.$$

Changes apply to work already in progress. Baseline and scenario use identical arrivals/services. Per-replication change is mean(W_scenario)−mean(W_baseline). Displayed P10/P90 are empirical replication quantiles, **not** a confidence interval for the mean.

Stylised connection slack L~Uniform(20,60) minutes yields Pᵢ=max(0,Wᵢˢ−Wᵢᵇ−Lᵢ). No actual aircraft rotation is established. Peak in-system count includes aircraft waiting **and being served**, evaluated at arrival times; it is not waiting-only queue length.

Code: [simulation/engine.py](../backend/aerotwin/simulation/engine.py).

## 11. Geometry, units and displayed movement

For coverage radius r nautical miles, angular radius is α=1.852r/6371 on a spherical Earth. The ring samples destination points at 96 bearings. This approximation is a map aid, not navigation geometry. Longitude transitions use the shortest wrapped angular difference. Latitude display is clamped to ±85° for the Mercator map.

Exact physical conversions: 1 ft=0.3048 m; 1 NM=1852 m; 1 statute mile=1609.344 m; 1 kt=1.852 km/h; 1 ft/min=0.3048/60 m/s. Rounded UI numbers never replace stored observations or model inputs. Display-only transitions interpolate between received positions; they do not create observations, verified tracks or training data. METAR weather displayed on airport pages is not injected into historical T−120 model features.

## Reproduction and interpretation

Use the model report's dataset revision, split windows, feature list, dependency version, source class and seed. Import authentic data before claiming real-data performance. [Usage and limitations](intelligence-v0.4.md), [model card](model-card.md), [verification](evaluation-v0.4.md). These formulas describe software behavior under stated assumptions; they do not certify dispatch, ATC, navigation or safety decisions.
