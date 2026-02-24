from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, exercises, workouts, calories, progress

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FitTrack",
    description="Fitness & Progress Tracker API",
    version="1.0.0",
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(workouts.router)
app.include_router(calories.router)
app.include_router(progress.router)


@app.get("/")
def root():
    return {"message": "Welcome to FitTrack API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)