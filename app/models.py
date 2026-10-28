from sqlalchemy import String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

from datetime import datetime, timezone

# 定义 Task 模型类
class Task(Base):
    __tablename__ = "tasks" # 显式指定这个模型映射到数据库里的 tasks 表

    __table_args__ = {"sqlite_autoincrement": True} # SQLite 自动生成主键时，不复用已提交后删除的任务 ID

    # Mapped[] 是 SQLAlchemy 2.0 引入的类型注解写法
    # mapped_column(...) 负责定义列级别的约束和选项
    # 因为类型是 int 且是单列主键,SQLAlchemy 默认会为它启用 autoincrement(自增),autoincrement=True 可以省略,但为了清晰起见,这里显式写出
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True) # 主键,自增
    title: Mapped[str] = mapped_column(String(200), nullable=False) # 标题,长度限制为 200,禁止 NULL,允许 ""
    completed: Mapped[bool] = mapped_column(nullable=False, default=False) # 是否完成,默认值为 False,非空
    owner_id: Mapped[int] = mapped_column( # 任务所属user的id,外键
        ForeignKey("users.id", name="fk_tasks_owner_id_users"),
        nullable=False,
        index=True,
    )

# 定义 User 模型类
class User(Base):
    __tablename__ = "users"  

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)  # 主键,自增
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)  # 用户名,长度限制为 50,禁止 NULL,唯一
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)  # 密码哈希值,长度限制为 255,禁止 NULL


# 定义 TaskLog 模型类
class TaskLog(Base):
    __tablename__ = "task_logs"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 操作者：必须对应一个存在的用户
    actor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", name="fk_task_logs_actor_id_users"),
        nullable=False,
        index=True,
    )

    # 历史任务 ID：不设任务外键，任务删除后仍保留记录
    task_id: Mapped[int] = mapped_column(
        nullable=False,
        index=True,
    )

    # 操作类型：create、update、delete
    action: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    # 变更前数据：JSON 格式，允许 NULL
    before_data: Mapped[dict | None] = mapped_column(
        JSON(none_as_null=True),
        nullable=True,
    )

    # 变更后数据：JSON 格式，允许 NULL
    after_data: Mapped[dict | None] = mapped_column(
        JSON(none_as_null=True),
        nullable=True,
    )

    # 创建时间：UTC 日期时间，非空，默认值为当前 UTC 时间
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )