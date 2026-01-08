from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./taskmap.db"
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    XAI_API_KEY: str = ""

    # Microsoft Graph API credentials for Teams integration
    MS_GRAPH_CLIENT_ID: str = ""
    MS_GRAPH_CLIENT_SECRET: str = ""
    MS_GRAPH_TENANT_ID: str = ""
    MS_GRAPH_SECRET_ID: str = ""
    MS_GRAPH_REDIRECT_URI: str = "http://localhost:5173/auth/callback"

    # Message merging configuration
    MESSAGE_MERGE_ENABLED: bool = True
    MESSAGE_MERGE_TIME_WINDOW_SECONDS: int = 300  # 5 minutes
    MESSAGE_MERGE_SAME_CHAT_ONLY: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
