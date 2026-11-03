"""Schedule-only T-120min regression; chronological splits and calibrated residual intervals."""

import hashlib
import json
import re
import uuid
from datetime import UTC, datetime

import joblib
import numpy as np
import pandas as pd
from aerotwin.config import MODELS
from aerotwin.data.store import load, dataset_revision
from aerotwin.storage import record
import sklearn
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
    revision = dataset_revision(dataset)
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
        "format_version": 2,
        "dataset_revision": revision,
        "sklearn_version": sklearn.__version__,
        "support": {
            "origins": sorted(tr.origin.unique().tolist()),
            "destinations": sorted(tr.dest.unique().tolist()),
            "carriers": sorted(tr.carrier.unique().tolist()),
            "routes": sorted({f"{o}-{d}" for o, d in zip(tr.origin, tr.dest)}),
            "numeric_ranges": {k: [float(tr[k].min()), float(tr[k].max())] for k in NUM},
        },
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
    report["subgroup_test_metrics"] = {
        str(origin): {"n": int(mask.sum()), **metric(test.dep_delay[mask], pred[mask])}
        for origin in sorted(test.origin.unique())
        for mask in [test.origin.to_numpy() == origin]
    }
    if dataset_revision(dataset) != revision:
        raise ValueError("Dataset changed during training. Retry against the current import.")
    MODELS.mkdir(parents=True, exist_ok=True)
    artifact_name = f"{dataset}-{uuid.uuid4().hex}.joblib"
    artifact_path = MODELS / artifact_name
    joblib.dump({"model": model, "radius": q, "report": report}, artifact_path)
    report["artifact"] = artifact_name
    report["artifact_sha256"] = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    pending = MODELS / f"{artifact_name}.tmp"
    pending.write_text(json.dumps(report, indent=2), encoding="utf-8")
    pending.replace(MODELS / f"{dataset}.json")
    record(
        "training",
        {
            k: report[k]
            for k in [
                "model_id",
                "trained_at",
                "selected_model",
                "n",
                "metrics",
                "dataset_revision",
                "artifact_sha256",
            ]
        },
    )
    return report


def reports():
    return [
        json.loads(p.read_text()) for p in sorted(MODELS.glob("*.json")) if p.stem in ("synthetic", "bts")
    ]


def model_report(model_id):
    if model_id not in ("synthetic", "bts") or not (MODELS / f"{model_id}.json").exists():
        raise ValueError("Model not trained. Train the selected dataset from Data & experiments.")
    report = json.loads((MODELS / f"{model_id}.json").read_text())
    if report.get("format_version") != 2:
        raise ValueError("Legacy model artifact. Retrain from Data & experiments or bootstrap.")
    if not re.fullmatch(model_id + r"-[a-f0-9]{32}\.joblib", report.get("artifact", "")):
        raise ValueError("Invalid local model manifest. Retrain the model.")
    return report


def checked_artifact(report):
    path = MODELS / report["artifact"]
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != report["artifact_sha256"]:
        raise ValueError("Model integrity check failed. Retrain using trusted local data.")
    return path


def validated_model(model_id):
    report = model_report(model_id)
    if report["dataset_revision"] != dataset_revision(model_id):
        raise ValueError("Model is stale: dataset changed. Retrain before predicting.")
    if report["sklearn_version"] != sklearn.__version__:
        raise ValueError("Scientific dependencies changed. Retrain before predicting.")
    path = checked_artifact(report)
    return report, path


def predict(model_id, values):
    report, path = validated_model(model_id)
    support = report["support"]
    if values["origin"] not in support["origins"] or values["dest"] not in support["destinations"]:
        raise ValueError("Airport outside the model's training support")
    if values["carrier"] not in support["carriers"]:
        raise ValueError("Carrier outside the model's training support")
    warnings = [report["caveat"]]
    if f"{values['origin']}-{values['dest']}" not in support["routes"]:
        warnings.append("This route was not observed in training; extrapolation may be unreliable.")
    for key, (low, high) in support["numeric_ranges"].items():
        if not low <= values[key] <= high:
            warnings.append(f"{key} is outside training range [{low:g}, {high:g}].")
    # Checksums detect damage, not malicious pickle replacement. Never accept uploaded models.
    artifact = joblib.load(path)
    value = float(artifact["model"].predict(pd.DataFrame([values])[FEATURES])[0])
    q = artifact["radius"]
    return {
        "prediction_minutes": value,
        "interval_minutes": [value - q, value + q],
        "nominal_coverage": 0.9,
        "horizon_minutes": 120,
        "model_id": model_id,
        "data_class": model_id,
        "label": report["label"],
        "caveat": report["caveat"],
        "warnings": warnings,
        "dataset_revision": report["dataset_revision"],
    }
