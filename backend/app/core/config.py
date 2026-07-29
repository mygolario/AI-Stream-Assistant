import os
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Stream Assistant"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    DEMO_MODE: bool = False
    # Public Supabase (PostgREST) fallback when DATABASE_URL is unavailable on Vercel
    SUPABASE_URL: str = "https://lerlycpxjrhuhfzymrqk.supabase.co"
    SUPABASE_ANON_KEY: str = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
        "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxlcmx5Y3B4anJodWhmenltcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjgzODAsImV4cCI6MjEwMDkwNDM4MH0."
        "hnQToPSzQQ0xKrADguUQfCL8z30J58PZm_pNIob9-SY"
    )

    # Database Settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "app_db_secret_key"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "ai_stream_assistant"
    DATABASE_URL: Optional[str] = None

    @property
    def postgres_enabled(self) -> bool:
        """Use direct Postgres when DATABASE_URL is set; skip on Vercel without it."""
        if self.DATABASE_URL:
            return True
        return not bool(os.getenv("VERCEL"))

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: Optional[str] = None

    @property
    def async_redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # AI & OpenRouter — platform-billed
    OPENROUTER_API_KEY: str = ""
    DEFAULT_OPENROUTER_MODEL: str = "google/gemini-3.5-flash-lite"
    VECTOR_DIMENSION: int = 1536
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"

    # Connectors
    KICK_CHANNEL_ID: str = ""
    KICK_CHATROOM_ID: str = ""
    KICK_BOT_TOKEN: str = ""
    TWITCH_CHANNEL_ID: str = ""
    TWITCH_CLIENT_ID: str = ""
    TWITCH_CLIENT_SECRET: str = ""
    TWITCH_BOT_OAUTH_TOKEN: str = ""
    YOUTUBE_CHANNEL_ID: str = ""
    YOUTUBE_LIVE_CHAT_ID: str = ""
    YOUTUBE_API_KEY: str = ""
    YOUTUBE_OAUTH_TOKEN: str = ""

    # OAuth apps (streamer login)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"
    TWITCH_OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/twitch/callback"
    KICK_CLIENT_ID: str = ""
    KICK_CLIENT_SECRET: str = ""
    KICK_OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/kick/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    # Billing — Oxapay
    OXAPAY_MERCHANT_API_KEY: str = ""
    OXAPAY_CALLBACK_URL: str = "http://localhost:8000/api/v1/billing/webhook"
    OXAPAY_SANDBOX: bool = True
    FREE_DAILY_AI_REPLIES: int = 50
    PRO_DAILY_AI_REPLIES: int = 2000

    # Security & CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ai-stream-assistant.vercel.app",
        "https://ai-stream-assistant-ario-projects.vercel.app",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
