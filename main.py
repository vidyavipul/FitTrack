import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from database import engine, Base
from routers import auth, exercises, workouts, calories, progress

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FitTrack",
    description="Fitness & Progress Tracker API",
    version="1.0.0",
)

# CORS middleware for frontend integration. The bundled frontend is served from
# the same origin, so this only matters for a separately hosted client.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(workouts.router)
app.include_router(calories.router)
app.include_router(progress.router)


@app.get("/")
def root():
    return RedirectResponse(url="/static/pages/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)