"""Weather proxy endpoint — fetches 7-day Open-Meteo forecast for a canteen."""
from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.state import APP_STATE
from backend.core.weather_client import fetch_weather

log = logging.getLogger(__name__)
router = APIRouter()


class WeatherDayResponse(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    temp_mean: float
    apparent_temp_max: float
    precip: float
    windspeed: float
    sunshine_s: float
    humidity: float
    weather_code: int


@router.get("/weather", response_model=list[WeatherDayResponse])
async def get_weather(
    canteen_id: str = Query(..., description="The canteen_id to fetch weather for"),
    start_date: str = Query(..., description="YYYY-MM-DD — first forecast day"),
):
    if APP_STATE.raw_df is None:
        raise HTTPException(503, "Dataset not loaded yet")

    df = APP_STATE.raw_df
    rows = df[df["canteen_id"] == canteen_id]
    if rows.empty:
        raise HTTPException(404, f"Canteen '{canteen_id}' not found")

    wilaya_num = int(rows["wilaya_num"].iloc[0])

    try:
        days = await fetch_weather(wilaya_num, start_date, days=7)
    except Exception as e:
        log.error(f"Open-Meteo fetch failed: {e}")
        raise HTTPException(502, f"Weather API error: {e}")

    return [WeatherDayResponse(**d) for d in days]
