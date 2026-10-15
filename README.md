<div align="center">

# 🏋️ FitTrack

**A full-stack fitness & progress tracker to log workouts, track nutrition, and monitor body progress.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **User Auth** | Secure registration & login with JWT tokens and bcrypt password hashing |
| **Workout Logging** | Create sessions, add exercises with sets, reps, and weight tracking |
| **Exercise Catalog** | Browse and manage exercises by category and muscle group |
| **Calorie Tracking** | Log meals with macronutrient breakdown (protein, carbs, fat) |
| **Body Progress** | Track weight and body fat percentage over time |
| **Dashboard** | Visual overview of your fitness journey |
| **REST API** | Fully documented API with interactive Swagger UI |

---

## 🛠 Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com) — High-performance async web framework
- [SQLAlchemy](https://www.sqlalchemy.org) — ORM & database toolkit
- [PyMySQL](https://pymysql.readthedocs.io) — MySQL driver
- [python-jose](https://python-jose.readthedocs.io) — JWT token handling
- [Passlib](https://passlib.readthedocs.io) + bcrypt — Password hashing
- [Pydantic](https://docs.pydantic.dev) — Data validation & serialization
- [Uvicorn](https://www.uvicorn.org) — ASGI server

**Frontend**
- Vanilla HTML / CSS / JavaScript
- Responsive static pages served by FastAPI

**Database**
- MySQL 8.0+

---

## 📁 Project Structure

```
FitTrack/
├── main.py              # Application entry point
├── database.py          # DB engine & session setup
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic request/response schemas
├── auth.py              # JWT auth & password utilities
├── seed.py              # Exercise catalog + demo data seeder
├── requirements.txt     # Python dependencies
├── .env.example         # Template for .env
├── .env                 # Environment variables (not committed)
│
├── routers/
│   ├── auth.py          # Register / Login endpoints
│   ├── workouts.py      # Workout CRUD
│   ├── exercises.py     # Exercise catalog endpoints
│   ├── calories.py      # Calorie & meal logging
│   └── progress.py      # Body progress tracking
│
├── sql/
│   └── schema.sql       # Database creation script
│
└── static/
    ├── css/styles.css    # Global styles
    ├── js/               # Frontend logic
    │   ├── api.js
    │   ├── auth.js
    │   ├── calories.js
    │   ├── dashboard.js
    │   ├── progress.js
    │   └── workouts.js
    └── pages/            # HTML pages
        ├── index.html
        ├── register.html
        ├── dashboard.html
        ├── workouts.html
        ├── calories.html
        └── progress.html
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **MySQL 8.0+** running locally or remotely

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/FitTrack.git
cd FitTrack
```

### 2. Create & activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate   # macOS / Linux
venv\Scripts\activate      # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up the database

Create the MySQL database (tables are auto-created by SQLAlchemy on startup) and a dedicated app user that can only access it:

```bash
mysql -u root -p < sql/schema.sql
mysql -u root -p -e "CREATE USER 'fittrack'@'localhost' IDENTIFIED BY 'choose_a_strong_password';
                     GRANT ALL PRIVILEGES ON fittrack_db.* TO 'fittrack'@'localhost';"
```

Upgrading a database created before exercise ownership was added? Apply the migration once:

```bash
mysql -u root -p < sql/migrations/001_exercise_owner.sql
```

### 5. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `DATABASE_PASSWORD` (the password chosen above) and `JWT_SECRET_KEY`. The server refuses to start without a secret key of at least 32 characters. Generate one with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 6. Seed the exercise catalog

```bash
python seed.py           # adds ~28 exercises (safe to re-run)
python seed.py --demo    # also creates a 'demo' user with 6 weeks of sample data
```

`--demo` prints the demo user's password. Pass `--password <pw>` to choose it, or `--reset` to regenerate the demo data.

### 7. Run the server

```bash
python main.py
```

The app will be available at **http://localhost:8000** and the interactive API docs at **http://localhost:8000/docs**.

---

## 📡 API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Create a new user account |
| `POST` | `/login` | Authenticate & receive JWT token |

Use the **Authorize** button in `/docs` to log in to Swagger with a username and password.

### Workouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workouts/` | List workouts (with optional date filters) |
| `GET` | `/workouts/{id}` | Get a workout with its sets |
| `POST` | `/workouts/` | Create a workout session with its sets |
| `PUT` | `/workouts/{id}` | Update a workout |
| `DELETE` | `/workouts/{id}` | Delete a workout |

### Exercises

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/exercises/` | List all exercises |
| `POST` | `/exercises/` | Add a new exercise |
| `PUT` | `/exercises/{id}` | Update an exercise |
| `DELETE` | `/exercises/{id}` | Delete an exercise |

### Calories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/calories/` | List calorie logs |
| `GET` | `/calories/daily-summary` | Calorie & macro totals for a date |
| `POST` | `/calories/` | Log a meal |
| `PUT` | `/calories/{id}` | Update a log entry |
| `DELETE` | `/calories/{id}` | Delete a log entry |

### Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/progress/` | List progress entries |
| `GET` | `/progress/summary` | Latest metrics and weight change |
| `POST` | `/progress/` | Log body metrics |
| `DELETE` | `/progress/{id}` | Delete an entry |

> Full interactive documentation is available at `/docs` (Swagger UI) or `/redoc` when the server is running.

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_USER` | MySQL username | `root` |
| `DATABASE_PASSWORD` | MySQL password | — |
| `DATABASE_HOST` | Database host | `localhost` |
| `DATABASE_PORT` | Database port | `3306` |
| `DATABASE_NAME` | Database name | `fittrack_db` |
| `JWT_SECRET_KEY` | Secret key for signing tokens (required, 32+ chars) | — |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_EXPIRATION_MINUTES` | Token expiry in minutes | `30` |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API | `http://localhost:8000,http://127.0.0.1:8000` |

---

## 🗄 Database Schema

```
┌──────────┐       ┌───────────┐       ┌──────────────┐
│  users   │──1:N──│  workouts │──1:N──│ workout_sets │
└──────────┘       └───────────┘       └──────┬───────┘
     │                                        │
     │              ┌───────────┐              │
     │              │ exercises │──────────────┘
     │              └───────────┘
     │
     ├──1:N──┌──────────────┐
     │       │ calorie_logs │
     │       └──────────────┘
     │
     └──1:N──┌───────────────┐
             │ progress_logs │
             └───────────────┘
```

**Key models:** `User`, `Workout`, `WorkoutSet`, `Exercise`, `CalorieLog`, `ProgressLog`

---

## 📸 Screenshots

<!-- Add screenshots of your app here -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->
<!-- ![Workouts](docs/screenshots/workouts.png) -->

*Screenshots coming soon.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using FastAPI & MySQL**

</div>
