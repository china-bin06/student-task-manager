import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings
from app.security import create_access_token


# 1. 正常签发，并验证签名、必需字段和有效期
before = datetime.now(timezone.utc)
token = create_access_token(user_id=123)
after = datetime.now(timezone.utc)

payload = jwt.decode(
    token,
    settings.jwt_secret_key,
    algorithms=[settings.jwt_algorithm],
    options={"require": ["sub", "exp"]},
)

assert payload["sub"] == "123"

# JWT 时间戳以秒表示，转换时可能舍去小数秒
lifetime = timedelta(minutes=settings.access_token_expire_minutes)
expected_min = int((before + lifetime).timestamp())
expected_max = int((after + lifetime).timestamp())

assert expected_min <= payload["exp"] <= expected_max
print("通过：用户 ID 和过期时间正确")


# 2. 使用错误密钥，必须验证失败
wrong_key = secrets.token_hex(32)

try:
    jwt.decode(
        token,
        wrong_key,
        algorithms=[settings.jwt_algorithm],
    )
except jwt.InvalidSignatureError:
    print("通过：错误密钥被拒绝")
else:
    raise AssertionError("错误密钥竟然通过了签名验证")


# 3. 构造已过期令牌，验证解码时会检查有效期
expired_token = jwt.encode(
    {
        "sub": "123",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
    },
    settings.jwt_secret_key,
    algorithm=settings.jwt_algorithm,
)

try:
    jwt.decode(
        expired_token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
except jwt.ExpiredSignatureError:
    print("通过：过期令牌被拒绝")
else:
    raise AssertionError("过期令牌竟然通过了验证")

print("令牌验证：全部通过")