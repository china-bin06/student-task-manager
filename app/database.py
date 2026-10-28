from sqlalchemy import create_engine
from app.config import settings

from sqlalchemy.orm import sessionmaker

from sqlalchemy.orm import DeclarativeBase

from sqlalchemy import event

# 创建数据库引擎
engine = create_engine(settings.database_url)

if engine.dialect.name == "sqlite":

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        previous_autocommit = dbapi_connection.autocommit
        dbapi_connection.autocommit = True

        try:
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA foreign_keys=ON")
            finally:
                cursor.close()
        finally:
            dbapi_connection.autocommit = previous_autocommit
            
# 创建会话工厂
SessionLocal = sessionmaker(bind=engine)

# 定义ORM基类
class Base(DeclarativeBase):
    pass