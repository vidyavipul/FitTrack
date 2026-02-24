from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import ProgressLog, User
from schemas import ProgressLogCreate, ProgressLogResponse
from auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/", response_model=list[ProgressLogResponse])
def list_progress_logs(
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's progress logs with optional date filtering."""
    query = db.query(ProgressLog).filter(ProgressLog.user_id == current_user.id)
    if start_date:
        query = query.filter(ProgressLog.date >= start_date)
    if end_date:
        query = query.filter(ProgressLog.date <= end_date)
    return query.order_by(ProgressLog.date.asc()).all()


@router.get("/summary")
def progress_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get progress summary: latest entry, weight change, and min/max stats."""
    logs = (
        db.query(ProgressLog)
        .filter(ProgressLog.user_id == current_user.id)
        .order_by(ProgressLog.date.asc())
        .all()
    )

    if not logs:
        return {"message": "No progress data yet", "entries": 0}

    latest = logs[-1]
    first = logs[0]

    weight_values = [float(l.weight_kg) for l in logs if l.weight_kg is not None]

    return {
        "entries": len(logs),
        "latest_weight": float(latest.weight_kg) if latest.weight_kg else None,
        "latest_body_fat": float(latest.body_fat_pct) if latest.body_fat_pct else None,
        "latest_date": latest.date,
        "weight_change": (
            round(float(latest.weight_kg) - float(first.weight_kg), 2)
            if latest.weight_kg and first.weight_kg else None
        ),
        "min_weight": min(weight_values) if weight_values else None,
        "max_weight": max(weight_values) if weight_values else None,
    }


@router.post("/", response_model=ProgressLogResponse, status_code=status.HTTP_201_CREATED)
def create_progress_log(
    log_data: ProgressLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a body progress entry (weight, body fat, notes)."""
    log = ProgressLog(user_id=current_user.id, **log_data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_progress_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a progress log entry."""
    log = db.query(ProgressLog).filter(
        ProgressLog.id == log_id, ProgressLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Progress log not found")

    db.delete(log)
    db.commit()
