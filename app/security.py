from pwdlib import PasswordHash

from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

password_hasher = PasswordHash.recommended()

def hash_password(password: str) -> str:
    # 使用 password_hasher.hash(password)，返回哈希字符串
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    # 使用 password_hasher.verify(password, password_hash)
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    # 1. 获取当前 UTC 时间
    now = datetime.now(timezone.utc)
    # 2. 根据配置计算过期时间
    expires_at = now + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id), # 令牌主体，这里使用用户 ID，必须转为字符串
        "exp": expires_at,  # 填入过期时间,PyJWT 会将时间对象转换为时间戳
    }

    # 3. 使用 jwt.encode(...) 签名，返回令牌字符串
    token = jwt.encode(
        payload, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return token