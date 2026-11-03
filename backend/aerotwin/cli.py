import argparse
import json
from pathlib import Path

from aerotwin.data.store import generate, ingest_bts
from aerotwin.ml.engine import train, validated_model
from aerotwin.providers.aircraft import RecordedReplayProvider


def main():
    parser = argparse.ArgumentParser(description="AeroTwin reproducible local data tools")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("demo")
    check = sub.add_parser("check-model")
    check.add_argument("--dataset", choices=["synthetic", "bts"], default="synthetic")
    ingest = sub.add_parser("ingest-bts")
    ingest.add_argument("--input", type=Path, required=True)
    ingest.add_argument("--timezone-map", type=Path)
    training = sub.add_parser("train")
    training.add_argument("--dataset", choices=["synthetic", "bts"], default="synthetic")
    args = parser.parse_args()
    if args.command == "check-model":
        try:
            validated_model(args.dataset)
            print("Model is ready: integrity, dependency version and dataset revision match.")
        except (ValueError, OSError, KeyError) as exc:
            raise SystemExit(str(exc)) from exc
    elif args.command == "demo":
        print(f"Generated {len(generate())} SYNTHETIC flights")
        RecordedReplayProvider().snapshot()
    elif args.command == "ingest-bts":
        print(
            json.dumps(
                ingest_bts(
                    args.input, json.loads(args.timezone_map.read_text()) if args.timezone_map else None
                ),
                indent=2,
            )
        )
    else:
        r = train(args.dataset)
        print(json.dumps({k: r[k] for k in ["label", "selected_model", "metrics", "n"]}, indent=2))


if __name__ == "__main__":
    main()
