"""One-time local setup. Requires Python 3.12+ and Node 20+. No credentials."""

import os
import shutil
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def run(args, cwd=ROOT):
    print("+", " ".join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=cwd, check=True)


def main():
    if sys.version_info < (3, 12):
        raise SystemExit("Python 3.12 or newer is required. Use python3.12 scripts/bootstrap.py.")
    node, npm = shutil.which("node"), shutil.which("npm")
    if not node or not npm:
        raise SystemExit("Install Node.js 20+ (including npm), then rerun bootstrap.")
    if int(subprocess.check_output([node, "--version"], text=True).strip().lstrip("v").split(".")[0]) < 20:
        raise SystemExit("Node.js >=20 is required")
    if not PYTHON.exists():
        venv.create(ROOT / ".venv", with_pip=True)
    run([PYTHON, "-m", "pip", "install", "-e", ".[dev]", "-c", "requirements-lock.txt"])
    run([npm, "ci", "--no-audit", "--no-fund"], ROOT / "frontend")
    run([PYTHON, "-m", "aerotwin.cli", "demo"])
    if not (ROOT / "models/synthetic.joblib").exists():
        run([PYTHON, "-m", "aerotwin.cli", "train", "--dataset", "synthetic"])
    print("\nReady. Run: python scripts/dev.py\nThen: python scripts/verify.py")


if __name__ == "__main__":
    main()
