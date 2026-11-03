"""Deterministic examples, strict BTS import, and parameterized local analytics."""

import hashlib
import json
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import duckdb
import numpy as np
import pandas as pd
from aerotwin.config import AIRPORTS, DATA

COLUMNS = [
    "flight_id",
    "date",
    "carrier",
    "origin",
    "dest",
    "hour",
    "month",
    "dow",
    "distance",
    "dep_delay",
    "cancelled",
    "diverted",
    "scheduled_utc",
]


def generate(seed=42, days=120, per_day=32):
    rng = np.random.default_rng(seed)
    rows = []
    us = ["ATL", "JFK", "ORD", "LAX", "DFW"]
    for day in range(days):
        date = datetime(2025, 1, 1, tzinfo=UTC) + timedelta(days=day)
        for j in range(per_day):
            origin, dest = rng.choice(us, size=2, replace=False)
            hour = int(rng.integers(5, 24))
            distance = float(rng.integers(200, 2600))
            delay = round(
                max(
                    -15,
                    3
                    + (hour - 5) * 1.3
                    + (origin == "JFK") * 9
                    + (date.weekday() == 4) * 7
                    + rng.normal(0, 9),
                ),
                1,
            )
            local = datetime(
                date.year,
                date.month,
                date.day,
                hour,
                j % 60,
                tzinfo=ZoneInfo(next(a["tz"] for a in AIRPORTS if a["iata"] == origin)),
            )
            rows.append(
                [
                    f"SYN-{day:03}-{j:02}",
                    date.date().isoformat(),
                    str(rng.choice(["AA", "DL", "UA"])),
                    origin,
                    dest,
                    hour,
                    date.month,
                    date.weekday(),
                    distance,
                    delay,
                    False,
                    False,
                    local.astimezone(UTC).isoformat(),
                ]
            )
    frame = pd.DataFrame(rows, columns=COLUMNS).sort_values("scheduled_utc").reset_index(drop=True)
    path = DATA / "demo" / "flights.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)
    return frame


def provenance():
    root = DATA / "processed" / "bts"
    current = root / "current.json"
    legacy = root / "provenance.json"
    if current.exists():
        return json.loads(current.read_text())
    return json.loads(legacy.read_text()) if legacy.exists() else None


def parquet_files():
    meta = provenance()
    root = DATA / "processed" / "bts"
    if meta and meta.get("snapshot_id"):
        snapshot_id = meta["snapshot_id"]
        if not re.fullmatch(r"[a-f0-9]{32}", snapshot_id):
            raise ValueError("Invalid local dataset manifest")
        return sorted((root / "snapshots" / snapshot_id).glob("year=*/month=*/*.parquet"))
    return [root / "flights.parquet"] if (root / "flights.parquet").exists() else []


def dataset_revision(dataset):
    if dataset == "bts":
        meta = provenance()
        if not meta:
            raise ValueError("No BTS dataset. Import an official CSV first.")
        return meta.get("snapshot_id", meta["input_sha256"])
    path = DATA / "demo" / "flights.csv"
    if not path.exists():
        generate()
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(dataset="synthetic"):
    if dataset == "bts":
        files = parquet_files()
        if not files:
            raise ValueError("No BTS dataset. Import an official CSV first.")
        with duckdb.connect() as db:
            return db.read_parquet([str(p) for p in files], hive_partitioning=False).df()
    path = DATA / "demo" / "flights.csv"
    if not path.exists():
        generate()
    return pd.read_csv(path).sort_values("scheduled_utc").reset_index(drop=True)


