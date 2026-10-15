"""Seed the FitTrack database.

Usage:
    python seed.py                 # add the exercise catalog (safe to re-run)
    python seed.py --demo          # also create a 'demo' user with 6 weeks of sample data
    python seed.py --demo --reset  # recreate the demo user's data from scratch
"""
import argparse
import random
import secrets
from datetime import date, timedelta

from database import SessionLocal, engine, Base
from models import User, Exercise, Workout, WorkoutSet, CalorieLog, ProgressLog
from auth import hash_password

# (name, category, muscle_group)
EXERCISES = [
    ("Barbell Bench Press", "Strength", "Chest"),
    ("Incline Dumbbell Press", "Strength", "Chest"),
    ("Push-Up", "Bodyweight", "Chest"),
    ("Cable Fly", "Strength", "Chest"),
    ("Deadlift", "Strength", "Back"),
    ("Pull-Up", "Bodyweight", "Back"),
    ("Barbell Row", "Strength", "Back"),
    ("Lat Pulldown", "Strength", "Back"),
    ("Seated Cable Row", "Strength", "Back"),
    ("Back Squat", "Strength", "Legs"),
    ("Front Squat", "Strength", "Legs"),
    ("Romanian Deadlift", "Strength", "Legs"),
    ("Leg Press", "Strength", "Legs"),
    ("Walking Lunge", "Strength", "Legs"),
    ("Calf Raise", "Strength", "Legs"),
    ("Overhead Press", "Strength", "Shoulders"),
    ("Lateral Raise", "Strength", "Shoulders"),
    ("Face Pull", "Strength", "Shoulders"),
    ("Barbell Curl", "Strength", "Arms"),
    ("Hammer Curl", "Strength", "Arms"),
    ("Tricep Pushdown", "Strength", "Arms"),
    ("Dips", "Bodyweight", "Arms"),
    ("Plank", "Bodyweight", "Core"),
    ("Hanging Leg Raise", "Bodyweight", "Core"),
    ("Running", "Cardio", "Full Body"),
    ("Cycling", "Cardio", "Legs"),
    ("Rowing Machine", "Cardio", "Full Body"),
    ("Jump Rope", "Cardio", "Full Body"),
]

# Workout templates: (exercise name, sets, reps, starting weight kg or None)
ROUTINES = {
    "Push day": [("Barbell Bench Press", 4, 8, 60), ("Overhead Press", 3, 10, 35),
                 ("Incline Dumbbell Press", 3, 10, 22), ("Tricep Pushdown", 3, 12, 25)],
    "Pull day": [("Deadlift", 3, 5, 100), ("Pull-Up", 4, 8, None),
                 ("Barbell Row", 3, 10, 55), ("Barbell Curl", 3, 12, 25)],
    "Leg day": [("Back Squat", 4, 8, 80), ("Romanian Deadlift", 3, 10, 70),
                ("Leg Press", 3, 12, 140), ("Calf Raise", 4, 15, 60)],
    "Conditioning": [("Jump Rope", 5, 100, None), ("Walking Lunge", 3, 20, 10),
                     ("Dips", 3, 10, None), ("Hanging Leg Raise", 3, 12, None)],
}

# (meal_type, food, calories, protein, carbs, fat)
MEALS = {
    "breakfast": [("Oats with banana & whey", 450, 32, 62, 8), ("Masala omelette & toast", 420, 28, 30, 20),
                  ("Greek yogurt & berries", 300, 22, 35, 6), ("Poha with peanuts", 380, 9, 58, 12)],
    "lunch": [("Chicken rice bowl", 650, 45, 75, 15), ("Paneer wrap", 580, 28, 55, 25),
              ("Dal, rice & salad", 560, 22, 88, 10), ("Grilled fish & quinoa", 540, 42, 48, 16)],
    "dinner": [("Salmon & sweet potato", 620, 40, 50, 24), ("Chicken curry & roti", 680, 45, 60, 26),
               ("Tofu stir fry & noodles", 560, 28, 70, 16), ("Rajma chawal", 600, 22, 95, 12)],
    "snack": [("Protein shake", 180, 30, 6, 3), ("Apple & almond butter", 250, 6, 28, 14),
              ("Roasted chana", 160, 9, 24, 3), ("Cottage cheese", 160, 20, 6, 5)],
}


