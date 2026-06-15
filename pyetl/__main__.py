"""Command-line entrypoint for the Python ETL pipeline."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyetl.chains import CINEMA_CHAINS
from pyetl.scrape import scrape_to_raw_dir
from pyetl.storage import load_intermediate_file
from pyetl.transform import transform_raw_dir


def main() -> int:
    parser = argparse.ArgumentParser(prog="pyetl", description="Python cinema ETL pipeline")
    subcommands = parser.add_subparsers(dest="command", required=True)

    scrape_parser = subcommands.add_parser("scrape", help="extract raw cinema data")
    scrape_parser.add_argument("chain", nargs="?", choices=CINEMA_CHAINS)
    scrape_parser.add_argument("--out-dir", default="data/raw")

    transform_parser = subcommands.add_parser("transform", help="transform raw data into the standardized contract")
    transform_parser.add_argument("chain", nargs="?", choices=CINEMA_CHAINS)
    transform_parser.add_argument("--raw-dir", default="data/raw")
    transform_parser.add_argument("--out-dir", default="data/intermediate")

    storage_parser = subcommands.add_parser("storage", help="load transformed data into the database")
    storage_parser.add_argument("--input", default="data/intermediate/merge.json")
    storage_parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.command == "scrape":
        chains = (args.chain,) if args.chain else CINEMA_CHAINS
        scrape_result = scrape_to_raw_dir(args.out_dir, chains)
        print(json.dumps({chain: _counts(data) for chain, data in scrape_result.items()}, indent=2))
        return 0

    if args.command == "transform":
        chains = (args.chain,) if args.chain else CINEMA_CHAINS
        transform_result = transform_raw_dir(Path(args.raw_dir), Path(args.out_dir), chains)
        print(json.dumps(_counts(transform_result), indent=2))
        return 0

    if args.command == "storage":
        storage_result = load_intermediate_file(args.input, dry_run=args.dry_run)
        print(json.dumps(storage_result, indent=2))
        return 0

    parser.error(f"Unknown command {args.command}")
    return 2


def _counts(data: dict) -> dict[str, int]:
    return {
        "movies": len(data.get("movies", [])),
        "cinemas": len(data.get("cinemas", [])),
        "showtimes": len(data.get("showtimes", [])),
    }


if __name__ == "__main__":
    raise SystemExit(main())
