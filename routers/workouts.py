from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Workout, WorkoutSet, User
from schemas import (
    WorkoutCreate, WorkoutUpdate, WorkoutResponse, WorkoutSetCreate, WorkoutSetResponse,
)
from auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["Workouts"])


@router.get("/", response_model=list[WorkoutResponse])
def list_workouts(
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's workouts, optionally filtered by date range."""
    query = db.query(Workout).filter(Workout.user_id == current_user.id)
    if start_date:
        query = query.filter(Workout.date >= start_date)
    if end_date:
        query = query.filter(Workout.date <= end_date)
    return query.options(joinedload(Workout.sets)).order_by(Workout.date.desc()).all()


@router.get("/{workout_id}", response_model=WorkoutResponse)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single workout with its sets."""
    workout = (
        db.query(Workout)
        .filter(Workout.id == workout_id, Workout.user_id == current_user.id)
        .options(joinedload(Workout.sets))
        .first()
    )
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return workout


@router.post("/", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    workout_data: WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new workout session with optional sets."""
    workout = Workout(
        user_id=current_user.id,
        date=workout_data.date,
        duration_min=workout_data.duration_min,
        notes=workout_data.notes,
    )
    db.add(workout)
    db.flush()  # Get workout.id before adding sets

    for set_data in workout_data.workout_sets:
        workout_set = WorkoutSet(
            workout_id=workout.id,
            exercise_id=set_data.exercise_id,
            sets=set_data.sets,
            reps=set_data.reps,
            weight_kg=set_data.weight_kg,
        )
        db.add(workout_set)

    db.commit()
    db.refresh(workout)
    return workout


@router.put("/{workout_id}", response_model=WorkoutResponse)
def update_workout(
    workout_id: int,
    workout_data: WorkoutUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update workout metadata (date, duration, notes)."""
    workout = db.query(Workout).filter(
        Workout.id == workout_id, Workout.user_id == current_user.id
    ).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    update_data = workout_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workout, key, value)

    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a workout and its associated sets (cascade)."""
    workout = db.query(Workout).filter(
        Workout.id == workout_id, Workout.user_id == current_user.id
    ).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    db.delete(workout)
    db.commit()
