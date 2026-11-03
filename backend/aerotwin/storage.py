"""Small, durable, transactional local experiment ledger (no hosted database)."""

from contextlib import contextmanager
import json
import sqlite3
import uuid
from datetime import UTC, datetime

from aerotwin.config import DATA


@contextmanager
def connection():
    path = DATA / "processed" / "experiments.sqlite3"
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute(
        "CREATE TABLE IF NOT EXISTS experiments "
        "(id TEXT PRIMARY KEY, kind TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL)"
    )
    try:
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def record(kind, payload, experiment_id=None):
    experiment_id = experiment_id or uuid.uuid4().hex
    created_at = datetime.now(UTC).isoformat()
    with connection() as db:
        db.execute(
            "INSERT INTO experiments VALUES (?, ?, ?, ?)",
            (experiment_id, kind, created_at, json.dumps(payload, allow_nan=False)),
        )
    return experiment_id


def recent(kind=None, limit=50):
    with connection() as db:
        if kind:
            rows = db.execute(
                "SELECT id, kind, created_at, payload FROM experiments WHERE kind=? "
                "ORDER BY created_at DESC LIMIT ?",
                (kind, min(limit, 100)),
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT id, kind, created_at, payload FROM experiments ORDER BY created_at DESC LIMIT ?",
                (min(limit, 100),),
            ).fetchall()
    return [
        {"id": row[0], "kind": row[1], "created_at": row[2], "payload": json.loads(row[3])} for row in rows
    ]


def get(experiment_id, kind):
    with connection() as db:
        row = db.execute(
            "SELECT payload FROM experiments WHERE id=? AND kind=?", (experiment_id, kind)
        ).fetchone()
    return json.loads(row[0]) if row else None
