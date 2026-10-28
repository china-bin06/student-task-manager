from pydantic import BaseModel, ConfigDict, Field

from pydantic import field_validator

from typing import Literal

from datetime import datetime, timezone

class TaskCreate(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,  # 清理字符串首尾空白
        extra="forbid",
    )

    # 使用 Field 定义必填的 title，并设置最小、最大长度
    title: str = Field(min_length=1, max_length=200, description="任务标题，不能为空，长度为 1～200")


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # 允许从 ORM 模型中读取数据

    id: int = Field(description="任务 ID")
    title: str = Field(min_length=1, max_length=200, description="任务标题，不能为空，长度为 1～200")
    completed: bool = Field(description="任务是否完成")


class TaskUpdate(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,  # 清理字符串首尾空白
        extra="forbid",
    )
    
    title: str | None = Field(default=None, min_length=1, max_length=200, description="任务标题，不能为空，长度为 1～200")
    completed: bool | None = Field(default=None, description="任务是否完成")

    # 校验器
    @field_validator("title", "completed")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("字段不能为 null")
        return value


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # 定义 username
    username: str = Field(min_length=3, max_length=50, description="用户名，不能为空，长度为 3～50")
    # 定义 password
    password: str = Field(min_length=8, max_length=128, description="密码，不能为空，长度为 8～128")
    
    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value):
        # 字符串则去掉首尾空白，其他类型原样交给后续校验
        if isinstance(value, str):
            value = value.strip()
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="用户 ID")
    username: str = Field(min_length=3, max_length=50, description="用户名，不能为空，长度为 3～50")


# 登录请求模型
class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
     
    # 定义 username、password
    username: str = Field(min_length=3, max_length=50, description="用户名，不能为空，长度为 3～50")
    password: str = Field(min_length=1, max_length=128, description="密码，不能为空，长度为 1～128")

    # 添加只处理 username 的首尾空白校验器
    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value):
        if isinstance(value, str):
            value = value.strip()
        return value


# 令牌响应模型
class TokenRead(BaseModel):
    access_token: str # 实际令牌
    token_type: Literal["bearer"] = "bearer" # 告诉客户端，后续使用 Bearer 方式携带它


# 任务日志响应模型
class TaskLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="任务日志 ID")
    actor_id: int = Field(description="操作者 ID")
    task_id: int = Field(description="任务 ID")
    action: Literal["create", "update", "delete"] = Field(description="操作类型")
    before_data: dict | None = Field(description="变更前数据，允许为 null")
    after_data: dict | None = Field(description="变更后数据， 允许为 null")   
    created_at: datetime = Field(description="操作时间")

    # 校验器，确保 created_at 是 UTC 时间
    @field_validator("created_at")
    @classmethod
    def normalize_created_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=timezone.utc)

        return value.astimezone(timezone.utc)