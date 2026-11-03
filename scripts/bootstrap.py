"""One-time local setup. Requires Python 3.12+ and Node 20+. No credentials."""

import argparse
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-build", action="store_true", help="Rebuild UI from source, requiring Node/npm"
    )
    parser.add_argument(
        "--dev", action="store_true", help="Install development dependencies and build the UI"
    )
    args = parser.parse_args()
    compiled = (ROOT / "frontend/dist/index.html").exists()
    needs_node = args.source_build or args.dev or not compiled
    npm = shutil.which("npm")
    if needs_node:
        node = shutil.which("node")
        if not node or not npm:
            raise SystemExit(
                "This source checkout needs Node.js 20+ to build. Distribution ZIPs contain the compiled UI."
            )
        if (
            int(subprocess.check_output([node, "--version"], text=True).strip().lstrip("v").split(".")[0])
            < 20
        ):
            raise SystemExit("Node.js >=20 required for a source build")
    if not PYTHON.exists():
        venv.create(ROOT / ".venv", with_pip=True)
    run([PYTHON, "-m", "pip", "install", "-e", ".[dev]" if args.dev else ".", "-c", "requirements-lock.txt"])
    if needs_node:
        run([npm, "ci", "--no-audit", "--no-fund"], ROOT / "frontend")
        run([npm, "run", "build"], ROOT / "frontend")
    run([PYTHON, "-m", "aerotwin.cli", "demo"])
    check = subprocess.run(
        [str(PYTHON), "-m", "aerotwin.cli", "check-model"], cwd=ROOT, capture_output=True, text=True
    )
    if check.returncode:
        print("Preparing or repairing demo model:", check.stderr.strip() or check.stdout.strip())
        run([PYTHON, "-m", "aerotwin.cli", "train", "--dataset", "synthetic"])
    print(
        "\nReady. Run: python scripts/serve.py\nThen: python scripts/verify.py --base-url http://127.0.0.1:5188"
    )


if __name__ == "__main__":
    main()
