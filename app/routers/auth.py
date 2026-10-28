from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated
from sqlalchemy.orm import Session

from app.schemas import UserLogin, TokenRead
from app.dependencies import get_db

from app.auth import authenticate_user
from app.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenRead)
def login(
    payload: UserLogin,
    db: Annotated[Session, Depends(get_db)],
):
    # 1. 调用 authenticate_user，传入 db、用户名和密码
    user = authenticate_user(db, payload.username, payload.password)
    # 2. 返回 None 时，抛出 401：“用户名或密码错误”
    if user is None:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    # 3. 根据认证成功的 user.id 签发令牌
    token = create_access_token(user.id)
    # 4. 返回 TokenRead
    return TokenRead(access_token=token)