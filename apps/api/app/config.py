from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite:///../../data/tradelens.db"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    ALLOWED_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
