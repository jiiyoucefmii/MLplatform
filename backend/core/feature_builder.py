"""
Feature builder for the IntelliCanteen inference pipeline.

Builds the exact feature structure expected by the horizon-specific LightGBM
models trained in ml_pipeline_7days_forcasting.

Feature layout (from feature_columns.json):
  ANCHOR (14 cols): lag_1d..lag_30d, rolling stats, dou_code_num, wilaya_num
  FORECAST_DAY (fc_ prefix, 67 cols): weather, calendar, menu counts, derived
  IDENTITY (4 cols): horizon, dou_code, meal_type_id, canteen_id
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

import numpy as np
import pandas as pd

from backend.core.weather_utils import derive_all_weather_features, WILAYA_ZONE

log = logging.getLogger(__name__)

MEAL_TYPE_ID = {"breakfast": 1, "lunch": 2, "dinner": 3}

# All anchor-day columns (from ANCHOR_COLS in config.py)
ANCHOR_COLS = [
    "lag_1d", "lag_7d", "lag_14d", "lag_28d", "lag_30d",
    "rolling_mean_7d", "rolling_mean_14d", "rolling_mean_30d",
    "rolling_std_7d", "rolling_std_30d", "rolling_max_7d", "rolling_min_7d",
    "dou_code_num", "wilaya_num",
]

# All forecast-day columns (from FORECAST_DAY_COLS in config.py)
FORECAST_DAY_COLS = [
    "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
    "apparent_temperature_max", "precipitation_sum", "windspeed_10m_max",
    "sunshine_duration", "humidity_2m", "weather_code",
    "is_clear", "is_cloudy", "is_rainy", "is_snowing", "is_thunderstorm",
    "dew_point", "heat_index", "temp_seasonal_deviation", "temp_zone_normalized",
    "humidity_discomfort", "weather_severity",
    "temperature_2m_mean_rolling_3d", "temperature_2m_mean_rolling_7d",
    "precipitation_sum_rolling_3d", "precipitation_sum_rolling_7d",
    "humidity_2m_rolling_3d", "humidity_2m_rolling_7d",
    "day_of_week", "is_weekend", "day_of_year", "month", "quarter",
    "temp_humidity_interaction", "temp_rainy_interaction",
    "humidity_rainy_interaction", "temp_weekend_interaction",
    "rainy_summer_indicator",
    "is_holiday", "is_religion_holiday", "is_national_holiday",
    "is_international_holiday", "is_day_off", "is_vacation", "is_ramadan",
    "is_exam_period", "is_midterm_period", "is_final_period",
    "is_week_before_ramadan", "is_semester_start", "academic_pressure_level",
    "has_menu", "n_raw_menu_items",
    "n_bread_items", "n_protein_items", "n_main_dish_items", "n_side_dish_items",
    "n_soup_items", "n_dessert_items", "n_drink_items", "n_spread_items",
]


def build_anchor_features(
    raw_df: pd.DataFrame,
    canteen_id: str,
    meal_type: str,
    anchor_date: pd.Timestamp,
) -> tuple[dict, pd.Series]:
    """
    Extract anchor-day features from the history DataFrame.
    Returns (anchor_feats_dict, anchor_row_series).
    Raises ValueError if canteen/meal combo not found.
    """
    hist = raw_df[
        (raw_df["canteen_id"] == canteen_id)
        & (raw_df["meal_type"] == meal_type)
        & (raw_df["date"] <= anchor_date.strftime("%Y-%m-%d"))
    ].sort_values("date")

    if hist.empty:
        raise ValueError(
            f"No history found for canteen_id='{canteen_id}', meal_type='{meal_type}' "
            f"up to {anchor_date.date()}"
        )

    anchor_row = hist.iloc[-1]

    feats: dict = {}
    for col in ANCHOR_COLS:
        feats[col] = anchor_row.get(col, np.nan)

    return feats, anchor_row


def build_forecast_day_features(
    fc_date: pd.Timestamp,
    weather_day: dict,
    calendar_day: dict,
    menu_counts: dict,
    wilaya_num: int,
    anchor_row: pd.Series,
    rolling_weather: dict,
) -> dict:
    """
    Build all FORECAST_DAY_COLS features for one prediction date.
    Returns dict (without fc_ prefix — caller adds it).

    weather_day keys: temp_max, temp_min, temp_mean, apparent_temp_max,
                      precip, windspeed, sunshine_s, humidity, weather_code
    calendar_day keys: is_holiday, is_religion_holiday, is_national_holiday,
                       is_international_holiday, is_day_off, is_vacation,
                       is_ramadan, is_exam_period, is_midterm_period,
                       is_final_period, is_week_before_ramadan, is_semester_start
    menu_counts keys: n_bread, n_protein, n_main_dish, n_side_dish,
                      n_soup, n_dessert, n_drink, n_spread
    rolling_weather keys: rolling_3d_temp, rolling_7d_temp,
                          rolling_3d_precip, rolling_7d_precip,
                          rolling_3d_hum, rolling_7d_hum
    """
    month      = fc_date.month
    dow        = fc_date.dayofweek      # 0=Mon, 6=Sun
    is_weekend = int(dow >= 5)
    doy        = fc_date.dayofyear

    # ── Weather features ──────────────────────────────────────────────────────
    weather_feats = derive_all_weather_features(
        temp_mean       = float(weather_day.get("temp_mean", 20.0)),
        temp_min        = float(weather_day.get("temp_min", 14.0)),
        temp_max        = float(weather_day.get("temp_max", 26.0)),
        apparent_temp_max = weather_day.get("apparent_temp_max"),
        precip          = float(weather_day.get("precip", 0.0)),
        windspeed       = float(weather_day.get("windspeed", 10.0)),
        sunshine_s      = float(weather_day.get("sunshine_s", 0.0)),
        humidity        = float(weather_day.get("humidity", 60.0)),
        weather_code    = int(weather_day.get("weather_code", 0)),
        wilaya_num      = wilaya_num,
        month           = month,
        day_of_week     = dow,
        is_weekend      = is_weekend,
        rolling_3d_temp   = rolling_weather.get("rolling_3d_temp",
                                float(anchor_row.get("temperature_2m_mean_rolling_3d", 20.0) or 20.0)),
        rolling_7d_temp   = rolling_weather.get("rolling_7d_temp",
                                float(anchor_row.get("temperature_2m_mean_rolling_7d", 20.0) or 20.0)),
        rolling_3d_precip = rolling_weather.get("rolling_3d_precip",
                                float(anchor_row.get("precipitation_sum_rolling_3d", 0.0) or 0.0)),
        rolling_7d_precip = rolling_weather.get("rolling_7d_precip",
                                float(anchor_row.get("precipitation_sum_rolling_7d", 0.0) or 0.0)),
        rolling_3d_hum    = rolling_weather.get("rolling_3d_hum",
                                float(anchor_row.get("humidity_2m_rolling_3d", 60.0) or 60.0)),
        rolling_7d_hum    = rolling_weather.get("rolling_7d_hum",
                                float(anchor_row.get("humidity_2m_rolling_7d", 60.0) or 60.0)),
    )
    # Override day_of_year (derive_all_weather_features sets it to 0)
    weather_feats["day_of_year"] = doy

    # ── Calendar features ─────────────────────────────────────────────────────
    def bint(key: str) -> int:
        return int(bool(calendar_day.get(key, False)))

    is_exam   = bint("is_exam_period")
    is_mid    = bint("is_midterm_period")
    is_final  = bint("is_final_period")
    is_vac    = bint("is_vacation")
    if is_exam or is_final:
        pressure = 3
    elif is_mid:
        pressure = 2
    elif is_vac:
        pressure = 0
    else:
        pressure = 1

    cal_feats = {
        "is_holiday":              bint("is_holiday"),
        "is_religion_holiday":     bint("is_religion_holiday"),
        "is_national_holiday":     bint("is_national_holiday"),
        "is_international_holiday":bint("is_international_holiday"),
        "is_day_off":              bint("is_day_off") or is_weekend,
        "is_vacation":             is_vac,
        "is_ramadan":              bint("is_ramadan"),
        "is_exam_period":          is_exam,
        "is_midterm_period":       is_mid,
        "is_final_period":         is_final,
        "is_week_before_ramadan":  bint("is_week_before_ramadan"),
        "is_semester_start":       bint("is_semester_start"),
        "academic_pressure_level": pressure,
    }

    # ── Menu features ─────────────────────────────────────────────────────────
    n_bread     = int(menu_counts.get("n_bread",     0))
    n_protein   = int(menu_counts.get("n_protein",   0))
    n_main      = int(menu_counts.get("n_main_dish", 0))
    n_side      = int(menu_counts.get("n_side_dish", 0))
    n_soup      = int(menu_counts.get("n_soup",      0))
    n_dessert   = int(menu_counts.get("n_dessert",   0))
    n_drink     = int(menu_counts.get("n_drink",     0))
    n_spread    = int(menu_counts.get("n_spread",    0))
    n_raw_total = n_bread + n_protein + n_main + n_side + n_soup + n_dessert + n_drink + n_spread
    has_menu    = int(n_raw_total > 0)

    menu_feats = {
        "has_menu":         has_menu,
        "n_raw_menu_items": n_raw_total,
        "n_bread_items":    n_bread,
        "n_protein_items":  n_protein,
        "n_main_dish_items":n_main,
        "n_side_dish_items":n_side,
        "n_soup_items":     n_soup,
        "n_dessert_items":  n_dessert,
        "n_drink_items":    n_drink,
        "n_spread_items":   n_spread,
    }

    # ── Derived month flags (from enrich.py) ─────────────────────────────────
    month_flags = {
        "is_january":  int(month == 1),
        "is_february": int(month == 2),
        "is_march":    int(month == 3),
    }

    return {**weather_feats, **cal_feats, **menu_feats, **month_flags}


def build_full_feature_row(
    anchor_feats: dict,
    fc_feats: dict,
    horizon: int,
    dou_code: str | int,
    meal_type_id: int,
    canteen_id: str,
) -> pd.DataFrame:
    """
    Combines anchor features + fc_-prefixed forecast-day features + identity.
    Returns single-row DataFrame with canteen_id as category dtype.
    """
    row: dict = {}

    # Anchor features (no prefix)
    row.update(anchor_feats)

    # Forecast-day features (fc_ prefix)
    for k, v in fc_feats.items():
        row[f"fc_{k}"] = v

    # Identity
    row["horizon"]      = horizon
    row["dou_code"]     = dou_code
    row["meal_type_id"] = meal_type_id
    row["canteen_id"]   = canteen_id

    df = pd.DataFrame([row])
    if "canteen_id" in df.columns:
        df["canteen_id"] = df["canteen_id"].astype("category")

    return df


def compute_rolling_weather(
    weather_days: list[dict],
    current_h_idx: int,
    anchor_row: pd.Series,
) -> dict:
    """
    For horizon h (0-indexed), compute 3d and 7d rolling averages of:
      temperature_2m_mean, precipitation_sum, humidity_2m
    using the weather_days list (forecast days).
    Falls back to anchor_row historical rolling values when
    fewer than 3 / 7 forecast days are available.
    """
    # Days before current (indices 0..h_idx-1 in weather_days)
    past_days = weather_days[:current_h_idx]

    def safe_mean(vals: list[float], n: int, fallback: float) -> float:
        window = [v for v in vals[-n:] if v is not None and not (isinstance(v, float) and v != v)]
        return float(sum(window) / len(window)) if window else fallback

    anch_t3  = float(anchor_row.get("temperature_2m_mean_rolling_3d",  20.0) or 20.0)
    anch_t7  = float(anchor_row.get("temperature_2m_mean_rolling_7d",  20.0) or 20.0)
    anch_p3  = float(anchor_row.get("precipitation_sum_rolling_3d",     0.0) or 0.0)
    anch_p7  = float(anchor_row.get("precipitation_sum_rolling_7d",     0.0) or 0.0)
    anch_h3  = float(anchor_row.get("humidity_2m_rolling_3d",          60.0) or 60.0)
    anch_h7  = float(anchor_row.get("humidity_2m_rolling_7d",          60.0) or 60.0)

    temps   = [d["temp_mean"]  for d in past_days]
    precips = [d["precip"]     for d in past_days]
    hums    = [d["humidity"]   for d in past_days]

    # For 3d: use available forecast temps + fill remaining from anchor historical
    # Simple approach: if we have < 3 past forecast days, use anchor rolling
    r3t = safe_mean(temps,   3, anch_t3) if len(temps) >= 3 else anch_t3
    r7t = safe_mean(temps,   7, anch_t7) if len(temps) >= 7 else anch_t7
    r3p = safe_mean(precips, 3, anch_p3) if len(precips) >= 3 else anch_p3
    r7p = safe_mean(precips, 7, anch_p7) if len(precips) >= 7 else anch_p7
    r3h = safe_mean(hums,    3, anch_h3) if len(hums) >= 3 else anch_h3
    r7h = safe_mean(hums,    7, anch_h7) if len(hums) >= 7 else anch_h7

    return {
        "rolling_3d_temp": r3t, "rolling_7d_temp": r7t,
        "rolling_3d_precip": r3p, "rolling_7d_precip": r7p,
        "rolling_3d_hum": r3h, "rolling_7d_hum": r7h,
    }
