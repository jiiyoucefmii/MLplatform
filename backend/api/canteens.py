"""Canteen listing endpoint."""
from __future__ import annotations
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.state import APP_STATE

log = logging.getLogger(__name__)
router = APIRouter()


class CanteenInfo(BaseModel):
    canteen_id: str
    display_name: str
    wilaya_num: int
    dou_code_num: int


@router.get("/canteens", response_model=list[CanteenInfo])
def list_canteens():
    if APP_STATE.raw_df is None:
        raise HTTPException(503, "Dataset not loaded yet")

    df = APP_STATE.raw_df
    canteen_cols = ["canteen_id", "wilaya_num", "dou_code_num"]
    available = [c for c in canteen_cols if c in df.columns]
    unique = df[available].drop_duplicates("canteen_id").sort_values(
        ["wilaya_num", "canteen_id"]
    )

    result = []
    for i, row in enumerate(unique.itertuples(), 1):
        wilaya = int(getattr(row, "wilaya_num", 0) or 0)
        dou    = int(getattr(row, "dou_code_num", 0) or 0)
        cid    = str(row.canteen_id)
        result.append(CanteenInfo(
            canteen_id   = cid,
            display_name = f"#{i} — Wilaya {wilaya:02d} — {cid}",
            wilaya_num   = wilaya,
            dou_code_num = dou,
        ))

    return result
