from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "SkillSwap API"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = Field(
        default="supersecretkeypleasechangemeinproduction",
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET")
    )
    ALGORITHM: str = Field(
        default="HS256",
        validation_alias=AliasChoices("ALGORITHM", "JWT_ALGORITHM")
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    DATABASE_URL: str = "sqlite:///./skillswap.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    GROQ_API_KEY: str | None = None
    FRONTEND_URL: str = "http://localhost:5173"

settings = Settings()

