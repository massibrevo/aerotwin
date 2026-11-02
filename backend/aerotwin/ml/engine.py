"""Schedule-only T-120min regression; chronological splits and calibrated residual intervals."""

import hashlib
import json
from datetime import UTC, datetime

import joblib
import numpy as np
import pandas as pd
from aerotwin.config import MODELS
from aerotwin.data.store import load
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

FEATURES = ["origin", "dest", "carrier", "hour", "month", "dow", "distance"]
CAT = ["origin", "dest", "carrier"]
NUM = ["hour", "month", "dow", "distance"]


def prepare(frame):
    f = frame[~frame.cancelled & ~frame.diverted & frame.dep_delay.notna()].copy()
    f["issuance_utc"] = pd.to_datetime(f.scheduled_utc, utc=True) - pd.Timedelta(hours=2)
    # Target assumed available no earlier than actual departure + 24h, conservatively.
    f["label_available_utc"] = (
        pd.to_datetime(f.scheduled_utc, utc=True)
        + pd.to_timedelta(f.dep_delay.clip(lower=0), unit="min")
        + pd.Timedelta(hours=24)
    )
    return f.sort_values("issuance_utc").reset_index(drop=True)


def splits(f):
    if len(f) < 100:
        raise ValueError("At least 100 valid, noncancelled, nondiverted flights are required")
    cut1, cut2 = f.issuance_utc.iloc[int(len(f) * 0.6)], f.issuance_utc.iloc[int(len(f) * 0.8)]
    train = f[f.label_available_utc < cut1]
    val = f[(f.issuance_utc >= cut1) & (f.label_available_utc < cut2)]
    test = f[f.issuance_utc >= cut2]
    if min(len(train), len(val), len(test)) < 10:
        raise ValueError("Insufficient temporal coverage after the label-availability embargo")
    return train, val, test


def metric(y, pred):
    return {"mae": float(mean_absolute_error(y, pred)), "rmse": float(np.sqrt(mean_squared_error(y, pred)))}


def pipeline(estimator):
    prep = ColumnTransformer(
        [
            ("category", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT),
            ("numeric", StandardScaler(), NUM),
        ]
    )
    return make_pipeline(prep, estimator)


def train(dataset="synthetic"):
    f = prepare(load(dataset))
    tr, val, test = splits(f)
    candidates = {
        "historical_median": DummyRegressor(strategy="median"),
        "ridge": pipeline(Ridge(alpha=10)),
        "gradient_boosting": pipeline(
            HistGradientBoostingRegressor(
                max_iter=80, max_leaf_nodes=15, l2_regularization=10, random_state=42
            )
        ),
    }
    metrics = {}
    for name, model in candidates.items():
        model.fit(tr[FEATURES], tr.dep_delay)
        metrics[name] = {
            "validation": metric(val.dep_delay, model.predict(val[FEATURES])),
            "test": metric(test.dep_delay, model.predict(test[FEATURES])),
        }
    # Select only on validation, never on final test performance.
    name = min(["ridge", "gradient_boosting"], key=lambda n: metrics[n]["validation"]["mae"])
    model = candidates[name]
    residuals = np.abs(val.dep_delay.to_numpy() - model.predict(val[FEATURES]))
    q = float(np.quantile(residuals, min(1, np.ceil((len(val) + 1) * 0.9) / len(val)), method="higher"))
    pred = model.predict(test[FEATURES])
    report = {
        "model_id": dataset,
        "data_class": dataset,
        "selected_model": name,
        "label": "SYNTHETIC DEMO MODEL" if dataset == "synthetic" else "BTS IMPORT MODEL",
        "trained_at": datetime.now(UTC).isoformat(),
        "target": "departure_delay_minutes",
        "horizon_minutes": 120,
        "features": FEATURES,
        "metrics": metrics,
        "interval_radius": q,
        "interval_nominal_coverage": 0.9,
        "interval_test_coverage": float(np.mean(np.abs(test.dep_delay - pred) <= q)),
        "n": {k: len(v) for k, v in [("train", tr), ("validation", val), ("test", test)]},
        "windows": {
            k: [str(v.issuance_utc.min()), str(v.issuance_utc.max())]
            for k, v in [("train", tr), ("validation", val), ("test", test)]
        },
        "label_availability": "actual departure +24h; 2h issuance; conservative embargo",
        "dataset_sha256": hashlib.sha256(f.to_csv(index=False).encode()).hexdigest(),
        "validation_chart": [
            {"actual": float(a), "predicted": float(p)}
            for a, p in list(zip(test.dep_delay, pred))[:: max(1, len(test) // 100)]
        ],
        "caveat": "Residual intervals assume stable errors; temporal drift can invalidate 90% coverage.",
    }
    importance = permutation_importance(
        model, val[FEATURES], val.dep_delay, n_repeats=3, random_state=42, scoring="neg_mean_absolute_error"
    )
    report["global_permutation_importance"] = dict(zip(FEATURES, importance.importances_mean.tolist()))
    # Expanding origin evaluations with independent embargoed folds.
    report["rolling_origin"] = []
    for fraction in [0.5, 0.65, 0.8]:
        boundary = f.issuance_utc.iloc[int(len(f) * fraction)]
        past = f[f.label_available_utc < boundary]
        future = f[(f.issuance_utc >= boundary) & (f.issuance_utc < boundary + pd.Timedelta(days=14))]
        if len(past) >= 30 and len(future) >= 10:
            fold = pipeline(Ridge(alpha=10)).fit(past[FEATURES], past.dep_delay)
            report["rolling_origin"].append(
                {
                    "start": str(boundary),
                    "train_n": len(past),
                    "test_n": len(future),
                    **metric(future.dep_delay, fold.predict(future[FEATURES])),
                }
            )
    MODELS.mkdir(exist_ok=True)
    joblib.dump({"model": model, "radius": q, "report": report}, MODELS / f"{dataset}.joblib")
    (MODELS / f"{dataset}.json").write_text(json.dumps(report, indent=2))
    return report


def reports():
    return [
        json.loads(p.read_text()) for p in sorted(MODELS.glob("*.json")) if p.stem in ("synthetic", "bts")
    ]


def predict(model_id, values):
    if model_id not in ("synthetic", "bts") or not (MODELS / f"{model_id}.joblib").exists():
        raise ValueError("Model not trained; run python -m aerotwin.cli train --dataset " + model_id)
    # Only our fixed local artifacts are ever loaded. No uploaded/user-selected model paths.
    artifact = joblib.load(MODELS / f"{model_id}.joblib")
    value = float(artifact["model"].predict(pd.DataFrame([values])[FEATURES])[0])
    q = artifact["radius"]
    return {
        "prediction_minutes": value,
        "interval_minutes": [value - q, value + q],
        "nominal_coverage": 0.9,
        "horizon_minutes": 120,
        "model_id": model_id,
        "data_class": model_id,
        "label": artifact["report"]["label"],
        "caveat": artifact["report"]["caveat"],
    }
