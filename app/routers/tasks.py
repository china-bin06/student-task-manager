from fastapi import APIRouter

from app.models import Task
from typing import Annotated
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.schemas import TaskCreate, TaskRead
from app.dependencies import get_db

from fastapi import Query
from sqlalchemy import select

from app.schemas import TaskUpdate

from fastapi import Response

from app.dependencies import get_current_user
from app.models import User

from app.models import TaskLog

# 创建路由器
# prefix：为这个路由器中的所有接口添加公共路径。
# tags：让这些接口在 /docs 中归到同一组
router = APIRouter(prefix="/tasks", tags=["tasks"])

# 创建任务接口
@router.post("", response_model=TaskRead, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # 1. 用 payload.title 创建 Task 实例
    task = Task(
        title=payload.title,
        owner_id=current_user.id,
    )

    try:
        # # 2. db.add(task)
        # db.add(task) # 把对象放入 Session 的 "pending"(待处理) 状态,Session 只是记录"这个对象要插入"
        # # 3. 提交事务
        # db.commit() # commit()生成并执行sql语句,把行写入数据库,然后提交事务
        db.add(task)
        db.flush()

        log = TaskLog(
            actor_id=current_user.id,
            task_id=task.id,
            action="create",
            before_data=None,
            after_data={
                "title": task.title,
                "completed": task.completed,
            },
        )
        db.add(log)

        db.commit()
    except SQLAlchemyError:
        # 4. 回滚事务
        db.rollback()
        # 5. 抛出 HTTPException，状态码 500，提示“创建任务失败”
        raise HTTPException(status_code=500, detail="创建任务失败")

    # 6. 刷新 task，读取数据库中的属性
    db.refresh(task)
    # 7. 返回 task
    return task


# 查询任务接口
@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # 1. 按主键查询任务
    # task = db.get(Task, task_id) # db.get() 按主键查询，返回 Task 实例；找不到则返回 None
    statement = select(Task).where(
        Task.id == task_id,
        Task.owner_id == current_user.id    # where() 中两个条件是 AND 关系，只有 ID 正确且属于当前用户才会返回任务
    )
    task = db.scalar(statement)
    # 2. 不存在时抛出 404
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    # 3. 存在时返回任务
    return task


# 查询所有任务列表列表接口，支持分页
@router.get("", response_model=list[TaskRead])
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: Annotated[int, Query(ge=0)] = 0, # 分页偏移量,表示跳过前面多少条记录,从第 offset + 1 条开始返回。等价于 SQL 的 OFFSET。
    limit: Annotated[int, Query(ge=1, le=100)] = 10, # 每页返回的最大记录数。等价于 SQL 的 LIMIT。
):
    # 1. 构造查询，按 id 升序排列
    stmt = (
        select(Task)
        .where(Task.owner_id == current_user.id)
        .order_by(Task.id)
        .offset(offset)
        .limit(limit)
    )
    # # 2. 应用 offset 和 limit
    # stmt = stmt.offset(offset).limit(limit)
    # 3. 执行查询，返回任务对象列表
    tasks = db.scalars(stmt).all() # scalars() 获取每行的第一个元素，此处就是 Task 对象；all() 收集剩余结果。
    return tasks


# 更新任务接口
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # 1. 按主键查询任务，不存在则返回 404
    statement = select(Task).where(
        Task.id == task_id,
        Task.owner_id == current_user.id    # where() 中两个条件是 AND 关系，只有 ID 正确且属于当前用户才会返回任务
    )
    task = db.scalar(statement)   
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    # 2. 提取用户明确提交的字段
    changes = payload.model_dump(exclude_unset=True)

    # 3. 空更新直接返回原任务，不提交事务
    if not changes:
        return task
    
    before_data = {
        "title": task.title,
        "completed": task.completed,
    }

    try:
        # 4. 将 changes 中的字段赋给任务对象
        for field, value in changes.items():
            setattr(task, field, value)

        after_data = {
            "title": task.title,
            "completed": task.completed,
        }

        if before_data == after_data:
            return task

        log = TaskLog(
            actor_id=current_user.id,
            task_id=task.id,
            action="update",
            before_data=before_data,
            after_data=after_data,
        )
        db.add(log)

        # 5. 提交事务
        db.commit() # 任务修改与记录写入一起提交
    except SQLAlchemyError:
        # 6. 回滚，并抛出 500：“更新任务失败”
        db.rollback()
        raise HTTPException(status_code=500, detail="更新任务失败")

    # 7. 刷新任务并返回
    db.refresh(task)
    return task


# 删除任务接口
@router.delete("/{task_id}", status_code=204, response_class=Response)
def delete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # 1. 查询任务，不存在则抛出 404
    statement = select(Task).where(
        Task.id == task_id,
        Task.owner_id == current_user.id    # where() 中两个条件是 AND 关系，只有 ID 正确且属于当前用户才会返回任务
    )
    task = db.scalar(statement)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    before_data = {
        "title": task.title,
        "completed": task.completed,
    }

    try:
        # # 2. 标记任务为删除状态
        # db.delete(task)
        # # 3. 提交事务
        # db.commit()
        log = TaskLog(
            actor_id=current_user.id,
            task_id=task.id,
            action="delete",
            before_data=before_data,
            after_data=None,
        )

        db.add(log)
        db.delete(task)
        db.commit()
    except SQLAlchemyError:
        # 4. 回滚，抛出 500：“删除任务失败”
        db.rollback()
        raise HTTPException(status_code=500, detail="删除任务失败")

    return Response(status_code=204)