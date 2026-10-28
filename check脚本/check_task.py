from app.database import SessionLocal
from app.models import Task

with SessionLocal() as session:
    # 1. 创建 Task 实例，提供 title，暂时不传 completed
    task = Task(title="创建一个新任务测试")
    # 2. 使用 session.add(...) 将实例加入会话
    session.add(task)
    # 3. 使用 session.commit() 提交事务
    session.commit()
    # 4. 使用 session.refresh(...) 重新读取该实例的数据
    session.refresh(task)
    # 5. 打印它的 id、title、completed
    print(f"ID: {task.id}, Title: {task.title}, Completed: {task.completed}")