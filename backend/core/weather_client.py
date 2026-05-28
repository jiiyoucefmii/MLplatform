"""Open-Meteo weather client — fetches 7-day forecast for a wilaya."""
from __future__ import annotations
import logging
from datetime import date, timedelta

import httpx

from backend.core.weather_utils import WILAYA_GPS

log = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather(
    wilaya_num: int,
    start_date: str,
    days: int = 7,
) -> list[dict]:
    """
    Fetch 7 days of weather forecast from Open-Meteo for a given wilaya.
    Returns list of dicts: {date, temp_max, temp_min, temp_mean,
                            apparent_temp_max, precip, windspeed,
                            sunshine_s, humidity, weather_code}
    """
    gps = WILAYA_GPS.get(wilaya_num, (36.74, 3.06))  # default: Algiers
    lat, lon = gps
    start = date.fromisoformat(start_date)
    end   = start + timedelta(days=days - 1)

    params = {
        "latitude":  lat,
        "longitude": lon,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "apparent_temperature_max",
            "precipitation_sum",
            "windspeed_10m_max",
            "sunshine_duration",
            "weather_code",
        ]),
        "hourly": "relative_humidity_2m",
        "start_date":  start.isoformat(),
        "end_date":    end.isoformat(),
        "timezone":    "Africa/Algiers",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    daily   = data.get("daily", {})
    hourly  = data.get("hourly", {})
    dates   = daily.get("time", [])

    # Compute daily mean humidity from hourly data (24 values per day)
    hourly_dates = hourly.get("time", [])
    hourly_hum   = hourly.get("relative_humidity_2m", [])
    daily_hum: list[float] = []
    for i, d_str in enumerate(dates):
        # Each day has 24 hourly values
        h_slice = hourly_hum[i * 24: (i + 1) * 24]
        valid = [h for h in h_slice if h is not None]
        daily_hum.append(sum(valid) / len(valid) if valid else 60.0)

    result = []
    for i, d_str in enumerate(dates):
        def safe(arr: list, idx: int, default=0.0):
            try:
                v = arr[idx]
                return default if v is None else float(v)
            except (IndexError, TypeError):
                return default

        result.append({
            "date":              d_str,
            "temp_max":          safe(daily.get("temperature_2m_max", []), i, 25.0),
            "temp_min":          safe(daily.get("temperature_2m_min", []), i, 15.0),
            "temp_mean":         safe(daily.get("temperature_2m_mean", []), i, 20.0),
            "apparent_temp_max": safe(daily.get("apparent_temperature_max", []), i),
            "precip":            safe(daily.get("precipitation_sum", []), i, 0.0),
            "windspeed":         safe(daily.get("windspeed_10m_max", []), i, 10.0),
            "sunshine_s":        safe(daily.get("sunshine_duration", []), i, 0.0),
            "humidity":          daily_hum[i] if i < len(daily_hum) else 60.0,
            "weather_code":      int(safe(daily.get("weather_code", []), i, 0)),
        })

    return result
