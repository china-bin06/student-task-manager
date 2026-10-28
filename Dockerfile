FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 先安装依赖，业务代码变化时可以复用依赖安装层
COPY requirements.txt ./
# 国内网络可在构建时指定公开的 PyPI 镜像地址；不要传入带凭证的 URL。
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN python -m pip install --no-cache-dir --index-url "${PIP_INDEX_URL}" --timeout 120 --retries 5 -r requirements.txt

# 只复制运行应用和执行迁移需要的文件
COPY main.py alembic.ini ./
COPY app/ ./app/
COPY migrations/ ./migrations/

# 使用普通用户运行应用
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
