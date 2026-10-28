FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 先安装依赖，业务代码变化时可以复用依赖安装层
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt

# 只复制运行应用和执行迁移需要的文件
COPY main.py alembic.ini ./
COPY app/ ./app/
COPY migrations/ ./migrations/

# 使用普通用户运行应用
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]