from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import CalorieLog, User
from schemas import CalorieLogCreate, CalorieLogUpdate, CalorieLogResponse
from auth import get_current_user

router = APIRouter(prefix="/calories", tags=["Calories"])


@router.get("/", response_model=list[CalorieLogResponse])
def list_calorie_logs(
    log_date: Optional[date] = Query(None, description="Filter by specific date"),
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's calorie logs with optional date filtering."""
    query = db.query(CalorieLog).filter(CalorieLog.user_id == current_user.id)
    if log_date:
        query = query.filter(CalorieLog.date == log_date)
    if start_date:
        query = query.filter(CalorieLog.date >= start_date)
    if end_date:
        query = query.filter(CalorieLog.date <= end_date)
    return query.order_by(CalorieLog.date.desc(), CalorieLog.id.desc()).all()


@router.get("/daily-summary")
def daily_summary(
    log_date: date = Query(..., description="Date for daily summary"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated calorie and macro totals for a specific date."""
    result = db.query(
        func.coalesce(func.sum(CalorieLog.calories), 0).label("total_calories"),
        func.coalesce(func.sum(CalorieLog.protein_g), 0).label("total_protein"),
        func.coalesce(func.sum(CalorieLog.carbs_g), 0).label("total_carbs"),
        func.coalesce(func.sum(CalorieLog.fat_g), 0).label("total_fat"),
        func.count(CalorieLog.id).label("meal_count"),
    ).filter(
        CalorieLog.user_id == current_user.id,
        CalorieLog.date == log_date,
    ).first()

    return {
        "date": log_date,
        "total_calories": int(result.total_calories),
        "total_protein": float(result.total_protein),
        "total_carbs": float(result.total_carbs),
        "total_fat": float(result.total_fat),
        "meal_count": result.meal_count,
    }


@router.post("/", response_model=CalorieLogResponse, status_code=status.HTTP_201_CREATED)
def create_calorie_log(
    log_data: CalorieLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a meal with calorie and macro information."""
    log = CalorieLog(user_id=current_user.id, **log_data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.put("/{log_id}", response_model=CalorieLogResponse)
def update_calorie_log(
    log_id: int,
    log_data: CalorieLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a calorie log entry."""
    log = db.query(CalorieLog).filter(
        CalorieLog.id == log_id, CalorieLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calorie log not found")

    update_data = log_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(log, key, value)

    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calorie_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a calorie log entry."""
    log = db.query(CalorieLog).filter(
        CalorieLog.id == log_id, CalorieLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calorie log not found")

    db.delete(log)
    db.commit()
