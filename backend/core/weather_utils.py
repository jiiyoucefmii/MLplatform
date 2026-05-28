"""Weather utility functions — exact formulas from training notebooks."""
from __future__ import annotations
import math

# ── WMO weather code → condition string ──────────────────────────────────────
WMO_TO_CONDITION: dict[int, str] = {
    0: "clear", 1: "clear", 2: "partly_cloudy", 3: "partly_cloudy",
    45: "foggy", 48: "foggy",
    51: "drizzle", 53: "drizzle", 55: "drizzle",
    61: "rain", 63: "rain", 65: "rain",
    71: "snow", 73: "snow", 75: "snow",
    80: "rain_showers", 81: "rain_showers", 82: "rain_showers",
    85: "snow_showers", 86: "snow_showers",
    95: "thunderstorm", 96: "thunderstorm", 99: "thunderstorm",
}
RAINY     = {"drizzle", "rain", "rain_showers", "thunderstorm"}
CLOUDY    = {"partly_cloudy", "foggy"}
SNOWY     = {"snow", "snow_showers"}
SEVERITY  = {
    "clear": 0, "partly_cloudy": 20, "foggy": 20,
    "drizzle": 60, "rain": 60, "rain_showers": 60,
    "snow": 80, "snow_showers": 80, "thunderstorm": 100,
}

# ── Monthly global mean temperatures from training parquet ─────────────────
MONTHLY_TEMP_MEANS: dict[int, float] = {
    1: 10.10, 2: 11.50, 3: 13.40, 4: 16.10,
    5: 20.20, 6: 25.50, 7: 26.80, 8: 27.80,
    9: 22.20, 10: 20.20, 11: 14.97, 12: 10.82,
}

# ── Per-climate-zone temperature normalisation constants ──────────────────
ZONE_STATS: dict[str, dict[str, float]] = {
    "coastal":   {"mean": 17.05, "std": 5.11},
    "highland":  {"mean": 13.35, "std": 5.88},
    "saharan":   {"mean": 20.51, "std": 6.98},
    "semi_arid": {"mean": 15.75, "std": 6.79},
}

# ── Wilaya → climate_zone ─────────────────────────────────────────────────
WILAYA_ZONE: dict[int, str] = {
    1: "saharan",   2: "coastal",   3: "semi_arid",  4: "highland",
    5: "highland",  6: "coastal",   7: "semi_arid",  8: "saharan",
    9: "coastal",  10: "highland", 11: "saharan",   12: "highland",
    13: "coastal", 14: "semi_arid",15: "coastal",   16: "coastal",
    17: "semi_arid",18:"coastal",  19: "highland",  20: "semi_arid",
    21: "coastal", 22: "coastal",  23: "coastal",   24: "highland",
    25: "highland",26: "highland", 27: "coastal",   28: "semi_arid",
    29: "semi_arid",30:"saharan",  31: "coastal",   32: "semi_arid",
    33: "saharan", 34: "highland", 35: "coastal",   36: "coastal",
    37: "saharan", 38: "semi_arid",39: "saharan",   40: "highland",
    41: "highland",42: "coastal",  43: "highland",  44: "coastal",
    45: "semi_arid",46:"coastal",  47: "saharan",   48: "coastal",
}

# ── Wilaya GPS centroids (lat, lon) ──────────────────────────────────────
WILAYA_GPS: dict[int, tuple[float, float]] = {
    1: (28.0339, 1.6596),  2: (36.7538, 3.0588),  3: (35.3313, 1.3317),
    4: (33.8000, 2.4667),  5: (35.3956, 1.3219),  6: (36.7372, 5.0840),
    7: (34.8560, 5.7281),  8: (33.0000, 3.5000),  9: (36.8664, 7.7481),
   10: (36.1980, 4.4236), 11: (31.9539, 4.2883), 12: (28.4495, 2.8664),
   13: (35.4017, 1.3230), 14: (32.4942, 3.6737), 15: (36.4647, 6.2699),
   16: (36.3650, 6.6147), 17: (34.3660, 3.5025), 18: (36.3669, 5.7492),
   19: (36.5339, 2.6764), 20: (35.6974, 3.1558), 21: (36.7661, 3.4753),
   22: (36.3660, 6.6147), 23: (36.6667, 7.4167), 24: (35.9000, 4.7167),
   25: (35.9500, 5.4500), 26: (36.1780, 4.4221), 27: (36.9000, 7.7667),
   28: (35.4000, 1.3167), 29: (35.2667, 0.6500), 30: (30.5769, 2.8596),
   31: (35.7014, 0.6257), 32: (35.9697, 0.1524), 33: (31.6238, 3.2555),
   34: (34.9167, 5.0667), 35: (36.1897, 8.3122), 36: (36.4625, 6.1997),
   37: (27.2467, 2.5000), 38: (35.7014, 0.6257), 39: (30.0000, 2.8667),
   40: (33.7972, 1.6730), 41: (36.6667, 5.0833), 42: (36.6528, 2.3222),
   43: (36.7200, 5.1022), 44: (36.9667, 6.5667), 45: (35.3833, 1.2833),
   46: (35.5833, 1.5000), 47: (27.8705, 0.2842), 48: (36.7564, 8.3086),
}


