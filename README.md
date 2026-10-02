# SkillSwap — Peer-to-Peer Skill Exchange Platform

## Project Overview
SkillSwap is a full-stack platform where students exchange knowledge and skills with each other using a non-monetary skill-credit system. Users can list skills they can teach, skills they want to learn, discover compatible students through a matching engine, schedule learning sessions, earn/spend skill credits, and rate completed sessions.

## Current State / MVP Implementation
The architectural foundation and core API for the MVP have been completely laid out based on the required specifications. 

### Backend (FastAPI + PostgreSQL + SQLAlchemy)
Located in `/backend`
- **Models**: Built all SQLAlchemy models (`User`, `Skill`, `UserSkill`, `Match`, `Session`, `CreditTransaction`, `Rating`, `Notification`).
- **Core Engine**: Implemented the reciprocal matching engine inside `backend/app/matching` (Matcher, Scoring algorithm).
- **APIs**: Implemented routers for Authentication, Matches, Skills, Sessions, Credits, Ratings, and Notifications (`backend/app/api/v1/`).
- **Migrations**: Alembic is initialized and configured to use the models.

### Frontend (React + Vite + Tailwind CSS)
Located in `/frontend`
- **Setup**: Initialized a Vite + React + TypeScript project.
- **Styling**: Configured Tailwind CSS.
- **Routing**: Set up `react-router-dom` with a `MainLayout` and a beautiful `Home` landing page.

### Docker
- `docker-compose.yml` is at the root to spin up PostgreSQL, Redis, Backend, and Frontend.

## How to Run the App (Once Docker is Installed)

1. Make sure Docker and Docker Compose are installed on your machine.
2. At the root of the project, run:
   ```bash
   docker compose up -d --build
   ```
3. Run database migrations to create the tables in PostgreSQL:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
4. Access the applications:
   - **Frontend**: http://localhost:5173
   - **Backend API Docs**: http://localhost:8000/docs

## Note on Next Steps
Currently, the backend has the foundational API routes and logic. The frontend has the landing page and routing setup. To complete the MVP from a user perspective:
- Create the React components for Login, Register, Dashboard, and Match Discovery, hooking them up with `axios` and `react-query` to consume the FastAPI endpoints.
