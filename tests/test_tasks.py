import pytest

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy import event

from app.models import Task, TaskLog

# 验证流程：注册 → 登录 → 携带令牌创建任务 → 查询任务 → 查询创建记录
def test_register_login_create_task_and_read_log(client):
    # 1. 注册
    credentials = {
        "username": "test-user",
        "password": "example-password-123",
    }

    response = client.post("/users", json=credentials)

    assert response.status_code == 201, response.text
    user = response.json()
    assert user["username"] == credentials["username"]
    assert set(user) == {"id", "username"}

    # 2. 登录
    response = client.post("/auth/login", json=credentials)

    assert response.status_code == 200, response.text
    token_data = response.json()
    assert token_data["token_type"] == "bearer"
    assert token_data["access_token"]

    headers = {
        "Authorization": f"Bearer {token_data['access_token']}",
    }

    # 3. 创建任务
    response = client.post(
        "/tasks",
        json={"title": "  学习 FastAPI  "},
        headers=headers,
    )

    assert response.status_code == 201, response.text
    task = response.json()
    assert task["title"] == "学习 FastAPI"
    assert task["completed"] is False

    task_id = task["id"]

    # 4. 通过另一次请求查询，确认任务已经保存
    response = client.get(
        f"/tasks/{task_id}",
        headers=headers,
    )

    assert response.status_code == 200, response.text
    assert response.json() == task

    # 5. 查询创建记录
    response = client.get(
        "/task-logs",
        params={"task_id": task_id},
        headers=headers,
    )

    assert response.status_code == 200, response.text
    logs = response.json()
    assert len(logs) == 1

    log = logs[0]
    assert log["actor_id"] == user["id"]
    assert log["task_id"] == task_id
    assert log["action"] == "create"
    assert log["before_data"] is None
    assert log["after_data"] == {
        "title": "学习 FastAPI",
        "completed": False,
    }
    assert log["created_at"].endswith(("Z", "+00:00"))


# 验证未登录访问受保护接口时，统一返回 401
@pytest.mark.parametrize(
    "method,path,payload",
    [
        ("POST", "/tasks", {"title": "测试任务"}),
        ("GET", "/tasks", None),
        ("GET", "/tasks/1", None),
        ("PATCH", "/tasks/1", {"completed": True}),
        ("DELETE", "/tasks/1", None),
        ("GET", "/task-logs", None),
        ("GET", "/users/me", None),
    ],
)
def test_protected_routes_require_login(client, method, path, payload):
    response = client.request(method, path, json=payload)

    assert response.status_code == 401, response.text
    assert response.headers["www-authenticate"] == "Bearer"


# 测试已登录用户之间的权限隔离
def test_user_cannot_access_another_users_task(client):
    # 1. 分别注册并登录两个用户
    def register_and_login(username):
        credentials = {
            "username": username,
            "password": "example-password-123",
        }

        response = client.post("/users", json=credentials)
        assert response.status_code == 201, response.text

        response = client.post("/auth/login", json=credentials)
        assert response.status_code == 200, response.text

        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    headers_a = register_and_login("user-a")
    headers_b = register_and_login("user-b")

    # 2. 用户 A 创建任务
    response = client.post(
        "/tasks",
        json={"title": "用户 A 的任务"},
        headers=headers_a,
    )
    assert response.status_code == 201, response.text

    original_task = response.json()
    task_id = original_task["id"]

    # 保存原有记录，后续检查越权操作是否产生副作用
    response = client.get(
        "/task-logs",
        params={"task_id": task_id},
        headers=headers_a,
    )
    assert response.status_code == 200, response.text

    original_logs = response.json()
    assert len(original_logs) == 1
    assert original_logs[0]["action"] == "create"

    # 3. 用户 B 尝试查询、更新、空更新和删除 A 的任务
    for method, payload in [
        ("GET", None),
        ("PATCH", {"title": "不应修改成功"}),
        ("PATCH", {}),
        ("DELETE", None),
    ]:
        response = client.request(
            method,
            f"/tasks/{task_id}",
            json=payload,
            headers=headers_b,
        )
        assert response.status_code == 404, (
            f"{method} 越权请求结果异常：{response.text}"
        )

    # 4. 用户 B 的任务列表中不应包含 A 的任务
    response = client.get("/tasks", headers=headers_b)
    assert response.status_code == 200, response.text
    assert response.json() == []

    # 用户 B 看不到 A 的记录，包括按任务 ID 筛选时
    for params in ({}, {"task_id": task_id}):
        response = client.get(
            "/task-logs",
            params=params,
            headers=headers_b,
        )
        assert response.status_code == 200, response.text
        assert response.json() == []

    # 5. 用户 A 再次查询，任务仍存在且内容未改变
    response = client.get(
        f"/tasks/{task_id}",
        headers=headers_a,
    )
    assert response.status_code == 200, response.text
    assert response.json() == original_task

    # 操作记录也必须保持原样
    response = client.get(
        "/task-logs",
        params={"task_id": task_id},
        headers=headers_a,
    )
    assert response.status_code == 200, response.text
    assert response.json() == original_logs


