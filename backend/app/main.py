import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all database tables exist on startup with retry for managed cloud DBs
    retries = 5
    for attempt in range(retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables initialized successfully.")
            break
        except Exception as e:
            if attempt < retries - 1:
                logger.warning(f"Database connection attempt {attempt + 1} failed: {e}. Retrying in 2 seconds...")
                time.sleep(2)
            else:
                logger.error(f"Failed to initialize database tables after {retries} attempts: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration supporting localhost, custom FRONTEND_URL, and Vercel domains
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to SkillSwap API", "status": "online"}

@app.get("/health")
def health():
    return {"status": "healthy"}

from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)
