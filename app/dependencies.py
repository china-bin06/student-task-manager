from app.database import SessionLocal

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User

def get_db():
    with SessionLocal() as session:
        # 把 session 提供给接口使用
        yield session


bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=401,
        detail="身份验证失败",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. credentials 为 None，抛出 credentials_error
    if credentials is None:
        raise credentials_error

    try:
        # 2. 验证并解码 credentials.credentials
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp"]},
        )
        # 3. 将 sub 转换为整数 user_id，并拒绝非正数
        user_id = int(payload["sub"])
        if user_id <= 0:
            raise credentials_error
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_error

    # 4. 在 try 外使用 db.get(User, user_id) 查询用户
    user = db.get(User, user_id)
    # 5. 用户不存在，抛出 credentials_error
    if user is None:
        raise credentials_error
    # 6. 返回用户
    return user