from fastapi import APIRouter
from app.api.v1 import auth, matches, skills, sessions, credits, ratings, notifications

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
api_router.include_router(ratings.router, prefix="/ratings", tags=["ratings"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
