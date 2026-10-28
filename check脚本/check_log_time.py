from datetime import datetime, timedelta, timezone

from app.schemas import TaskLogRead


expected = datetime(2026, 10, 26, 8, 0, tzinfo=timezone.utc)

cases = [
    ("无时区时间", datetime(2026, 10, 26, 8, 0)),
    ("UTC 时间", expected),
    (
        "北京时间",
        datetime(
            2026, 10, 26, 16, 0,
            tzinfo=timezone(timedelta(hours=8)),
        ),
    ),
]

for name, input_time in cases:
    result = TaskLogRead(
        id=1,
        actor_id=1,
        task_id=1,
        action="create",
        before_data=None,
        after_data={"title": "测试", "completed": False},
        created_at=input_time,
    )

    # 必须有时区，且偏移量为零
    assert result.created_at.tzinfo is not None
    assert result.created_at.utcoffset() == timedelta(0)

    # 三种输入最终都表示同一个 UTC 时刻
    assert result.created_at == expected

    # 验证 JSON 输出也明确包含 UTC 标记
    output_time = result.model_dump(mode="json")["created_at"]
    assert output_time.endswith(("Z", "+00:00"))

    print(f"{name}：通过，输出 {output_time}")

print("时间验证：全部通过")