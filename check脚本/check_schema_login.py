from pydantic import ValidationError

from app.schemas import UserLogin


# 1. 用户名去空白，密码保持原样
payload = UserLogin(
    username="  Alice  ",
    password="  abcdefgh  ",
)
assert payload.username == "Alice"
assert payload.password == "  abcdefgh  "

# 2. 短密码格式合法，是否正确交给认证函数判断
assert UserLogin(username="Alice", password="x").password == "x"

# 3. 合法长度边界
for username_length in (3, 50):
    for password_length in (1, 128):
        UserLogin(
            username="a" * username_length,
            password="x" * password_length,
        )

# 4. 非法输入
valid_data = {"username": "Alice", "password": "abcdefgh"}

invalid_cases = [
    ("用户名为空", {**valid_data, "username": ""}),
    ("用户名只有空白", {**valid_data, "username": "   "}),
    ("用户名过短", {**valid_data, "username": "ab"}),
    ("用户名过长", {**valid_data, "username": "a" * 51}),
    ("密码为空", {**valid_data, "password": ""}),
    ("密码过长", {**valid_data, "password": "x" * 129}),
    ("缺少用户名", {"password": "abcdefgh"}),
    ("缺少密码", {"username": "Alice"}),
    ("用户名为 None", {**valid_data, "username": None}),
    ("密码为 None", {**valid_data, "password": None}),
    ("额外字段", {**valid_data, "id": 1}),
]

for name, data in invalid_cases:
    try:
        UserLogin(**data)
    except ValidationError:
        print(f"通过：{name}被拒绝")
    else:
        raise AssertionError(f"失败：{name}本应被拒绝")

print("登录请求模型：全部验证通过")