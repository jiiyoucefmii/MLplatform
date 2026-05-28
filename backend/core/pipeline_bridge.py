"""
Pipeline bridge — runs the 7-day quantile forecast for one or more meal types.

This is the main inference entry point. It:
  1. Extracts anchor features from the history CSV
  2. Builds fc_ feature rows for each horizon using provided weather/calendar/menu
  3. Calls predict_full() from the trained pipeline for each (meal, horizon)
  4. Returns q10/q50/q90 per day with calibration and post-corrections applied
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import pandas as pd
import numpy as np

# Ensure pipeline is importable
_PIPELINE_ROOT = Path(__file__).resolve().parents[3] / "intellecanteen" / "ml_pipeline_7days_forcasting"
if str(_PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_ROOT))

from pipeline.paths import LEGACY_LAYOUT, PipelineLayout
from pipeline.post_corrections import predict_full

from backend.core.feature_builder import (
    build_anchor_features,
    build_forecast_day_features,
    build_full_feature_row,
    compute_rolling_weather,
    MEAL_TYPE_ID,
)

log = logging.getLogger(__name__)

HORIZONS = list(range(1, 8))


def run_forecast(
    canteen_id: str,
    meal_types: list[str],
    anchor_date_str: str,
    raw_df: pd.DataFrame,
    weather_days: list[dict],
    calendar_days: list[dict],
    menu_counts_per_meal: dict[str, dict],
    layout: PipelineLayout = LEGACY_LAYOUT,
) -> dict[str, dict]:
    """
    Run 7-day quantile forecast for one or more meal types.

    Args:
        canteen_id: e.g. "101__ANON_5bf3585ccb46"
        meal_types: ["breakfast", "lunch", "dinner"] or subset
        anchor_date_str: YYYY-MM-DD — the last day WITH known demand
        raw_df: the full history DataFrame (loaded at startup)
        weather_days: list of 7 dicts, one per forecast day (h=1..7)
        calendar_days: list of 7 dicts, one per forecast day (h=1..7)
        menu_counts_per_meal: {meal_type: {n_bread, n_protein, ...}}
        layout: pipeline artifact layout

    Returns:
        {meal_type: {"forecasts": [{date, horizon, q10, q50, q90}], "warnings": []}}
    """
    anchor_date = pd.Timestamp(anchor_date_str)
    results: dict[str, dict] = {}

    for meal in meal_types:
        warnings: list[str] = []

        # ── Step 1: Anchor features ───────────────────────────────────────────
        try:
            anchor_feats, anchor_row = build_anchor_features(
                raw_df, canteen_id, meal, anchor_date
            )
        except ValueError as e:
            log.warning(str(e))
            results[meal] = {
                "forecasts": [],
                "warnings": [str(e)],
                "error": "canteen_not_found",
            }
            continue

        wilaya_num = int(anchor_feats.get("wilaya_num", 0) or 0)
        dou_code   = anchor_row.get("dou_code", "0")
        meal_tid   = MEAL_TYPE_ID.get(meal.lower(), 0)
        menu_counts = menu_counts_per_meal.get(meal, {})

        # ── Step 2: Per-horizon prediction ───────────────────────────────────
        forecasts: list[dict] = []
        for h_idx, h in enumerate(HORIZONS):
            fc_date = anchor_date + pd.Timedelta(days=h)

            # Get weather and calendar for this horizon
            # weather_days[0] = h=1, weather_days[6] = h=7
            if h_idx < len(weather_days):
                weather_day = weather_days[h_idx]
            else:
                weather_day = weather_days[-1] if weather_days else {}
                warnings.append(f"horizon_{h}_weather_missing:using_last_available")

            if h_idx < len(calendar_days):
                calendar_day = calendar_days[h_idx]
            else:
                calendar_day = {}
                warnings.append(f"horizon_{h}_calendar_missing:using_defaults")

            # Rolling weather stats
            rolling = compute_rolling_weather(weather_days, h_idx, anchor_row)

            # ── Build fc_ feature row ─────────────────────────────────────────
            fc_feats = build_forecast_day_features(
                fc_date      = fc_date,
                weather_day  = weather_day,
                calendar_day = calendar_day,
                menu_counts  = menu_counts,
                wilaya_num   = wilaya_num,
                anchor_row   = anchor_row,
                rolling_weather = rolling,
            )

            X = build_full_feature_row(
                anchor_feats = anchor_feats,
                fc_feats     = fc_feats,
                horizon      = h,
                dou_code     = dou_code,
                meal_type_id = meal_tid,
                canteen_id   = canteen_id,
            )

            # Meta (for post-corrections: wilaya bias, holiday floor, etc.)
            meta = X.copy()

            # ── Step 3: Model prediction ──────────────────────────────────────
            try:
                q10_arr, q50_arr, q90_arr = predict_full(
                    X, meta, meal, h,
                    layout=layout,
                    apply_cal=True,
                    apply_corrections=True,
                )
                q10 = max(0.0, float(q10_arr[0]))
                q50 = max(0.0, float(q50_arr[0]))
                q90 = max(0.0, float(q90_arr[0]))
            except FileNotFoundError as e:
                log.error(f"Model file missing for {meal} h={h}: {e}")
                warnings.append(f"model_missing:h{h}")
                q10, q50, q90 = 0.0, 0.0, 0.0
            except Exception as e:
                log.error(f"Prediction error for {meal} h={h}: {e}")
                warnings.append(f"prediction_error:h{h}:{type(e).__name__}")
                q10, q50, q90 = 0.0, 0.0, 0.0

            forecasts.append({
                "date":    fc_date.strftime("%Y-%m-%d"),
                "horizon": h,
                "q10":     round(q10, 1),
                "q50":     round(q50, 1),
                "q90":     round(q90, 1),
            })

        results[meal] = {"forecasts": forecasts, "warnings": warnings}

    return results
