import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Query

from ..calendar_service import calendar_service
from .. import schemas

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/details", response_model=List[schemas.CalendarDay])
async def get_calendar_details(
    start_date: datetime.date = Query(...),
    end_date: datetime.date = Query(...),
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date, end_date tarihinden sonra olamaz.")
    return calendar_service.get_calendar_details(start_date, end_date)
