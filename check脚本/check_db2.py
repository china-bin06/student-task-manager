from sqlalchemy import text
from app.database import SessionLocal

# 通过 Session 执行查询
with SessionLocal() as session:
    result = session.execute(text("SELECT 1"))
    print(result.scalar())  