def dew_point(temp: float, rh: float) -> float:
    """Magnus formula."""
    if rh <= 0 or math.isnan(rh):
        return float("nan")
    a, b = 17.27, 237.7
    try:
        alpha = (a * temp) / (b + temp) + math.log(rh / 100.0)
        return (b * alpha) / (a - alpha)
    except (ValueError, ZeroDivisionError):
        return float("nan")


def heat_index(temp: float, rh: float) -> float:
    """Rothfusz formula (Fahrenheit path, returned in °C)."""
    if temp <= 26.7:
        return temp
    T = temp * 9.0 / 5.0 + 32.0
    R = rh
    hi_f = (
        -42.379 + 2.04901523 * T + 10.14333127 * R
        - 0.22475541 * T * R - 0.00683783 * T ** 2
        - 0.05481717 * R ** 2 + 0.00122874 * T ** 2 * R
        + 0.00085282 * T * R ** 2 - 0.00000199 * T ** 2 * R ** 2
    )
    return (hi_f - 32.0) * 5.0 / 9.0


def weather_severity(cond: str, temp: float) -> int:
    base = SEVERITY.get(cond, 0)
    return min(130, base + 30) if (temp > 40 or temp < 0) else base


def derive_all_weather_features(
    temp_mean: float,
    temp_min: float,
    temp_max: float,
    apparent_temp_max: float | None,
    precip: float,
    windspeed: float,
    sunshine_s: float,
    humidity: float,
    weather_code: int,
    wilaya_num: int,
    month: int,
    day_of_week: int,
    is_weekend: int,
    # 3d/7d rolling means (already computed by caller)
    rolling_3d_temp: float,
    rolling_7d_temp: float,
    rolling_3d_precip: float,
    rolling_7d_precip: float,
    rolling_3d_hum: float,
    rolling_7d_hum: float,
) -> dict:
    """
    Returns dict of all weather-derived forecast-day features
    (without the fc_ prefix — caller adds it).
    """
    cond = WMO_TO_CONDITION.get(weather_code, "clear")
    zone = WILAYA_ZONE.get(wilaya_num, "highland")

    is_clear       = int(cond == "clear")
    is_cloudy      = int(cond in CLOUDY)
    is_rainy       = int(cond in RAINY)
    is_snowing     = int(cond in SNOWY)
    is_thunderstorm= int(cond == "thunderstorm")

    dp = dew_point(temp_mean, humidity)
    hi = heat_index(temp_mean, humidity)
    sev = weather_severity(cond, temp_mean)

    monthly_mean = MONTHLY_TEMP_MEANS.get(month, temp_mean)
    temp_seas_dev = temp_mean - monthly_mean

    stats = ZONE_STATS.get(zone, {"mean": 15.0, "std": 6.0})
    std = stats["std"]
    temp_zone_norm = (temp_mean - stats["mean"]) / std if std else 0.0

    hum_discomfort    = humidity * temp_mean / 100.0
    temp_hum_inter    = humidity * temp_mean / 100.0
    temp_rainy_inter  = temp_mean * is_rainy
    hum_rainy_inter   = humidity * is_rainy / 100.0
    temp_wknd_inter   = temp_mean * is_weekend
    rainy_summer      = is_rainy * int(month in (6, 7, 8))

    return {
        "temperature_2m_max":          temp_max,
        "temperature_2m_min":          temp_min,
        "temperature_2m_mean":         temp_mean,
        "apparent_temperature_max":    apparent_temp_max if apparent_temp_max is not None else temp_max,
        "precipitation_sum":           precip,
        "windspeed_10m_max":           windspeed,
        "sunshine_duration":           sunshine_s,
        "humidity_2m":                 humidity,
        "weather_code":                weather_code,
        "is_clear":                    is_clear,
        "is_cloudy":                   is_cloudy,
        "is_rainy":                    is_rainy,
        "is_snowing":                  is_snowing,
        "is_thunderstorm":             is_thunderstorm,
        "dew_point":                   dp,
        "heat_index":                  hi,
        "temp_seasonal_deviation":     temp_seas_dev,
        "temp_zone_normalized":        temp_zone_norm,
        "humidity_discomfort":         hum_discomfort,
        "weather_severity":            sev,
        "temperature_2m_mean_rolling_3d": rolling_3d_temp,
        "temperature_2m_mean_rolling_7d": rolling_7d_temp,
        "precipitation_sum_rolling_3d":   rolling_3d_precip,
        "precipitation_sum_rolling_7d":   rolling_7d_precip,
        "humidity_2m_rolling_3d":         rolling_3d_hum,
        "humidity_2m_rolling_7d":         rolling_7d_hum,
        "day_of_week":     day_of_week,
        "is_weekend":      is_weekend,
        "day_of_year":     0,   # overridden by caller
        "month":           month,
        "quarter":         (month - 1) // 3 + 1,
        "temp_humidity_interaction": temp_hum_inter,
        "temp_rainy_interaction":    temp_rainy_inter,
        "humidity_rainy_interaction":hum_rainy_inter,
        "temp_weekend_interaction":  temp_wknd_inter,
        "rainy_summer_indicator":    rainy_summer,
    }
