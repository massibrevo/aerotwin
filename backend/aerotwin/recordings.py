"""Opt-in local observation recording; frames only come from the live server adapter."""

import gzip
import hashlib
import io
import json
import re
import uuid
from datetime import UTC, datetime, timedelta

from aerotwin.storage import connection

MAX_BYTES = 50 * 1024 * 1024
MAX_FRAME_BYTES = 4 * 1024 * 1024
MAX_FRAMES = 1000
MAX_SESSIONS = 20


def setup(db):
    db.execute(
        "CREATE TABLE IF NOT EXISTS recordings (id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, active INTEGER NOT NULL, query TEXT NOT NULL, stop_reason TEXT)"
    )
    db.execute(
        "CREATE TABLE IF NOT EXISTS recording_frames (session_id TEXT NOT NULL, idx INTEGER NOT NULL, captured_at TEXT NOT NULL, digest TEXT NOT NULL, payload BLOB NOT NULL, PRIMARY KEY(session_id,idx), UNIQUE(session_id,digest))"
    )
    expired = [
        row[0]
        for row in db.execute(
            "SELECT id FROM recordings WHERE expires_at<=?", (datetime.now(UTC).isoformat(),)
        )
    ]
    for key in expired:
        db.execute("DELETE FROM recording_frames WHERE session_id=?", (key,))
        db.execute("DELETE FROM recordings WHERE id=?", (key,))


def identifier(value):
    if not re.fullmatch(r"[a-f0-9]{32}", value):
        raise ValueError("Invalid recording identity")
    return value


def stop(key, reason="Stopped by user"):
    identifier(key)
    with connection() as db:
        setup(db)
        db.execute("UPDATE recordings SET active=0,stop_reason=? WHERE id=?", (reason, key))
    return {"status": "stopped"}


def recover():
    with connection() as db:
        setup(db)
        db.execute(
            "UPDATE recordings SET active=0,stop_reason='Server restarted; recording ended' WHERE active=1"
        )


def inventory():
    with connection() as db:
        setup(db)
        rows = db.execute(
            "SELECT r.id,r.label,r.created_at,r.expires_at,r.active,r.query,r.stop_reason,COUNT(f.idx),COALESCE(SUM(LENGTH(f.payload)),0),MAX(f.captured_at) FROM recordings r LEFT JOIN recording_frames f ON r.id=f.session_id GROUP BY r.id ORDER BY r.created_at DESC"
        ).fetchall()
        used = db.execute("SELECT COALESCE(SUM(LENGTH(payload)),0) FROM recording_frames").fetchone()[0]
    return {
        "sessions": [
            {
                "id": r[0],
                "label": r[1],
                "created_at": r[2],
                "expires_at": r[3],
                "active": bool(r[4]),
                "query": json.loads(r[5]),
                "stop_reason": r[6],
                "frames": r[7],
                "bytes": r[8],
                "last_capture": r[9],
            }
            for r in rows
        ],
        "used_bytes": used,
        "max_bytes": MAX_BYTES,
        "max_frames": MAX_FRAMES,
        "max_sessions": MAX_SESSIONS,
        "source": "Recorded ADSB.lol observations · ODbL · not LIVE",
    }


def start(label, lat, lon, radius_nm, retention_days):
    label = label.strip()
    if not label:
        raise ValueError("Recording label is required")
    if retention_days not in (1, 7, 30):
        raise ValueError("Retention must be 1, 7 or 30 days")
    with connection() as db:
        setup(db)
        db.commit()
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT COUNT(*) FROM recordings").fetchone()[0] >= MAX_SESSIONS:
            raise ValueError("Recording limit reached. Delete an older session first.")
        if (
            db.execute("SELECT COALESCE(SUM(LENGTH(payload)),0) FROM recording_frames").fetchone()[0]
            >= MAX_BYTES
        ):
            raise ValueError("Recording storage limit reached")
        db.execute("UPDATE recordings SET active=0,stop_reason='Another session was started' WHERE active=1")
        key = uuid.uuid4().hex
        now = datetime.now(UTC)
        query = {"lat": lat, "lon": lon, "radius_nm": radius_nm}
        db.execute(
            "INSERT INTO recordings VALUES (?,?,?,?,1,?,NULL)",
            (
                key,
                label,
                now.isoformat(),
                (now + timedelta(days=retention_days)).isoformat(),
                json.dumps(query),
            ),
        )
    return {"id": key, "query": query}


