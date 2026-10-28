from pydantic import ValidationError

from app.schemas import UserCreate, UserRead


# 1. 合法输入：用户名去空白，密码保持原样
user = UserCreate(
    username="  Alice  ",
    password="  abcdefgh  ",
)

assert user.username == "Alice"
assert user.password == "  abcdefgh  "


# 2. 合法长度边界
for username_length in (3, 50):
    for password_length in (8, 128):
        UserCreate(
            username="a" * username_length,
            password="x" * password_length,
        )


# 3. 非法输入：每一种都应抛出 ValidationError
valid_data = {
    "username": "Alice",
    "password": "abcdefgh",
}

invalid_cases = [
    ("纯空白用户名", {**valid_data, "username": "   "}),
    ("用户名过短", {**valid_data, "username": "ab"}),
    ("用户名过长", {**valid_data, "username": "a" * 51}),
    ("密码过短", {**valid_data, "password": "x" * 7}),
    ("密码过长", {**valid_data, "password": "x" * 129}),
    ("缺少用户名", {"password": "abcdefgh"}),
    ("缺少密码", {"username": "Alice"}),
    ("用户名为 None", {**valid_data, "username": None}),
    ("密码为 None", {**valid_data, "password": None}),
    ("额外字段", {**valid_data, "id": 1}),
]

for name, data in invalid_cases:
    try:
        UserCreate(**data)
    except ValidationError:
        print(f"通过：{name}被拒绝")
    else:
        raise AssertionError(f"失败：{name}本应被拒绝")


# 4. 从对象属性读取响应，并排除密码相关字段
class FakeUser:
    id = 1
    username = "Alice"
    password = "example-password"
    password_hash = "example-hash"


result = UserRead.model_validate(FakeUser()).model_dump()

assert result == {
    "id": 1,
    "username": "Alice",
}

print("全部验证通过")