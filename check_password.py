from app.security import hash_password, verify_password


# 使用测试密码，不要填写真实账号密码
password = "example-password-123"

# 1. 正确密码应通过
password_hash = hash_password(password)
assert verify_password(password, password_hash) is True

# 2. 错误密码应被拒绝
assert verify_password("wrong-password", password_hash) is False

# 3. 同一密码生成两次哈希：结果不同，但都能验证
another_hash = hash_password(password)
assert password_hash != another_hash
assert verify_password(password, another_hash) is True

# 4. 密码中的首尾空格必须保留
spaced_password = "  example-password-123  "
spaced_hash = hash_password(spaced_password)

assert verify_password(spaced_password, spaced_hash) is True
assert verify_password(spaced_password.strip(), spaced_hash) is False

print("密码哈希与校验：全部验证通过")