def ingest_bts(path: Path, timezone_map=None):
    raw = pd.read_csv(path, low_memory=False)
    raw.columns = raw.columns.str.strip().str.upper()
    aliases = {
        "FL_DATE": "FLIGHTDATE",
        "OP_UNIQUE_CARRIER": "REPORTING_AIRLINE",
        "OP_CARRIER": "REPORTING_AIRLINE",
        "CRS_DEP_TIME": "CRSDEPTIME",
        "DEP_DELAY": "DEPDELAY",
        "OP_CARRIER_FL_NUM": "FLIGHT_NUMBER_REPORTING_AIRLINE",
    }
    for old, new in aliases.items():
        if old in raw.columns and new not in raw.columns:
            raw = raw.rename(columns={old: new})
    required = {
        "FLIGHTDATE",
        "REPORTING_AIRLINE",
        "ORIGIN",
        "DEST",
        "CRSDEPTIME",
        "DEPDELAY",
        "CANCELLED",
        "DIVERTED",
        "DISTANCE",
        "FLIGHT_NUMBER_REPORTING_AIRLINE",
    }
    if raw.columns.duplicated().any():
        raise ValueError("Duplicate CSV column names are not supported")
    if required - set(raw.columns):
        raise ValueError(f"Missing BTS columns: {sorted(required - set(raw.columns))}")
    zones = {a["iata"]: a["tz"] for a in AIRPORTS} | (timezone_map or {})
    unknown = set(raw.ORIGIN.dropna()) - zones.keys()
    if unknown:
        raise ValueError(f"Provide --timezone-map JSON with IANA zones for: {sorted(unknown)}")
    rows = []
    for record in raw.to_dict("records"):
        r = record
        if not all(isinstance(r[k], str) and len(r[k]) == 3 and r[k].isalpha() for k in ["ORIGIN", "DEST"]):
            raise ValueError("Origin/destination must be three-letter IATA identifiers")
        date = pd.to_datetime(r["FLIGHTDATE"], errors="raise").to_pydatetime().replace(tzinfo=None)
        if pd.isna(r["FLIGHT_NUMBER_REPORTING_AIRLINE"]):
            raise ValueError("Flight number is required for a stable deduplication key")
        carrier = r["REPORTING_AIRLINE"]
        if not isinstance(carrier, str) or not 2 <= len(carrier) <= 3 or not carrier.isalnum():
            raise ValueError("Carrier must be a two/three-character code")
        if not pd.isna(r["DEPDELAY"]) and not np.isfinite(float(r["DEPDELAY"])):
            raise ValueError("Delay must be finite or null")
        schedule = float(r["CRSDEPTIME"])
        if not np.isfinite(schedule) or not schedule.is_integer():
            raise ValueError("Scheduled HHMM must be an integer")
        t = int(schedule)
        if t != 2400 and not (0 <= t <= 2359 and t % 100 < 60):
            raise ValueError(f"Invalid scheduled HHMM: {t}")
        local = date + timedelta(
            days=t == 2400, hours=0 if t == 2400 else t // 100, minutes=0 if t == 2400 else t % 100
        )
        # Pandas rejects ambiguous/nonexistent DST wall times instead of inventing an instant.
        utc = (
            pd.Timestamp(local)
            .tz_localize(zones[r["ORIGIN"]], ambiguous="raise", nonexistent="raise")
            .tz_convert("UTC")
        )
        cancel, divert = float(r["CANCELLED"]), float(r["DIVERTED"])
        if cancel not in (0, 1) or divert not in (0, 1):
            raise ValueError("Cancelled/diverted flags must be 0 or 1")
        distance = float(r["DISTANCE"])
        if not np.isfinite(distance) or distance <= 0:
            raise ValueError("Distance must be finite and positive")
        key = "|".join(
            str(r[k])
            for k in [
                "FLIGHTDATE",
                "REPORTING_AIRLINE",
                "FLIGHT_NUMBER_REPORTING_AIRLINE",
                "ORIGIN",
                "DEST",
                "CRSDEPTIME",
            ]
        )
        rows.append(
            [
                hashlib.sha256(key.encode()).hexdigest()[:20],
                local.date().isoformat(),
                r["REPORTING_AIRLINE"],
                r["ORIGIN"],
                r["DEST"],
                local.hour,
                local.month,
                local.weekday(),
                distance,
                None if cancel or pd.isna(r["DEPDELAY"]) else float(r["DEPDELAY"]),
                bool(cancel),
                bool(divert),
                utc.isoformat(),
            ]
        )
    frame = pd.DataFrame(rows, columns=COLUMNS).drop_duplicates("flight_id")
    if frame.empty:
        raise ValueError("CSV has no flight rows")
    dest = DATA / "processed" / "bts"
    dest.mkdir(parents=True, exist_ok=True)
    # Immutable monthly partitions become visible together via one atomic manifest switch.
    snapshot_id = uuid.uuid4().hex
    snapshot = dest / "snapshots" / snapshot_id
    for (year, month), partition in frame.groupby([frame.date.str[:4], frame.date.str[5:7]]):
        folder = snapshot / f"year={year}" / f"month={month}"
        folder.mkdir(parents=True, exist_ok=True)
        partition.sort_values("scheduled_utc").to_parquet(folder / "flights.parquet", index=False)
    report = {
        "source": "BTS-schema user import (source authenticity unverified)",
        "snapshot_id": snapshot_id,
        "storage": "immutable monthly Parquet partitions",
        "data_class": "user_import",
        "rows": len(frame),
        "duplicates_removed": len(raw) - len(frame),
        "null_delay": int(frame.dep_delay.isna().sum()),
        "cancelled": int(frame.cancelled.sum()),
        "diverted": int(frame.diverted.sum()),
        "input_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "imported_at": datetime.now(UTC).isoformat(),
        "coverage": [frame.date.min(), frame.date.max()],
        "timezone_map": zones,
    }
    pending = dest / f"{snapshot_id}.tmp"
    pending.write_text(json.dumps(report, indent=2), encoding="utf-8")
    pending.replace(dest / "current.json")
    from aerotwin.storage import record

    record("import", report)
    return report