def seed_exercises(db) -> dict:
    existing = {e.name: e for e in db.query(Exercise).all()}
    added = 0
    for name, category, muscle_group in EXERCISES:
        if name not in existing:
            ex = Exercise(name=name, category=category, muscle_group=muscle_group)
            db.add(ex)
            existing[name] = ex
            added += 1
    db.commit()
    print(f"Exercises: {added} added, {len(existing)} in catalog")
    return existing


def seed_demo_user(db, exercises: dict, password: str, reset: bool) -> None:
    user = db.query(User).filter(User.username == "demo").first()
    if user and not reset:
        print("Demo user already exists (use --reset to recreate its data)")
        return
    if user:
        db.delete(user)
        db.commit()

    user = User(username="demo", email="demo@fittrack.local", password_hash=hash_password(password))
    db.add(user)
    db.flush()

    rng = random.Random(42)
    today = date.today()
    days = 42
    start = today - timedelta(days=days - 1)

    # Workouts: Mon/Tue/Thu/Sat rotation, with weights creeping up week over week
    rotation = list(ROUTINES.items())
    session = 0
    for i in range(days):
        day = start + timedelta(days=i)
        if day.weekday() not in (0, 1, 3, 5):
            continue
        label, moves = rotation[session % len(rotation)]
        week = i // 7
        workout = Workout(user_id=user.id, date=day, duration_min=rng.randint(45, 75), notes=label)
        db.add(workout)
        db.flush()
        for name, sets, reps, weight in moves:
            db.add(WorkoutSet(
                workout_id=workout.id,
                exercise_id=exercises[name].id,
                set_count=sets,
                reps=reps,
                weight_kg=round(weight * (1 + 0.025 * week) / 2.5) * 2.5 if weight else None,
            ))
        session += 1

    # Meals: last 14 days, 3-4 meals a day
    for i in range(14):
        day = today - timedelta(days=i)
        for meal_type in ("breakfast", "lunch", "dinner", "snack"):
            if meal_type == "snack" and rng.random() < 0.3:
                continue
            food, cal, p, c, f = rng.choice(MEALS[meal_type])
            db.add(CalorieLog(user_id=user.id, date=day, meal_type=meal_type, food_name=food,
                              calories=cal, protein_g=p, carbs_g=c, fat_g=f))

    # Progress: twice a week, slow cut from 82 kg / 22% body fat
    for i in range(0, days, 3):
        day = start + timedelta(days=i)
        db.add(ProgressLog(
            user_id=user.id,
            date=day,
            weight_kg=round(82.0 - i * 0.07 + rng.uniform(-0.3, 0.3), 1),
            body_fat_pct=round(22.0 - i * 0.06 + rng.uniform(-0.2, 0.2), 1),
            notes="Weekly check-in" if day.weekday() == 0 else None,
        ))

    db.commit()
    print("Demo user created")
    print("  username: demo")
    print(f"  password: {password}")


def main():
    parser = argparse.ArgumentParser(description="Seed the FitTrack database")
    parser.add_argument("--demo", action="store_true", help="create a demo user with sample data")
    parser.add_argument("--reset", action="store_true", help="recreate the demo user's data")
    parser.add_argument("--password", help="demo user password (default: random)")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        exercises = seed_exercises(db)
        if args.demo:
            password = args.password or secrets.token_urlsafe(9)
            if len(password) < 8:
                parser.error("--password must be at least 8 characters")
            seed_demo_user(db, exercises, password, args.reset)
    finally:
        db.close()


if __name__ == "__main__":
    main()
