from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated
from sqlalchemy import select   
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.security import hash_password
from app.dependencies import get_db
from app.models import User
from app.schemas import UserCreate, UserRead

from app.dependencies import get_current_user

# 创建路由器
router = APIRouter(prefix="/users", tags=["users"])

# 用户注册接口
@router.post("", response_model=UserRead, status_code=201)
def register_user(
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
):
    # 1. 查询用户名是否已存在，存在则返回 409
    statement = select(User).where(User.username == payload.username)
    existing_user = db.scalar(statement)
    if existing_user:
        raise HTTPException(status_code=409, detail="用户名已存在")
    # 2. 生成密码哈希
    password_hash = hash_password(payload.password)
    # 3. 创建 User 对象
    user = User(
        username=payload.username,
        password_hash=password_hash
    )

    try:
        # 4. 添加对象，提交事务
        db.add(user)
        db.commit()
    except IntegrityError:
        # 5. 回滚，再检查用户名是否已存在
        #    确认用户名冲突则返回 409，否则返回 500
        db.rollback()
        statement = select(User).where(User.username == payload.username)
        existing_user = db.scalar(statement)
        if existing_user:
            raise HTTPException(status_code=409, detail="用户名已存在")
        raise HTTPException(status_code=500, detail="注册失败")
    except SQLAlchemyError:
        # 6. 回滚，返回 500：“注册失败”
        db.rollback()
        raise HTTPException(status_code=500, detail="注册失败")

    # 7. 刷新用户，返回 ORM 对象
    db.refresh(user)
    return user


@router.get("/me", response_model=UserRead)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user