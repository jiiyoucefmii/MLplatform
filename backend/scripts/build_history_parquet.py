"""
scripts/build_history_parquet.py

One-time (and on-first-startup) extraction of the lean history Parquet
from the full 456 MB model_second_stage_clean.csv.

Only keeps: canteen_id, date, meal_type, target_count, lag_7d
            + all 272 columns from residual_tree_features.json

Result: backend/artifacts/history_snapshot.parquet (~30-50 MB, zstd compressed)

Can be run manually:
    python backend/scripts/build_history_parquet.py

Or called automatically by history_store.py on first startup.
"""
from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

# ── Resolve paths from this script's location ─────────────────────────────────
_SCRIPTS_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SCRIPTS_DIR.parent
_PROJECT_ROOT = _BACKEND_DIR.parent

DEFAULT_CSV_PATH     = _PROJECT_ROOT / "model_second_stage_clean.csv"
DEFAULT_FEATURES_PATH = _PROJECT_ROOT / "residual_tree_features.json"
DEFAULT_OUT_PATH     = _BACKEND_DIR / "artifacts" / "history_snapshot.parquet"


def build_parquet(
    csv_path: Path = DEFAULT_CSV_PATH,
    features_path: Path = DEFAULT_FEATURES_PATH,
    out_path: Path = DEFAULT_OUT_PATH,
) -> Path:
    """
    Read the CSV, keep only needed columns, write Parquet.
    Returns the output path.
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"History CSV not found: {csv_path}")

    # ── Load feature column list ───────────────────────────────────────────────
    with open(features_path, "r", encoding="utf-8") as f:
        residual_features: list[str] = json.load(f)

    # Columns we always need beyond the 272 model features
    # Note: CSV uses 'demand_count', not 'target_count'
    essential = ["canteen_id", "date", "meal_type", "demand_count", "lag_7d"]
    needed_cols = sorted(set(essential + residual_features))

    logger.info(f"Reading CSV header to filter columns …")
    header = pd.read_csv(csv_path, nrows=0).columns.tolist()
    usecols = [c for c in needed_cols if c in header]
    missing = set(needed_cols) - set(header)
    if missing:
        logger.warning(f"{len(missing)} columns not found in CSV (will be set to NaN): {sorted(missing)[:10]} …")

    logger.info(f"Reading {len(usecols)} columns from {csv_path.name} ({csv_path.stat().st_size / 1e6:.0f} MB) …")
    t0 = time.perf_counter()
    df = pd.read_csv(csv_path, usecols=usecols, low_memory=False)
    elapsed = time.perf_counter() - t0
    logger.info(f"CSV loaded: {len(df):,} rows × {df.shape[1]} columns in {elapsed:.1f}s")

    # ── Type conversions ──────────────────────────────────────────────────────
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["meal_type"] = df["meal_type"].astype(str).str.lower().str.strip()
    df = df.sort_values(["canteen_id", "meal_type", "date"]).reset_index(drop=True)

    # ── Add any columns that were missing in the CSV ──────────────────────────
    for col in missing:
        if col in residual_features:
            df[col] = float("nan")

    # ── Write Parquet ──────────────────────────────────────────────────────────
    out_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Writing Parquet to {out_path} …")
    t1 = time.perf_counter()
    df.to_parquet(out_path, compression="zstd", index=False)
    elapsed2 = time.perf_counter() - t1
    size_mb = out_path.stat().st_size / 1e6
    logger.info(f"Parquet written: {size_mb:.1f} MB in {elapsed2:.1f}s")

    return out_path


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    try:
        path = build_parquet()
        print(f"\nSuccess! Parquet written to: {path}")
    except Exception as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        sys.exit(1)