def query(dataset="synthetic", search="", origin="", start="", end="", page=1, page_size=50):
    if start and end and start > end:
        raise ValueError("Start date must be on or before end date")
    if not 1 <= page_size <= 500 or page < 1:
        raise ValueError("Invalid page size or page")
    sql = "SELECT * FROM flights WHERE 1=1"
    params = []
    for clause, value in [
        (" AND (flight_id ILIKE ? OR carrier ILIKE ? OR dest ILIKE ?)", search),
        (" AND origin = ?", origin),
        (" AND date >= ?", start),
        (" AND date <= ?", end),
    ]:
        if value:
            sql += clause
            params.extend([f"%{value}%"] * 3 if "ILIKE" in clause else [value])
    with duckdb.connect() as db:
        if dataset == "bts":
            files = parquet_files()
            if not files:
                raise ValueError("No BTS dataset. Import an official CSV first.")
            db.read_parquet([str(p) for p in files], hive_partitioning=False).create_view("flights")
        else:
            db.register("flights", load(dataset))
        total = db.execute("SELECT count(*) FROM (" + sql + ")", params).fetchone()[0]
        coverage = db.execute("SELECT min(date), max(date) FROM flights").fetchone()
        selected = db.execute(
            sql + " ORDER BY scheduled_utc, flight_id LIMIT ? OFFSET ?",
            params + [page_size, (page - 1) * page_size],
        ).df()
    clean = selected.astype(object).where(pd.notna(selected), None)
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data_class": dataset,
        "coverage": [str(v) for v in coverage],
        "rows": clean.to_dict("records"),
    }


def summary(dataset="synthetic"):
    f = load(dataset)
    by_day = f.groupby("date").agg(flights=("flight_id", "count"), delay=("dep_delay", "mean")).reset_index()
    routes = (
        f.groupby(["origin", "dest"])
        .agg(flights=("flight_id", "count"), delay=("dep_delay", "mean"))
        .reset_index()
    )
    airlines = (
        f.groupby("carrier").agg(flights=("flight_id", "count"), delay=("dep_delay", "mean")).reset_index()
    )
    return {
        "data_class": dataset,
        "rows": len(f),
        "airports": len(set(f.origin) | set(f.dest)),
        "mean_delay": float(f.dep_delay.mean()) if f.dep_delay.notna().any() else None,
        "null_delay": int(f.dep_delay.isna().sum()),
        "cancelled": int(f.cancelled.sum()),
        "coverage": [str(f.date.min()), str(f.date.max())],
        "daily": by_day.astype(object).where(pd.notna(by_day), None).to_dict("records"),
        "routes": routes.astype(object).where(pd.notna(routes), None).to_dict("records"),
        "airlines": airlines.astype(object).where(pd.notna(airlines), None).to_dict("records"),
    }
