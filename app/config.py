from pydantic_settings import BaseSettings, SettingsConfigDict

from typing import Literal

from pydantic import Field

class Settings(BaseSettings):
    app_name: str = "学生任务管理系统"
    database_url: str = "sqlite:///./student_tasks.db"

    jwt_secret_key: str = Field(min_length=64)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = Field(default=30, gt=0)

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8"
    )

settings = Settings()