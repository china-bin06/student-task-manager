from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal
from app.models import Task, User


# 回填：将任务 2 分配给 man
with SessionLocal() as db:
    user = db.scalar(select(User).where(User.username == "man"))
    task = db.get(Task, 2)

    if user is None:
        raise RuntimeError("用户 man 不存在")

    if task is None:
        raise RuntimeError("任务 2 不存在")

    if task.owner_id == user.id:
        print("任务已属于 man，无需重复处理")
    elif task.owner_id is not None:
        raise RuntimeError("任务已有其他所属用户，停止处理")
    else:
        try:
            task.owner_id = user.id
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise

        print("任务 2 已分配给 man")


# 使用新会话，验证数据已经提交
with SessionLocal() as db:
    user = db.scalar(select(User).where(User.username == "man"))
    task = db.get(Task, 2)

    if user is None or task is None:
        raise RuntimeError("验证失败：用户或任务不存在")

    if task.owner_id != user.id:
        raise RuntimeError("验证失败：任务归属不正确")

    remaining = db.scalars(
        select(Task.id).where(Task.owner_id.is_(None))
    ).all()

    if remaining:
        raise RuntimeError(f"仍有无归属任务：{remaining}")

    print("验证通过：任务归属正确，且没有无归属任务")