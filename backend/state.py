"""Shared mutable app state — raw DataFrame + pipeline layout."""
from __future__ import annotations
import sys
from pathlib import Path

_PIPELINE_ROOT = Path(__file__).resolve().parents[2] / "intellecanteen" / "ml_pipeline_7days_forcasting"
if str(_PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_ROOT))

# Import LEGACY_LAYOUT — will be patched by main.py before use
from pipeline.paths import LEGACY_LAYOUT
import pandas as pd


class _AppState:
    raw_df: pd.DataFrame | None = None

    @property
    def layout(self):
        # Always resolve lazily so main.py's patch takes effect
        from pipeline import paths as _pp
        return _pp.LEGACY_LAYOUT


APP_STATE = _AppState()
