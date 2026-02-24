from sqlalchemy import (
    Column, Integer, String, Text, Date, Numeric,
    ForeignKey, TIMESTAMP
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    calorie_logs = relationship("CalorieLog", back_populates="user", cascade="all, delete-orphan")
    progress_logs = relationship("ProgressLog", back_populates="user", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    muscle_group = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    workout_sets = relationship("WorkoutSet", back_populates="exercise", cascade="all, delete-orphan")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    duration_min = Column(Integer)
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="workouts")
    sets = relationship("WorkoutSet", back_populates="workout", cascade="all, delete-orphan")


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    sets = Column(Integer, nullable=False, default=1)
    reps = Column(Integer, nullable=False, default=1)
    weight_kg = Column(Numeric(6, 2))
    created_at = Column(TIMESTAMP, server_default=func.now())

    workout = relationship("Workout", back_populates="sets")
    exercise = relationship("Exercise", back_populates="workout_sets")


class CalorieLog(Base):
    __tablename__ = "calorie_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    meal_type = Column(String(20), nullable=False)
    food_name = Column(String(100), nullable=False)
    calories = Column(Integer, nullable=False, default=0)
    protein_g = Column(Numeric(6, 2), default=0)
    carbs_g = Column(Numeric(6, 2), default=0)
    fat_g = Column(Numeric(6, 2), default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="calorie_logs")


class ProgressLog(Base):
    __tablename__ = "progress_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    weight_kg = Column(Numeric(5, 2))
    body_fat_pct = Column(Numeric(4, 1))
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="progress_logs")
