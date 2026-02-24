from datetime import date
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ─── Auth Schemas ───────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Exercise Schemas ───────────────────────────────────────────

class ExerciseCreate(BaseModel):
    name: str
    category: str
    muscle_group: str


class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    muscle_group: Optional[str] = None


class ExerciseResponse(BaseModel):
    id: int
    name: str
    category: str
    muscle_group: str

    class Config:
        from_attributes = True


# ─── Workout Set Schemas ────────────────────────────────────────

class WorkoutSetCreate(BaseModel):
    exercise_id: int
    set_count: int = 1
    reps: int = 1
    weight_kg: Optional[float] = None


class WorkoutSetResponse(BaseModel):
    id: int
    exercise_id: int
    set_count: int
    reps: int
    weight_kg: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Workout Schemas ────────────────────────────────────────────

class WorkoutCreate(BaseModel):
    date: date
    duration_min: Optional[int] = None
    notes: Optional[str] = None
    workout_sets: List[WorkoutSetCreate] = []


class WorkoutUpdate(BaseModel):
    date: Optional[date] = None
    duration_min: Optional[int] = None
    notes: Optional[str] = None


class WorkoutResponse(BaseModel):
    id: int
    user_id: int
    date: date
    duration_min: Optional[int] = None
    notes: Optional[str] = None
    sets: List[WorkoutSetResponse] = []

    class Config:
        from_attributes = True


# ─── Calorie Log Schemas ────────────────────────────────────────

class CalorieLogCreate(BaseModel):
    date: date
    meal_type: str
    food_name: str
    calories: int = 0
    protein_g: Optional[float] = 0
    carbs_g: Optional[float] = 0
    fat_g: Optional[float] = 0


class CalorieLogUpdate(BaseModel):
    date: Optional[date] = None
    meal_type: Optional[str] = None
    food_name: Optional[str] = None
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class CalorieLogResponse(BaseModel):
    id: int
    user_id: int
    date: date
    meal_type: str
    food_name: str
    calories: int
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Progress Log Schemas ────────────────────────────────────────

class ProgressLogCreate(BaseModel):
    date: date
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    notes: Optional[str] = None


class ProgressLogResponse(BaseModel):
    id: int
    user_id: int
    date: date
    weight_kg: Optional[float] = None
    body_fat_pct: Optional[float] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
