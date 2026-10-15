from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Exercise, User, Workout, WorkoutSet
from schemas import ExerciseCreate, ExerciseUpdate, ExerciseResponse
from auth import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])


def _own_exercise(exercise_id: int, db: Session, user: User) -> Exercise:
    """Fetch an exercise the current user added. The catalog is shared, so
    built-in exercises and other users' exercises can't be changed."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    if exercise.created_by != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change exercises you added",
        )
    return exercise


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
    current_user: User = Depends(get_current_user),
):
    """Add a new exercise to the catalog."""
    exercise = Exercise(**exercise_data.model_dump(), created_by=current_user.id)
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.put("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise_data: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an exercise you added, unless other users have logged it."""
    exercise = _own_exercise(exercise_id, db, current_user)
    used_by_others = (
        db.query(WorkoutSet.id)
        .join(Workout)
        .filter(WorkoutSet.exercise_id == exercise_id, Workout.user_id != current_user.id)
        .first()
    )
    if used_by_others:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Other people have logged this exercise, so it can't be changed",
        )

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
    current_user: User = Depends(get_current_user),
):
    """Delete an exercise you added, as long as no workout uses it."""
    exercise = _own_exercise(exercise_id, db, current_user)
    if db.query(WorkoutSet.id).filter(WorkoutSet.exercise_id == exercise_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exercise is used in logged workouts, so it can't be deleted",
        )

    db.delete(exercise)
    db.commit()
