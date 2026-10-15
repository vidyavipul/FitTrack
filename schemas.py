from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Optional, List, Literal
from pydantic import AfterValidator, BaseModel, EmailStr, Field

MealType = Literal["breakfast", "lunch", "dinner", "snack"]


def _not_in_future(value: date) -> date:
    # The server doesn't know the client's timezone, so accept any date that is
    # already "today" somewhere on Earth (the earliest timezone is UTC+14). The
    # frontend enforces the stricter local-date limit.
    latest = (datetime.now(timezone.utc) + timedelta(hours=14)).date()
    if value > latest:
        raise ValueError("Date can't be in the future")
    return value


# A date for a new or edited log entry: today or earlier
LogDate = Annotated[date, AfterValidator(_not_in_future)]


# ─── Auth Schemas ───────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    email: EmailStr
    # bcrypt only uses the first 72 bytes of a password
    password: str = Field(min_length=8, max_length=72)


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
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    muscle_group: str = Field(min_length=1, max_length=50)


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
    set_count: int = Field(1, ge=1, le=100)
    reps: int = Field(1, ge=1, le=1000)
    weight_kg: Optional[float] = Field(None, ge=0, le=1000)


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
    date: LogDate
    duration_min: Optional[int] = Field(None, ge=1, le=1440)
    notes: Optional[str] = None
    workout_sets: List[WorkoutSetCreate] = []


class WorkoutUpdate(BaseModel):
    date: Optional[LogDate] = None
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
    date: LogDate
    meal_type: MealType
    food_name: str = Field(min_length=1, max_length=100)
    calories: int = Field(0, ge=0, le=20000)
    protein_g: Optional[float] = Field(0, ge=0, le=2000)
    carbs_g: Optional[float] = Field(0, ge=0, le=2000)
    fat_g: Optional[float] = Field(0, ge=0, le=2000)


class CalorieLogUpdate(BaseModel):
    date: Optional[LogDate] = None
    meal_type: Optional[MealType] = None
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
    date: LogDate
    weight_kg: Optional[float] = Field(None, gt=0, lt=1000)
    body_fat_pct: Optional[float] = Field(None, ge=0, le=100)
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