# 补齐更新、删除与操作记录的 HTTP 测试
def test_task_update_delete_and_logs(client):
    # 1. 注册并登录
    credentials = {
        "username": "lifecycle-user",
        "password": "example-password-123",
    }

    response = client.post("/users", json=credentials)
    assert response.status_code == 201, response.text
    user_id = response.json()["id"]

    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 200, response.text

    headers = {
        "Authorization": f"Bearer {response.json()['access_token']}",
    }

    # 2. 创建任务
    response = client.post(
        "/tasks",
        json={"title": "学习"},
        headers=headers,
    )
    assert response.status_code == 201, response.text

    task_id = response.json()["id"]
    task_url = f"/tasks/{task_id}"

    # 辅助函数：通过实际接口查询任务历史
    def read_logs():
        response = client.get(
            "/task-logs",
            params={"task_id": task_id, "limit": 100},
            headers=headers,
        )
        assert response.status_code == 200, response.text

        logs = response.json()
        assert all(log["task_id"] == task_id for log in logs)
        assert all(log["actor_id"] == user_id for log in logs)
        return logs

    logs = read_logs()
    assert len(logs) == 1
    assert logs[0]["action"] == "create"
    assert logs[0]["before_data"] is None
    assert logs[0]["after_data"] == {
        "title": "学习",
        "completed": False,
    }

    # 3. 修改标题、完成状态，再改回未完成
    cases = [
        (
            {"title": "学习 FastAPI"},
            {"title": "学习", "completed": False},
            {"title": "学习 FastAPI", "completed": False},
        ),
        (
            {"completed": True},
            {"title": "学习 FastAPI", "completed": False},
            {"title": "学习 FastAPI", "completed": True},
        ),
        (
            {"completed": False},
            {"title": "学习 FastAPI", "completed": True},
            {"title": "学习 FastAPI", "completed": False},
        ),
    ]

    for expected_count, (payload, before, after) in enumerate(
        cases,
        start=2,
    ):
        previous_log_ids = {log["id"] for log in logs}

        response = client.patch(
            task_url,
            json=payload,
            headers=headers,
        )
        assert response.status_code == 200, response.text
        assert response.json() == {"id": task_id, **after}

        # 使用另一次请求确认修改已经保存
        response = client.get(task_url, headers=headers)
        assert response.status_code == 200, response.text
        assert response.json() == {"id": task_id, **after}

        logs = read_logs()
        assert len(logs) == expected_count

        # 找出此次操作新增的记录，避免只凭列表位置判断
        new_logs = [
            log for log in logs
            if log["id"] not in previous_log_ids
        ]
        assert len(new_logs) == 1

        log = new_logs[0]
        assert log["action"] == "update"
        assert log["before_data"] == before
        assert log["after_data"] == after

    # 4. 空更新、相同值、清理空白后相同：不新增记录
    expected_task = {
        "id": task_id,
        "title": "学习 FastAPI",
        "completed": False,
    }
    original_logs = read_logs()
    assert len(original_logs) == 4

    for payload in (
        {},
        {"completed": False},
        {"title": " 学习 FastAPI "},
    ):
        response = client.patch(
            task_url,
            json=payload,
            headers=headers,
        )
        assert response.status_code == 200, response.text
        assert response.json() == expected_task
        assert read_logs() == original_logs

        response = client.get(task_url, headers=headers)
        assert response.status_code == 200, response.text
        assert response.json() == expected_task

    # 5. 删除任务
    previous_log_ids = {log["id"] for log in original_logs}

    response = client.delete(task_url, headers=headers)
    assert response.status_code == 204, response.text
    assert response.content == b""

    # 任务已删除，但历史仍然存在
    response = client.get(task_url, headers=headers)
    assert response.status_code == 404, response.text

    logs = read_logs()
    assert len(logs) == 5

    new_logs = [
        log for log in logs
        if log["id"] not in previous_log_ids
    ]
    assert len(new_logs) == 1

    delete_log = new_logs[0]
    assert delete_log["action"] == "delete"
    assert delete_log["before_data"] == {
        "title": "学习 FastAPI",
        "completed": False,
    }
    assert delete_log["after_data"] is None

    # 原来的四条记录也必须完整保留
    retained_logs = [
        log for log in logs
        if log["id"] in previous_log_ids
    ]
    assert retained_logs == original_logs

    # 6. 重复删除，不产生新记录
    response = client.delete(task_url, headers=headers)
    assert response.status_code == 404, response.text
    assert read_logs() == logs


