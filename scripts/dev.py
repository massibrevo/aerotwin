"""Cross-platform launcher. Both child processes stop on Ctrl-C or either child exiting."""

import argparse
import os
import shutil
import signal
import socket
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend-port", type=int, default=5173)
    args = parser.parse_args()
    python = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not python.exists() or not (ROOT / "frontend/node_modules").exists():
        raise SystemExit("Run python scripts/bootstrap.py first.")
    if not (ROOT / "models/synthetic.joblib").exists():
        raise SystemExit("Missing demo model. Run python scripts/bootstrap.py.")
    for port in (8000, args.frontend_port):
        with socket.socket() as sock:
            if sock.connect_ex(("127.0.0.1", port)) == 0:
                raise SystemExit(f"Port {port} is occupied. Stop that service and rerun dev.py.")
    children = []

    def stop(*_):
        for p in children:
            if p.poll() is None:
                p.terminate()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        children.append(
            subprocess.Popen(
                [
                    str(python),
                    "-m",
                    "uvicorn",
                    "aerotwin.api.app:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8000",
                ],
                cwd=ROOT,
            )
        )
        children.append(
            subprocess.Popen(
                [shutil.which("npm"), "run", "dev", "--", "--port", str(args.frontend_port)],
                cwd=ROOT / "frontend",
            )
        )
        print(f"UI http://127.0.0.1:{args.frontend_port}\nAPI docs http://127.0.0.1:8000/docs", flush=True)
        while all(p.poll() is None for p in children):
            time.sleep(0.5)
    finally:
        stop()
        for p in children:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()


if __name__ == "__main__":
    main()
