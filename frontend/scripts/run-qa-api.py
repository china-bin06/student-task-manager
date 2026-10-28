"""用临时 SQLite 启动现有后端，供前端人工联调；不接触开发数据库。"""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[2]
with socket.socket() as probe:
    try:
        probe.bind(("127.0.0.1", 8000))
    except OSError:
        raise SystemExit("8000 端口已占用；不会接管现有服务。请先使用既有服务或自行选择测试端口。")

with tempfile.TemporaryDirectory(prefix="shixu-qa-") as directory:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = "sqlite:///" + (Path(directory) / "qa.db").as_posix()
    environment["JWT_SECRET_KEY"] = secrets.token_hex(32)
    environment["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=root, env=environment, check=True)
    try:
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=root, env=environment, check=True)
    except KeyboardInterrupt:
        pass
