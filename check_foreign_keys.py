from app.database import engine

with engine.connect() as connection:
    enabled = connection.exec_driver_sql(
        "PRAGMA foreign_keys"
    ).scalar()

    violations = connection.exec_driver_sql(
        "PRAGMA foreign_key_check"
    ).all()

assert enabled == 1
assert violations == [], violations

print("外键检查已开启，现有数据未发现外键违规")