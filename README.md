# SkillSwap — Peer-to-Peer Skill Exchange Platform

## Project Overview
SkillSwap is a full-stack platform where students exchange knowledge and skills with each other using a non-monetary skill-credit system. Users can list skills they can teach, skills they want to learn, discover compatible students through a matching engine, schedule learning sessions, earn/spend skill credits, and rate completed sessions.

## Features Built
- **User Authentication**: Secure JWT-based registration and login system.
- **Skill Management**: Users can manage a personalized list of skills they can teach and skills they want to learn, with integrated proficiency levels.
- **Reciprocal Matching Engine**: A matching engine that evaluates compatibility based on complementary skills, calculating a robust match score.
- **Match Requests**: Users can discover recommended peers and send or accept match requests.
- **Session Scheduling**: Accepted matches can be scheduled into learning sessions. The system tracks session states (REQUESTED, ACCEPTED, SCHEDULED, COMPLETED, CANCELLED).
- **Skill Credits Ledger**: A robust transactional credit system with row-level locking to ensure atomic operations and prevent negative balances. Users earn credits by teaching and spend them by learning.
- **Ratings & Reviews**: Post-session rating system with validation to ensure accountability and track user performance.
- **Notifications**: Real-time tracking of requests, sessions, and credits to keep users informed.
- **Dynamic Frontend**: A highly responsive, modern UI built with React, Vite, Tailwind CSS, and React Query for efficient data fetching and mutation.

## Tech Stack
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, Alembic (for migrations), Uvicorn.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, React Query, React Router, Axios, Lucide React (for icons).
- **DevOps**: Docker, Docker Compose.

## How to Run the App (Docker)

1. Make sure Docker and Docker Compose are installed on your machine.
2. At the root of the project, spin up the entire stack:
   ```bash
   docker compose up -d --build
   ```
3. Run database migrations to create the tables in PostgreSQL:
   ```bash
   docker compose exec backend alembic upgrade head
   ```
4. Seed the database with sample users, skills, and matches:
   ```bash
   docker compose exec backend python -m scripts.seed
   ```
5. Access the applications:
   - **Frontend**: http://localhost:5173
   - **Backend API Docs**: http://localhost:8000/docs
