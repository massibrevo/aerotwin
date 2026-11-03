"""Probe running servers with only the standard library. Nonzero on any failure."""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_BASE = "http://127.0.0.1:8000"


def api(path, body=None):
    req = urllib.request.Request(
        API_BASE + "/api/v1" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    global API_BASE
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", help="Single-server production URL")
    parser.add_argument("--frontend-port", type=int, default=5173)
    args = parser.parse_args()
    frontend = args.base_url.rstrip("/") if args.base_url else f"http://127.0.0.1:{args.frontend_port}"
    if args.base_url:
        from urllib.parse import urlparse

        if urlparse(frontend).hostname not in ("127.0.0.1", "localhost", "::1"):
            raise SystemExit("Verification only supports a loopback server")
        API_BASE = frontend
    checks = [
        ("health", lambda: api("/health")["status"] == "ok"),
        ("synthetic radar", lambda: len(api("/aircraft?mode=demo")["aircraft"]) > 0),
        ("historical rows", lambda: api("/historical/flights")["total"] > 100),
        ("ready data/model", lambda: api("/ready")["status"] == "ready"),
        ("measured metrics", lambda: api("/models/synthetic/metrics")["n"]["test"] > 0),
        ("actual inference", lambda: isinstance(api("/predict", {})["prediction_minutes"], (float, int))),
        ("computed simulation", lambda: api("/simulations", {})["additional_delay_minutes"] > 0),
        (
            "zero-shock equivalence",
            lambda: api("/simulations", {"reduction": 0})["additional_delay_minutes"] == 0,
        ),
        ("frontend route", lambda: urllib.request.urlopen(frontend + "/radar").status == 200),
        ("offline basemap", lambda: urllib.request.urlopen(frontend + "/data/world.geojson").status == 200),
    ]
    failures = 0
    for name, check in checks:
        try:
            if not check():
                raise AssertionError("Check returned false")
            print(f"PASS {name}")
        except Exception as exc:
            print(f"FAIL {name}: {exc}")
            failures += 1
    print(f"{len(checks) - failures}/{len(checks)} checks passed")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