# 验证操作记录写入失败时，任务变更也会回滚
@pytest.mark.parametrize("operation", ["create", "update", "delete"])
def test_log_failure_rolls_back_task(client, db_engine, operation):
    # 1. 注册并登录
    credentials = {
        "username": "rollback-user",
        "password": "example-password-123",
    }

    response = client.post("/users", json=credentials)
    assert response.status_code == 201, response.text
    user_id = response.json()["id"]

    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 200, response.text

    headers = {
        "Authorization": f"Bearer {response.json()['access_token']}",
    }

    # 2. 准备一条已有任务，此时尚未注入故障
    response = client.post(
        "/tasks",
        json={"title": "原始任务"},
        headers=headers,
    )
    assert response.status_code == 201, response.text

    original_task = response.json()
    task_id = original_task["id"]

    # 查询完整列表，用于比较故障发生前后的状态
    def read_state():
        response = client.get(
            "/tasks",
            params={"offset": 0, "limit": 100},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        tasks = response.json()

        response = client.get(
            "/task-logs",
            params={"offset": 0, "limit": 100},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        logs = response.json()

        return tasks, logs

    original_tasks, original_logs = read_state()
    assert original_tasks == [original_task]
    assert len(original_logs) == 1
    assert original_logs[0]["action"] == "create"

    # # 3. 只在测试数据库中安装触发器，拒绝后续记录插入
    # with db_engine.begin() as connection:
    #     connection.exec_driver_sql("""
    #         CREATE TRIGGER reject_task_log_insert
    #         BEFORE INSERT ON task_logs
    #         BEGIN
    #             SELECT RAISE(ABORT, 'test log insertion failure');
    #         END
    #     """)
    # 3. 插入记录前，故意使其违反数据库非空约束
    def invalidate_log(mapper, connection, target):
        target.actor_id = None

    event.listen(TaskLog, "before_insert", invalidate_log)

    try:
        # 4. 发起操作，让真实数据库拒绝日志写入
        if operation == "create":
            response = client.post(
                "/tasks",
                json={"title": "不应保留的新任务"},
                headers=headers,
            )
        elif operation == "update":
            response = client.patch(
                f"/tasks/{task_id}",
                json={
                    "title": "不应保留的修改",
                    "completed": True,
                },
                headers=headers,
            )
        else:
            response = client.delete(
                f"/tasks/{task_id}",
                headers=headers,
            )

        assert response.status_code == 500, response.text
    finally:
        # # 即使测试断言失败，也清除故障注入
        # with db_engine.begin() as connection:
        #     connection.exec_driver_sql(
        #         "DROP TRIGGER IF EXISTS reject_task_log_insert"
        #     )
        # 无论请求或断言是否失败，都恢复正常行为
        event.remove(TaskLog, "before_insert", invalidate_log)

    # 5. 通过新请求确认任务及记录均未改变
    tasks, logs = read_state()
    assert tasks == original_tasks
    assert logs == original_logs

    response = client.get(
        f"/tasks/{task_id}",
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert response.json() == original_task

    # 6. 再用独立 Session 检查数据库，避免只依赖接口返回值
    with Session(db_engine) as db:
        task_count = db.scalar(
            select(func.count()).select_from(Task)
        )
        log_count = db.scalar(
            select(func.count()).select_from(TaskLog)
        )

        assert task_count == 1
        assert log_count == 1

        task = db.get(Task, task_id)
        assert task is not None
        assert task.title == "原始任务"
        assert task.completed is False
        assert task.owner_id == user_id