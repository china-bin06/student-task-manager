import os
import secrets

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from sqlalchemy.engine import make_url

# 必须在导入应用配置之前设置，仅影响本次测试进程
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = secrets.token_hex(32)
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"

from app.database import Base, enable_sqlite_foreign_keys
from app.dependencies import get_db
from main import app


# @pytest.fixture
# def db_engine():
#     """每个测试使用独立的内存数据库。"""
#     engine = create_engine(
#         "sqlite://",
#         connect_args={"check_same_thread": False},
#         poolclass=StaticPool,
#     )

#     # 内存测试数据库也启用外键检查
#     event.listen(engine, "connect", enable_sqlite_foreign_keys)

#     try:
#         Base.metadata.create_all(engine)
#         yield engine
#     finally:
#         engine.dispose()
@pytest.fixture
def db_engine():
    test_database_url = os.environ.get("TEST_DATABASE_URL")

    # 未指定 PostgreSQL 测试库：使用原有 SQLite 内存数据库
    if not test_database_url:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        event.listen(engine, "connect", enable_sqlite_foreign_keys)

        try:
            Base.metadata.create_all(engine)
            yield engine
        finally:
            engine.dispose()

        return

    # 指定测试库：只接受明确的 PostgreSQL 测试数据库
    url = make_url(test_database_url)

    if url.drivername != "postgresql+psycopg":
        raise RuntimeError(
            "TEST_DATABASE_URL 必须使用 postgresql+psycopg"
        )

    if url.database != "student_tasks_test":
        raise RuntimeError(
            "拒绝清理：测试数据库名必须是 student_tasks_test"
        )

    engine = create_engine(url)

    try:
        # 每个测试开始前，清理上次残留并重新建表
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

        yield engine
    finally:
        try:
            Base.metadata.drop_all(engine)
        finally:
            engine.dispose()
            

@pytest.fixture
def client(db_engine):
    """使用测试数据库，但保留真实的身份验证流程。"""
    TestSessionLocal = sessionmaker(bind=db_engine)

    def override_get_db():
        with TestSessionLocal() as session:
            yield session

    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)