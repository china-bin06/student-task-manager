from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password, verify_password


# 进程加载模块时生成一次，供不存在的用户执行密码校验
DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing")


def authenticate_user(
    db: Session,
    username: str,
    password: str,
) -> User | None:
    # 1. 根据 username 查询用户
    statement = select(User).where(User.username == username)
    user = db.scalar(statement)
    # 2. 用户不存在：
    #    使用 DUMMY_PASSWORD_HASH 执行一次密码校验，然后返回 None
    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        return None

    # 3. 用户存在但密码错误：返回 None
    if not verify_password(password, user.password_hash):
        return None

    # 4. 密码正确：返回 User 对象
    return user