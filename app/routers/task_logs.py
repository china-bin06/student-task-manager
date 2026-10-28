from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Annotated
from sqlalchemy import select
from typing import Literal

from app.dependencies import get_db, get_current_user
from app.models import User, TaskLog
from app.schemas import TaskLogRead

router = APIRouter(prefix="/task-logs", tags=["task-logs"])

@router.get("", response_model=list[TaskLogRead])
def list_task_logs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    task_id: Annotated[int | None, Query(gt=0)] = None,
    action: Annotated[
        Literal["create", "update", "delete"] | None,
        Query(),
    ] = None,
):
    statement = select(TaskLog).where(
        TaskLog.actor_id == current_user.id
    )

    if task_id is not None:
        statement = statement.where(TaskLog.task_id == task_id)

    if action is not None:
        statement = statement.where(TaskLog.action == action)

    statement = (
        statement
        .order_by(TaskLog.created_at.desc(), TaskLog.id.desc())
        .offset(offset)
        .limit(limit)
    )

    return db.scalars(statement).all()
    