"""Single-worker local data jobs, with status persisted before and after execution."""

import threading
import uuid
from datetime import UTC, datetime

from aerotwin.ml.engine import train
from aerotwin.storage import connection
import json

_lock = threading.Lock()


def state(job_id):
    with connection() as db:
        row = db.execute("SELECT payload FROM experiments WHERE id=? AND kind='job'", (job_id,)).fetchone()
    return json.loads(row[0]) if row else None


def _save(job):
    with connection() as db:
        db.execute(
            "INSERT OR REPLACE INTO experiments VALUES (?, ?, ?, ?)",
            (job["id"], "job", job["created_at"], json.dumps(job)),
        )


def start_training(dataset):
    if not _lock.acquire(blocking=False):
        raise ValueError("Another training or import is running. Wait for it to finish.")
    job = {
        "id": uuid.uuid4().hex,
        "dataset": dataset,
        "status": "queued",
        "created_at": datetime.now(UTC).isoformat(),
        "stage": "Preparing temporal experiment",
    }
    try:
        _save(job)
    except BaseException:
        _lock.release()
        raise

    def run():
        try:
            job.update(status="running", stage="Fitting baselines and ML; validating on future rows")
            _save(job)
            report = train(dataset)
            job.update(
                status="succeeded",
                stage="Model and validation report saved",
                result={k: report[k] for k in ["model_id", "selected_model", "n", "metrics"]},
            )
        except Exception as exc:
            job.update(status="failed", stage="Training failed", error=str(exc))
        finally:
            job["finished_at"] = datetime.now(UTC).isoformat()
            try:
                _save(job)
            finally:
                _lock.release()

    threading.Thread(target=run, name="aerotwin-training", daemon=True).start()
    return dict(job)


def recover_interrupted():
    # Called once at service startup. Models become visible only after atomic manifest publication.
    with connection() as db:
        for (payload,) in db.execute("SELECT payload FROM experiments WHERE kind='job'").fetchall():
            job = json.loads(payload)
            if job["status"] in ("queued", "running"):
                job.update(
                    status="failed",
                    stage="Interrupted by application restart",
                    error="Restart interrupted this job. Submit training again.",
                )
                db.execute("UPDATE experiments SET payload=? WHERE id=?", (json.dumps(job), job["id"]))
