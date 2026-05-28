"""
IntelliCanteen FastAPI backend v2 — wraps ml_pipeline_7days_forcasting directly.

Startup: loads the 456MB CSV once; all requests share it via APP_STATE.
"""
from __future__ import annotations
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

# ── Bootstrap sys.path BEFORE any pipeline imports ───────────────────────────
_PIPELINE_ROOT = Path(__file__).resolve().parents[2] / "intellecanteen" / "ml_pipeline_7days_forcasting"
if str(_PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_ROOT))

# Patch DATA_PATH to point to the CSV in the platform directory
import pipeline.config as _cfg
_CSV_PATH = Path(__file__).resolve().parent.parent / "model_second_stage_clean.csv"
if _CSV_PATH.exists():
    _cfg.DATA_PATH = _CSV_PATH

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Patch pipeline config paths to avoid LightGBM Arabic-path bug
import pipeline.config as _cfg
from pathlib import Path as _P
_cfg.ARTIFACTS_DIR = _P("Z:/artifacts")
_cfg.MODELS_DIR    = _P("Z:/artifacts/models")
_cfg.CORRECTIONS_PATH = _P("Z:/artifacts/forecast_corrections.json")
_cfg.DATA_PATH = _P(__file__).resolve().parent.parent / "model_second_stage_clean.csv"
# Also patch LEGACY_LAYOUT to point to Z:
import pipeline.paths as _pp
from pipeline.paths import PipelineLayout
_pp.LEGACY_LAYOUT = PipelineLayout(
    name               = "production",
    artifacts_dir      = _P("Z:/artifacts"),
    models_dir         = _P("Z:/artifacts/models"),
    reports_dir        = _P("Z:/artifacts/reports"),
    calibration_path   = _P("Z:/artifacts/quantile_calibration.json"),
    corrections_path   = _P("Z:/artifacts/forecast_corrections.json"),
    feature_columns_path = _P("Z:/artifacts/feature_columns.json"),
    hyperparams_path   = _P("Z:/artifacts/hyperparams.json"),
)

from pipeline.data import load_raw_data

from backend.state import APP_STATE
from backend.api import forecast, canteens, weather

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("intellicanteen")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("=== IntelliCanteen API v2 starting ===")
    log.info(f"Loading dataset from: {_cfg.DATA_PATH}")
    APP_STATE.raw_df = load_raw_data()
    n_canteens = APP_STATE.raw_df["canteen_id"].nunique()
    log.info(f"Dataset loaded: {len(APP_STATE.raw_df):,} rows, {n_canteens} canteens")
    yield
    log.info("=== Shutdown ===")


app = FastAPI(
    title="IntelliCanteen Forecast API",
    version="2.0.0",
    description="7-day meal demand forecasting with horizon-specific LightGBM quantile models",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/api", tags=["Forecast"])
app.include_router(canteens.router, prefix="/api", tags=["Canteens"])
app.include_router(weather.router,  prefix="/api", tags=["Weather"])


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "dataset_rows":    len(APP_STATE.raw_df) if APP_STATE.raw_df is not None else 0,
        "dataset_loaded":  APP_STATE.raw_df is not None,
    }
