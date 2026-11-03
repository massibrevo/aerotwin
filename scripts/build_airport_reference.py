"""Build offline references from explicit local source CSVs; no runtime downloads."""

import csv
import hashlib
import json
from pathlib import Path
from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "work/airport-source"
OUT = ROOT / "backend/aerotwin/data/reference"


def number(value):
    try:
        return float(value) if value else None
    except ValueError:
        return None


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    airports = {}
    with (SOURCE / "airports.csv").open() as source:
        for r in csv.DictReader(source):
            if r["type"] not in ("large_airport", "medium_airport") and not (
                r["type"] == "small_airport" and r["scheduled_service"] == "yes"
            ):
                continue
            airports[r["ident"]] = {
                k: r.get(k) or None
                for k in [
                    "ident",
                    "name",
                    "type",
                    "icao_code",
                    "iata_code",
                    "gps_code",
                    "municipality",
                    "iso_country",
                ]
            }
            airports[r["ident"]].update(
                {k: number(r[k]) for k in ["latitude_deg", "longitude_deg", "elevation_ft"]}
            )
            airports[r["ident"]]["runways"] = []
    with (SOURCE / "runways.csv").open() as source:
        for r in csv.DictReader(source):
            if r["airport_ident"] not in airports:
                continue
            runway = {k: r.get(k) or None for k in ["le_ident", "he_ident", "surface"]}
            runway.update(
                {k: number(r[k]) for k in ["length_ft", "width_ft", "le_heading_degT", "he_heading_degT"]}
            )
            runway.update(closed=r["closed"] == "1", lighted=r["lighted"] == "1")
            airports[r["airport_ident"]]["runways"].append(runway)
    zones = {}
    with (SOURCE / "openflights-airports.dat").open() as source:
        for r in csv.reader(source):
            if len(r) < 12:
                continue
            try:
                ZoneInfo(r[11])
            except (ZoneInfoNotFoundError, ValueError):
                continue
            if r[5] not in ("\\N", ""):
                zones[r[5]] = r[11]
    metadata = {
        "built_at": datetime.now(UTC).isoformat(),
        "coverage": "Large and medium airports plus small airports with scheduled service",
        "sources": {
            "airports": {"url": "https://ourairports.com/data/", "license": "Public domain"},
            "timezones": {
                "url": "https://github.com/jpatokal/openflights/tree/master/data",
                "license": "ODbL 1.0; OpenFlights.org contributors",
            },
        },
        "input_sha256": {
            name: hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()
            for name in ["airports.csv", "runways.csv", "openflights-airports.dat"]
        },
    }
    (OUT / "airports.json").write_text(
        json.dumps({"metadata": metadata, "airports": list(airports.values())}, separators=(",", ":"))
    )
    (OUT / "timezones.json").write_text(
        json.dumps(
            {"license": "ODbL 1.0", "source": "OpenFlights.org contributors", "zones": zones},
            separators=(",", ":"),
        )
    )
    (OUT / "OpenFlights-ODbL.txt").write_text((SOURCE / "OpenFlights-ODbL.txt").read_text())
    print(f"{len(airports)} airport references; {len(zones)} timezone references")


if __name__ == "__main__":
    main()
