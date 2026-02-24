from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Exercise
from schemas import ExerciseCreate, ExerciseUpdate, ExerciseResponse
from auth import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("/", response_model=list[ExerciseResponse])
def list_exercises(
    category: Optional[str] = Query(None, description="Filter by category"),
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """List all exercises, optionally filtered by category or muscle group."""
    query = db.query(Exercise)
    if category:
        query = query.filter(Exercise.category == category)
    if muscle_group:
        query = query.filter(Exercise.muscle_group == muscle_group)
    return query.all()


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_exercise(
    exercise_data: ExerciseCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Add a new exercise to the catalog."""
    exercise = Exercise(**exercise_data.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.put("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Update an existing exercise."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    update_data = exercise_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(exercise, key, value)

    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Delete an exercise from the catalog."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    db.delete(exercise)
    db.commit()
