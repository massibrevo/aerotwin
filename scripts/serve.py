"""Run a compiled AeroTwin distribution on one loopback port, without Node at runtime."""

import argparse
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5188)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        raise SystemExit("Port must be between 1024 and 65535")
    python = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not python.is_file():
        raise SystemExit("Run python scripts/bootstrap.py first.")
    if not (ROOT / "frontend/dist/index.html").is_file():
        raise SystemExit("Compiled interface missing. Run bootstrap or use a distribution ZIP.")
    with socket.socket() as sock:
        if sock.connect_ex(("127.0.0.1", args.port)) == 0:
            raise SystemExit(
                f"Port {args.port} is occupied. Use --port with a free port; no existing service was stopped."
            )
    child = subprocess.Popen(
        [
            str(python),
            "-m",
            "uvicorn",
            "aerotwin.web:production_app",
            "--factory",
            "--host",
            "127.0.0.1",
            "--port",
            str(args.port),
            "--workers",
            "1",
        ],
        cwd=ROOT,
    )
    try:
        for _ in range(100):
            if child.poll() is not None:
                raise SystemExit(f"Application failed to start (exit {child.returncode}).")
            try:
                with urllib.request.urlopen(
                    f"http://127.0.0.1:{args.port}/api/v1/ready", timeout=1
                ) as response:
                    if response.status == 200:
                        break
            except (urllib.error.URLError, TimeoutError):
                time.sleep(0.15)
        else:
            raise SystemExit("Application did not become ready. Run bootstrap to repair data/model setup.")
        print(f"\nAeroTwin ready: http://127.0.0.1:{args.port}\nPress Ctrl-C to stop.\n", flush=True)
        return child.wait()
    except KeyboardInterrupt:
        return 0
    finally:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == "__main__":
    sys.exit(main())
