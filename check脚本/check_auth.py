from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.auth import authenticate_user
from app.database import Base
from app.models import User
from app.security import hash_password


# 内存数据库，仅在本次脚本运行期间存在
engine = create_engine("sqlite://")
Base.metadata.create_all(engine)

username = "test-user"
password = "  example-password-123  "

try:
    # 准备测试用户，提交后关闭会话
    with Session(engine) as db:
        user = User(
            username=username,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.commit()
        user_id = user.id

    # 使用新的会话验证认证函数
    with Session(engine) as db:
        # 1. 用户存在，密码正确
        result = authenticate_user(db, username, password)
        assert isinstance(result, User)
        assert result.id == user_id
        assert result.username == username

        # 2. 用户存在，密码错误
        result = authenticate_user(db, username, "wrong-password")
        assert result is None

        # 3. 用户不存在
        result = authenticate_user(db, "missing-user", password)
        assert result is None

        # 4. 原密码带空格，去掉空格后应认证失败
        result = authenticate_user(db, username, password.strip())
        assert result is None

    print("四种认证情况：全部验证通过")
finally:
    engine.dispose()