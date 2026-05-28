"""Forecast API endpoint."""
from __future__ import annotations

import time
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.state import APP_STATE
from backend.core.pipeline_bridge import run_forecast

log = logging.getLogger(__name__)
router = APIRouter()


# ── Request schemas ────────────────────────────────────────────────────────────

class WeatherDay(BaseModel):
    date: str
    temp_max: float = 28.0
    temp_min: float = 14.0
    temp_mean: float = 21.0
    apparent_temp_max: Optional[float] = None
    precip: float = 0.0
    windspeed: float = 10.0
    sunshine_s: float = 0.0       # sunshine duration in seconds
    humidity: float = 60.0
    weather_code: int = 0


class CalendarDay(BaseModel):
    date: str
    is_holiday: bool = False
    is_religion_holiday: bool = False
    is_national_holiday: bool = False
    is_international_holiday: bool = False
    is_day_off: bool = False
    is_vacation: bool = False
    is_ramadan: bool = False
    is_exam_period: bool = False
    is_midterm_period: bool = False
    is_final_period: bool = False
    is_week_before_ramadan: bool = False
    is_semester_start: bool = False


class MenuCounts(BaseModel):
    """Number of distinct items per menu category (0 = category not served)."""
    n_bread: int = 0
    n_protein: int = 0
    n_main_dish: int = 0
    n_side_dish: int = 0
    n_soup: int = 0
    n_dessert: int = 0
    n_drink: int = 0
    n_spread: int = 0


class ForecastRequest(BaseModel):
    canteen_id: str
    meal_types: list[str] = ["lunch"]   # ["breakfast","lunch","dinner"] for all
    anchor_date: str                     # YYYY-MM-DD — last date with known demand
    weather_days: list[WeatherDay]       # exactly 7 days (h=1..7)
    calendar_days: list[CalendarDay]     # exactly 7 days (h=1..7)
    menu_counts: dict[str, MenuCounts]   # meal_type -> counts (same for all 7 days)


# ── Response schemas ───────────────────────────────────────────────────────────

class DayResult(BaseModel):
    date: str
    horizon: int
    q10: float
    q50: float
    q90: float


class HistoryPoint(BaseModel):
    date: str
    demand: float


class MealResult(BaseModel):
    meal_type: str
    forecasts: list[DayResult]
    history: list[HistoryPoint] = []
    warnings: list[str] = []


class ForecastResponse(BaseModel):
    canteen_id: str
    anchor_date: str
    results: dict[str, MealResult]
    processing_time_ms: float


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/forecast", response_model=ForecastResponse)
async def forecast(req: ForecastRequest):
    if APP_STATE.raw_df is None:
        raise HTTPException(503, "Dataset not loaded yet — server is starting up")

    # Validate meal types
    valid_meals = {"breakfast", "lunch", "dinner"}
    for m in req.meal_types:
        if m.lower() not in valid_meals:
            raise HTTPException(400, f"Invalid meal_type: '{m}'. Must be one of {valid_meals}")

    # Validate minimum menu item counts
    for meal in req.meal_types:
        mc = req.menu_counts.get(meal.lower())
        if not mc:
            raise HTTPException(400, f"Missing menu_counts for meal: {meal}")
        
        total_items = (
            mc.n_bread + mc.n_protein + mc.n_main_dish + mc.n_side_dish +
            mc.n_soup + mc.n_dessert + mc.n_drink + mc.n_spread
        )
        
        if meal.lower() == "breakfast" and total_items < 3:
            raise HTTPException(
                400, 
                f"Au moins 3 articles doivent être sélectionnés pour le petit-déjeuner (reçu : {total_items})"
            )
        elif meal.lower() in ("lunch", "dinner") and total_items < 5:
            raise HTTPException(
                400, 
                f"Au moins 5 articles doivent être sélectionnés pour le {meal} (reçu : {total_items})"
            )

    # Convert Pydantic objects to plain dicts
    weather_days   = [w.model_dump() for w in req.weather_days]
    calendar_days  = [c.model_dump() for c in req.calendar_days]
    menu_counts_pm = {m: mc.model_dump() for m, mc in req.menu_counts.items()}

    t0 = time.perf_counter()
    try:
        raw_results = run_forecast(
            canteen_id          = req.canteen_id,
            meal_types          = [m.lower() for m in req.meal_types],
            anchor_date_str     = req.anchor_date,
            raw_df              = APP_STATE.raw_df,
            weather_days        = weather_days,
            calendar_days       = calendar_days,
            menu_counts_per_meal= menu_counts_pm,
            layout              = APP_STATE.layout,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        log.exception("Unexpected forecast error")
        raise HTTPException(500, f"Internal error: {type(e).__name__}: {e}")

    elapsed_ms = (time.perf_counter() - t0) * 1000

    # Build response
    import pandas as pd
    anchor_dt = pd.to_datetime(req.anchor_date)
    start_dt = anchor_dt - pd.Timedelta(days=30)

    results: dict[str, MealResult] = {}
    for meal, r in raw_results.items():
        if "error" in r:
            raise HTTPException(404, r["warnings"][0] if r["warnings"] else "Canteen not found")
        
        # Extract history for this canteen and meal type
        meal_df = APP_STATE.raw_df[
            (APP_STATE.raw_df["canteen_id"] == req.canteen_id) &
            (APP_STATE.raw_df["meal_type"] == meal) &
            (APP_STATE.raw_df["date"] >= start_dt) &
            (APP_STATE.raw_df["date"] <= anchor_dt)
        ].sort_values("date")
        
        history_points = [
            HistoryPoint(
                date=row.date.strftime("%Y-%m-%d"),
                demand=float(getattr(row, "demand_count", 0.0))
            )
            for row in meal_df.itertuples()
        ]

        results[meal] = MealResult(
            meal_type = meal,
            forecasts = [DayResult(**d) for d in r["forecasts"]],
            history   = history_points,
            warnings  = r.get("warnings", []),
        )

    return ForecastResponse(
        canteen_id       = req.canteen_id,
        anchor_date      = req.anchor_date,
        results          = results,
        processing_time_ms = round(elapsed_ms, 1),
    )
