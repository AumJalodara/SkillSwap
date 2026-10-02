from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillSwap API"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "supersecretkeypleasechangemeinproduction"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    DATABASE_URL: str = "sqlite:///./skillswap.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str | None = None
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
