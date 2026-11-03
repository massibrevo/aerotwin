"""Build an allowlisted source + compiled-UI ZIP; exclude all local datasets/models/secrets."""

import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.6.0"


def main():
    dist = ROOT / "frontend/dist"
    if not (dist / "index.html").exists():
        raise SystemExit("Run bootstrap --source-build before packaging.")
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    sources = [ROOT / p for p in tracked if p]
    sources += list(dist.rglob("*"))
    members = {}
    for path in sources:
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if any(
            part in {".git", ".venv", "node_modules", "processed", "external", "releases"}
            for part in relative.parts
        ):
            raise SystemExit(f"Unexpected runtime/private file: {relative}")
        if "models" in relative.parts and relative.name != ".gitkeep":
            raise SystemExit("Model files are not distributable release members")
        if path.name.startswith(".env") and path.name != ".env.example":
            raise SystemExit("Unexpected environment file")
        top_files = {
            ".env.example",
            ".gitignore",
            "AGENTS.md",
            "CITATION.cff",
            "CONTRIBUTING.md",
            "LICENSE",
            "README.md",
            "SECURITY.md",
            "pyproject.toml",
            "requirements-lock.txt",
        }
        allowed = (
            relative.parts[0] in {"backend", "frontend", "scripts", "tests", "docs", ".github"}
            or relative.as_posix() in {"data/demo/flights.csv", "data/demo/replay.json", "models/.gitkeep"}
            or (len(relative.parts) == 1 and relative.name in top_files)
        )
        if not allowed or path.suffix in {".joblib", ".pkl", ".sqlite3", ".db", ".parquet"}:
            raise SystemExit(f"File is outside the release source allowlist: {relative}")
        members[relative.as_posix()] = path.read_bytes()
    manifest = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(members.items())}
    members["RELEASE-MANIFEST.json"] = json.dumps(
        {"version": VERSION, "files_sha256": manifest}, indent=2
    ).encode()
    output = ROOT / "releases"
    output.mkdir(exist_ok=True)
    archive = output / f"aerotwin-{VERSION}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zipped:
        for name, data in sorted(members.items()):
            zipped.writestr(f"aerotwin-{VERSION}/{name}", data)
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / f"{archive.name}.sha256").write_text(f"{checksum}  {archive.name}\n")
    print(
        f"{archive}\nSHA-256 {checksum}\n{len(members)} files; compiled UI included; no trained models/imports."
    )


if __name__ == "__main__":
    main()
