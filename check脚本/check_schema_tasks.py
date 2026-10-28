from pydantic import BaseModel, ConfigDict, Field

from app.schemas import TaskCreate

from app.schemas import TaskUpdate
from pydantic import ValidationError

task1 = TaskCreate(title="校验输入测试")
print(task1.title)

# task2 = TaskCreate(title="")
# print(task2.title)  # 失败

# task3 = TaskCreate(title=" ")
# print(task3.title)  # 失败

# task4 = TaskCreate()
# print(task4.title)  # 失败

# task5 = TaskCreate(title="a" * 201)
# print(task5.title)  # 失败

# task6 = TaskCreate(title="abc", id=1)
# print(task6.title)  # 失败


# 合法输入：验证校验后的更新内容
assert TaskUpdate().model_dump(exclude_unset=True) == {}

assert TaskUpdate(completed=False).model_dump(
    exclude_unset=True
) == {"completed": False}

assert TaskUpdate(title="  新标题  ").model_dump(
    exclude_unset=True
) == {"title": "新标题"}

assert TaskUpdate(title="a" * 200).title == "a" * 200

# 非法输入：每一项都必须被拒绝
invalid_inputs = [
    {"title": None},
    {"completed": None},
    {"title": ""},
    {"title": "   "},
    {"title": "a" * 201},
    {"id": 1},
]

for data in invalid_inputs:
    try:
        TaskUpdate(**data)
    except ValidationError:
        print("符合预期：拒绝", data)
    else:
        raise AssertionError(f"本应拒绝，但校验通过：{data}")

print("全部验证通过")