def capture(key, snapshot, lat, lon, radius_nm):
    identifier(key)
    if (
        snapshot.get("mode") != "live"
        or snapshot.get("status") != "live"
        or snapshot.get("source") != "ADSB.lol"
    ):
        return {"status": "not_captured", "reason": "No successful live observation"}
    raw = json.dumps(
        {k: snapshot.get(k) for k in ("mode", "status", "source", "aircraft", "received_at", "attribution")},
        allow_nan=False,
        sort_keys=True,
    ).encode()
    blob = gzip.compress(raw, mtime=0)
    with connection() as db:
        setup(db)
        db.commit()
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT active,query FROM recordings WHERE id=?", (key,)).fetchone()
        if not row or not row[0]:
            return {"status": "stopped", "reason": "Recording no longer active"}
        q = json.loads(row[1])
        if any(abs(q[k] - v) > 1e-6 for k, v in [("lat", lat), ("lon", lon), ("radius_nm", radius_nm)]):
            db.execute("UPDATE recordings SET active=0,stop_reason='Query region changed' WHERE id=?", (key,))
            return {"status": "stopped", "reason": "Query region changed"}
        digest = hashlib.sha256(raw).hexdigest()
        if db.execute(
            "SELECT 1 FROM recording_frames WHERE session_id=? AND digest=?", (key, digest)
        ).fetchone():
            return {"status": "recording", "duplicate": True}
        count = db.execute("SELECT COUNT(*) FROM recording_frames WHERE session_id=?", (key,)).fetchone()[0]
        used = db.execute("SELECT COALESCE(SUM(LENGTH(payload)),0) FROM recording_frames").fetchone()[0]
        if count >= MAX_FRAMES or used + len(blob) > MAX_BYTES or len(raw) > MAX_FRAME_BYTES:
            db.execute(
                "UPDATE recordings SET active=0,stop_reason='Storage or frame limit reached' WHERE id=?",
                (key,),
            )
            return {"status": "stopped", "reason": "Storage or frame limit reached"}
        db.execute(
            "INSERT INTO recording_frames VALUES (?,?,?,?,?)",
            (key, count, datetime.now(UTC).isoformat(), digest, blob),
        )
    return {"status": "recording", "frames": count + 1}


def frame(key, index):
    identifier(key)
    with connection() as db:
        setup(db)
        row = db.execute(
            "SELECT f.payload,f.captured_at,r.label,r.query FROM recording_frames f JOIN recordings r ON r.id=f.session_id WHERE f.session_id=? AND f.idx=?",
            (key, index),
        ).fetchone()
        count = db.execute("SELECT COUNT(*) FROM recording_frames WHERE session_id=?", (key,)).fetchone()[0]
    if not row:
        raise ValueError("Recorded frame unavailable or session expired")
    with gzip.GzipFile(fileobj=io.BytesIO(row[0])) as source:
        raw = source.read(MAX_FRAME_BYTES + 1)
    if len(raw) > MAX_FRAME_BYTES:
        raise ValueError("Recorded frame exceeds size limit")
    data = json.loads(raw)
    return {
        **data,
        "mode": "recorded",
        "status": "recorded",
        "source": "RECORDED ADSB.lol · NOT LIVE",
        "frame": index,
        "frame_count": count,
        "recording_id": key,
        "captured_at": row[1],
        "recording_label": row[2],
        "query": json.loads(row[3]),
    }


def delete(key):
    identifier(key)
    with connection() as db:
        setup(db)
        db.execute("DELETE FROM recording_frames WHERE session_id=?", (key,))
        db.execute("DELETE FROM recordings WHERE id=?", (key,))
        db.commit()
        db.execute("VACUUM")
    return {"status": "deleted"}
