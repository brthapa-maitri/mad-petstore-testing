from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Plain postgresql:// URLs (as in compose.yaml) are accepted; see async_database_url.
    DATABASE_URL: str = "postgresql://petstore:petstore@localhost:5432/petstore"
    ENVIRONMENT: str = "local"

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix) :]
        return url


settings = Settings()
