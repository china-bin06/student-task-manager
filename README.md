# 学生任务管理系统

当前版本：**v3.0.0 · 部署上线版**。提供腾讯云 Ubuntu + Docker Compose + Nginx 部署流程、同源接口代理模板、日常启动和更新说明；版本名称表示交付范围，线上可用性仍需在服务器验证。

本地全栈版：**v2.0.0 · 本地完整版**。版本变化见 [更新记录](CHANGELOG.md)。

后端版：**v1.0.0 · 后端版**

基于 FastAPI、SQLAlchemy 和 JWT 的学习项目，提供用户注册登录、个人任务管理与操作历史查询。支持 SQLite 本地开发、PostgreSQL 和 Docker Compose 运行。

仓库包含 FastAPI 后端与 React 前端。接口仍可通过 Swagger UI 独立调用。

腾讯云上线流程、日常启动停止、更新与排错见 [腾讯云部署与启动说明](docs/腾讯云部署与启动说明.md)。

发布记录见 [CHANGELOG](CHANGELOG.md)，本次上传前的配置检查见 [v3.0.0 发布检查](docs/v3.0.0发布检查.md)。Nginx 模板位于 [deploy/nginx.conf](deploy/nginx.conf)，前端线上配置模板位于 [frontend/.env.production.example](frontend/.env.production.example)。

## 启动操作说明

以下命令使用 PowerShell，**均在项目根目录执行**。前端和后端分别启动；后端从下面两种方式中选择一种。

| 方式 | 运行组合 | 适用场景 |
| --- | --- | --- |
| A：本机 SQLite | 本机 Python 后端 + SQLite + 本机前端 | 快速开发，无需 Docker |
| B：Docker PostgreSQL | 容器后端 + 容器 PostgreSQL + 本机前端 | 使用项目现有 Compose 环境 |

环境准备：Python 3.12、Node.js 24（已验证 24.22.0 / npm 11.19.1）；方式 B 还需要启动 Docker Desktop，使用 Linux 容器及 Compose v2。已有数据库继续使用对应方式及配置；两种方式的数据不会自动互通。

### 1. 首次准备

两种方式都需要先安装前端依赖，已有依赖且锁文件未变化时可以跳过：

```powershell
npm --prefix frontend ci
```

**方式 A：准备本机后端。** 已有 `.venv` 时跳过创建；已有 `.env` 时保留原文件。

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

编辑根目录 `.env`：将 `DATABASE_URL` 设置为 `sqlite:///./student_tasks.db`，将 `JWT_SECRET_KEY` 设置为下面命令生成的随机值。已有有效密钥可继续使用。

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
```

配置完成后初始化或升级数据库：

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
```

**方式 B：准备容器后端。** 已配置并初始化过的环境可直接进入“日常启动”；有新迁移时仍需执行迁移命令。

```powershell
if (-not (Test-Path .env.postgres)) { Copy-Item .env.postgres.example .env.postgres }
if (-not (Test-Path .env.api)) { Copy-Item .env.api.example .env.api }
```

首次配置时分别生成数据库密码和 JWT 密钥：

```powershell
python -c "import secrets; print(secrets.token_hex(24))"
python -c "import secrets; print(secrets.token_hex(32))"
```

将数据库密码填入 `.env.postgres` 的 `POSTGRES_PASSWORD`，同时替换 `.env.api` 中 `DATABASE_URL` 的密码；将 JWT 密钥填入 `.env.api` 的 `JWT_SECRET_KEY`。保留模板中的容器连接地址 `postgres:5432`，两份文件的账号、密码和数据库名应一致。已有数据库请沿用当前凭证，单独修改配置文件不会改变库内密码。

```powershell
docker compose config --quiet
docker compose build api
docker compose up -d postgres
docker compose ps
```

等待 `postgres` 显示 `healthy` 后执行迁移：

```powershell
docker compose run --rm api python -m alembic upgrade head
docker compose run --rm api python -m alembic check
```

### 2. 日常启动：打开两个终端

**终端 1：启动后端。** 根据所选方式执行对应命令，不要同时启动两套后端占用 8000 端口。

方式 A：

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

方式 B：先启动 Docker Desktop，再执行：

```powershell
docker compose up -d postgres api
docker compose ps
```

修改后端代码后，方式 B 使用 `docker compose up -d --build api` 重建；有数据库迁移时先执行上面的 `alembic upgrade head`。

**终端 2：启动前端。** 两种方式使用同一条命令，保持终端运行：

```powershell
npm --prefix frontend run dev
```

### 3. 访问与停止

| 入口 | 地址 |
| --- | --- |
| 前端页面 | [http://127.0.0.1:5173](http://127.0.0.1:5173) |
| 后端健康检查 | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) |
| 后端接口文档 | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |

打开前端后先注册账号，再登录使用。前端默认连接 `http://127.0.0.1:8000`；请使用 `127.0.0.1:5173` 访问，现有后端 CORS 不允许 `localhost:5173` 来源。`/health` 只检查应用响应，数据库连接还需通过注册或查询任务验证。

- 停止前端：在前端终端按 `Ctrl+C`。
- 停止方式 A 后端：在后端终端按 `Ctrl+C`。
- 停止方式 B 后端和数据库：在根目录执行 `docker compose stop`，保留数据。不要将会删除数据库卷的 `docker compose down -v` 当作停止命令。

启动故障、环境变量覆盖、数据库连接地址和迁移细节见下方“配置说明”“Docker Compose 启动”“本机开发”；前端构建与部署见 [前端文档](docs/前端文档.md)。

## 前端

浅色“拾序”学习工作台提供注册登录、个人任务管理、标题搜索、完成状态筛选、操作历史与自动同步，沿用现有后端接口。

完整说明见 [前端文档](docs/前端文档.md)，逐项实现及 review 见 [前端实现任务](docs/前端实现任务.md)。

## 功能

- 用户注册：用户名唯一，密码通过 pwdlib / Argon2 哈希保存。
- JSON 登录：签发带有效期的 HS256 JWT，使用 Bearer 请求头访问受保护接口。
- 查询当前用户。
- 任务创建、单条查询、分页列表、部分更新和物理删除。
- 用户隔离：只能操作自己的任务，访问他人的任务统一返回 404。
- 创建、更新和删除记录：保存前后快照，与任务变更处于同一事务。
- 空更新或字段值未变化时不新增记录；任务删除后历史仍然保留。
- 操作历史支持任务 ID、操作类型筛选以及分页，响应时间统一为 UTC。

当前未实现刷新令牌、服务端令牌撤销、找回密码、角色管理或共享任务。

## 技术栈

| 用途 | 技术 |
| --- | --- |
| 前端语言与运行环境 | TypeScript、Node.js 24、npm |
| 前端框架 | React、React DOM |
| 前端路由 | React Router |
| 服务端数据与缓存 | TanStack Query，管理查询、缓存、写操作与定时同步 |
| 页面样式与图标 | 原生 CSS、响应式布局、Lucide React |
| 前端请求 | 浏览器 Fetch API、AbortController |
| 前端开发与构建 | Vite、@vitejs/plugin-react、TypeScript 类型检查 |
| 前端测试 | Vitest、Testing Library、jest-dom、jsdom |
| 前端代码格式化 | Prettier |
| 后端语言与运行环境 | Python 3.12、Uvicorn |
| HTTP API、校验与配置 | FastAPI、Pydantic、pydantic-settings |
| 数据访问与迁移 | SQLAlchemy 同步 Session、Alembic |
| 数据库 | SQLite、PostgreSQL 18、Psycopg 3 |
| 认证 | PyJWT、pwdlib / Argon2 |
| 后端测试 | pytest、HTTPX、FastAPI TestClient |
| 容器 | Docker、Docker Compose |

前端依赖声明见 `frontend/package.json`，精确版本见 `frontend/package-lock.json`；后端依赖见 `requirements.txt`，数据库版本见 `compose.yaml`。前端架构和各模块职责见 [前端文档](docs/前端文档.md)。

## 项目结构

```text
app/
  config.py           配置读取
  database.py         引擎、会话工厂和 ORM 基类
  models.py           User、Task、TaskLog
  schemas.py          请求与响应模型
  security.py         密码哈希、校验与 JWT 签发
  auth.py             用户名密码认证
  dependencies.py     数据库会话和当前用户依赖
  routers/
    users.py          注册与当前用户
    auth.py           登录
    tasks.py          任务 CRUD
    task_logs.py      历史记录查询
migrations/           Alembic 迁移历史
tests/                HTTP 测试与隔离数据库 fixture
frontend/             React 前端、自动化测试与构建配置
docs/                 前端设计、实现任务、使用文档与检查截图
check脚本/            历史学习验证脚本及适用范围说明
CHANGELOG.md          版本更新记录
main.py               应用入口、CORS 和路由注册
alembic.ini
Dockerfile
compose.yaml
requirements.txt
.env.example          本机开发配置模板
.env.api.example      API 容器配置模板
.env.postgres.example PostgreSQL 容器配置模板
```

`check脚本/` 中的 `check_*.py` 是学习期间的手动验证脚本，不代替 `tests/`，部分脚本沿用旧模型；使用方式与限制见 [脚本说明](check脚本/README.md)。`backfill_task_owner.py` 是针对既有开发数据的一次性脚本，包含固定任务和用户名，不应在新数据库中直接执行；新环境按迁移历史初始化即可。

## 配置说明

以下命令以 PowerShell 为例，均在项目根目录执行。

| 文件 | 读取方 | 用途 |
| --- | --- | --- |
| `.env` | 本机启动的应用和 Alembic | SQLite 或本机访问 PostgreSQL |
| `.env.api` | Compose 的 `api` 服务 | 容器中的应用与迁移命令 |
| `.env.postgres` | Compose 的 `postgres` 服务 | 数据库首次初始化 |
| `.env*.example` | 开发者复制填写 | 可以提交的无真实密钥模板 |

实际 `.env` 文件均被 Git 忽略，Docker 构建也排除了这些文件。不要提交真实密码、JWT 密钥或数据库文件。

应用字段：

| 变量 | 规则 / 默认值 |
| --- | --- |
| `APP_NAME` | 默认“学生任务管理系统” |
| `DATABASE_URL` | 默认 `sqlite:///./student_tasks.db`，相对启动目录解析 |
| `JWT_SECRET_KEY` | 必填，至少 64 个字符；应使用随机生成值 |
| `JWT_ALGORITHM` | 只允许 `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 正整数，默认 30 分钟 |

系统环境变量优先于 `.env`。改变环境变量不会更新已创建的配置对象，需要重新启动应用。

## Docker Compose 启动

需要 Docker Desktop（Linux 容器模式）和 Compose v2。以下生成密钥的命令使用本机 Python。

### 1. 准备配置

首次克隆后复制模板；已有运行配置时请编辑原文件，不要用模板覆盖真实值：

```powershell
if (-not (Test-Path .env.postgres)) { Copy-Item .env.postgres.example .env.postgres }
if (-not (Test-Path .env.api)) { Copy-Item .env.api.example .env.api }
```

分别执行以下命令生成数据库密码和 JWT 密钥：

```powershell
python -c "import secrets; print(secrets.token_hex(24))"
python -c "import secrets; print(secrets.token_hex(32))"
```

- 将数据库密码填入 `.env.postgres` 的 `POSTGRES_PASSWORD`，同时替换 `.env.api` 中 `DATABASE_URL` 的密码。
- 将 JWT 密钥填入 `.env.api` 的 `JWT_SECRET_KEY`，不要使用模板占位符。
- 两份文件的数据库账号、密码和库名必须一致。默认账号 `student_app`，库名 `student_tasks`。
- 推荐十六进制密码。若自行选择含 `@`、`:` 等特殊字符的密码，连接 URL 中的密码需要正确编码。

连接地址取决于应用运行位置：

| 应用位置 | 主机和端口 |
| --- | --- |
| API 容器 | `postgres:5432` |
| 本机 Python / 数据库客户端 | `127.0.0.1:5433` |

容器中的 `127.0.0.1` 指容器自身，不能用它访问另一个 PostgreSQL 容器。

### 2. 构建、启动数据库、执行迁移

```powershell
docker compose config --quiet
docker compose build api
docker compose up -d postgres
docker compose ps
```

等待数据库显示 `healthy` 后执行：

```powershell
docker compose run --rm api python -m alembic upgrade head
docker compose run --rm api python -m alembic current
docker compose run --rm api python -m alembic check
docker compose up -d api
```

API 默认启动命令不自动迁移。`depends_on` 的健康检查只等待数据库可连接，不会创建业务表；不要用 `stamp head` 代替执行迁移。

### 3. 验证与管理

- 健康检查：[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- 接口文档：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- OpenAPI：[http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

```powershell
docker compose ps
docker compose logs --tail 50 api
docker compose logs -f api
```

`/health` 只检查应用响应，不检查数据库。请通过注册、登录、创建任务等操作继续验证数据库连接。

| 操作 | 命令 |
| --- | --- |
| 启动数据库与 API | `docker compose up -d postgres api` |
| 更新后端代码后重建 | `docker compose up -d --build api` |
| 停止 API | `docker compose stop api` |
| 停止全部服务，保留容器和数据 | `docker compose stop` |
| 查看业务表 | `docker compose exec postgres psql -U student_app -d student_tasks -c '\dt'` |

查看日志时按 `Ctrl+C` 只退出日志跟踪，不停止容器。API 端口被本机 Uvicorn 占用时，应先停止该进程。

PostgreSQL 使用命名数据卷 `postgres_data`，PostgreSQL 18 的挂载点为 `/var/lib/postgresql`。重建容器不会自动清空数据；`docker compose down -v` 会删除相应数据卷和数据库数据，不是日常停止命令。

`.env.postgres` 的初始化变量主要用于空数据目录。修改文件不会自动修改已有数据库角色密码。API 运行配置修改后可用 `docker compose up -d --force-recreate api` 重新创建容器。

## 本机开发

需要 Python 3.12。项目中 SQLite 连接事件使用了 Python 3.12 的 `sqlite3.Connection.autocommit` 属性。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

编辑 `.env`：为 SQLite 使用 `DATABASE_URL=sqlite:///./student_tasks.db`，填写自行生成的 JWT 密钥，然后执行：

```powershell
python -m alembic upgrade head
python -m alembic check
python -m uvicorn main:app --reload
```

本机使用 PostgreSQL 时，先启动数据库，再在同一终端设置连接地址：

```powershell
$env:DATABASE_URL = 'postgresql+psycopg://student_app:替换为数据库密码@127.0.0.1:5433/student_tasks'
python -m alembic upgrade head
python -m uvicorn main:app --reload
```

如需恢复读取 `.env`，先停止应用，再执行 `Remove-Item Env:DATABASE_URL` 并重启。不要同时让容器 API 和本机 Uvicorn 占用 8000 端口。

现有迁移能在空数据库中创建表结构，不负责将 SQLite 的用户、任务和记录复制到 PostgreSQL。已有数据搬迁需要单独设计与验证。

## 接口与认证

| 方法 | 路径 | 说明 | 需要登录 |
| --- | --- | --- | --- |
| GET | `/health` | 应用健康检查 | 否 |
| POST | `/users` | 注册 | 否 |
| POST | `/auth/login` | JSON 登录，返回访问令牌 | 否 |
| GET | `/users/me` | 当前用户 | 是 |
| POST | `/tasks` | 创建任务，归属来自当前用户 | 是 |
| GET | `/tasks` | 本人任务分页列表 | 是 |
| GET | `/tasks/{task_id}` | 本人单条任务 | 是 |
| PATCH | `/tasks/{task_id}` | 部分更新 | 是 |
| DELETE | `/tasks/{task_id}` | 删除，成功返回空响应体 204 | 是 |
| GET | `/task-logs` | 本人操作记录、筛选及分页 | 是 |

注册与登录请求均为 JSON，例如：

```json
{
  "username": "demo-user",
  "password": "example-password-123"
}
```

注册密码长度为 8～128；登录输入接受 1～128 字符，再进行密码匹配。用户名清理首尾空白后长度为 3～50，区分大小写；密码保留原始空白。

登录响应包含 `access_token` 和 `token_type: "bearer"`。受保护请求使用：

```http
Authorization: Bearer <access_token>
```

在 `/docs` 中先调用登录接口，复制 `access_token`，点击 **Authorize** 后只粘贴令牌字符串。

创建任务示例：

```json
{"title": "学习 FastAPI"}
```

部分更新示例：

```json
{"completed": true}
```

- 任务标题清理首尾空白后长度为 1～200。
- PATCH 省略字段表示不修改，显式 `null` 被拒绝；`{}` 和实际值未变化不产生更新记录。
- 任务列表支持 `offset >= 0`、`1 <= limit <= 100`，默认 `0` 和 `10`，按任务 ID 升序。
- 记录列表使用同样的分页范围，按时间、记录 ID 倒序；可叠加 `task_id > 0` 与 `action=create|update|delete` 筛选。例如 `/task-logs?task_id=2&action=update&limit=20`。
- 无匹配列表返回 `[]`；不存在或不属于本人的单条任务返回 404。
- 无效输入通常返回 422；未认证返回 401；重复用户名返回 409。
- JWT 是签名凭证，载荷并未加密；不包含密码或密码哈希。

本地调试 CORS 当前仅允许来源 `http://127.0.0.1:5173`。`localhost` 与 `127.0.0.1` 不是同一来源，其他域名需修改 `main.py` 并重启或重建应用。CORS 不代替用户认证与归属校验。

## 自动化测试

先在本机虚拟环境安装依赖。当前共 13 个参数化展开后的案例，覆盖注册登录创建查询、未登录访问、跨用户隔离、更新删除历史以及记录插入失败后的事务回滚。

### SQLite

确保当前 PowerShell 没有指定 PostgreSQL 测试库：

```powershell
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
python -m pytest tests/test_tasks.py -v
```

每个案例使用独立内存数据库，外键检查开启，不访问本地 SQLite 数据文件。测试进程会在应用导入前设置隔离配置和随机 JWT 密钥，不修改 `.env`。

### PostgreSQL

创建专用测试库一次；已存在时不必重复创建：

```powershell
docker compose up -d postgres
docker compose exec postgres createdb -U student_app student_tasks_test
```

设置地址后运行全部测试：

```powershell
$env:TEST_DATABASE_URL = 'postgresql+psycopg://student_app:替换为数据库密码@127.0.0.1:5433/student_tasks_test'
python -m pytest tests/test_tasks.py -v
Remove-Item Env:TEST_DATABASE_URL
```

fixture 只接受驱动 `postgresql+psycopg` 和数据库名 `student_tasks_test`。它在每个案例前后删除并重建模型对应的表，库中不能存放需要保留的数据；当前不支持多个测试进程并行使用这个库。请勿把开发库或生产库当作测试库。

两种模式的回滚测试均使用临时 ORM 事件，将记录的 `actor_id` 置为 `None`，让数据库实际触发非空约束错误，并在结束后移除事件。故障仅在测试期间注入。

接口测试使用 `Base.metadata.create_all()` 准备结构，不会验证历史迁移链。迁移应另在空数据库上执行 `alembic upgrade head`、`alembic current` 和 `alembic check`；`check` 也不能覆盖所有数据库专有表选项。

## 迁移与数据约定

- 使用 Alembic 管理结构变更，提交 `migrations/`，不提交本地数据库文件。
- SQLite 表修改采用批量迁移。`Task` 显式启用 SQLite `AUTOINCREMENT`，避免自动复用已提交后删除的任务 ID；以后重建该表时仍需检查选项和序列是否保留。
- `TaskLog.task_id` 是历史标识，不设置任务外键；`actor_id` 外键引用用户。当前没有删除用户功能。
- `before_data`、`after_data` 使用 JSON，Python `None` 存为 SQL `NULL`。
- 所有记录由应用按 UTC 生成。SQLite 返回的无时区时间按 UTC 解释，响应统一输出 UTC 标记；不要将其他时区的无时区数据混入此约定。
- 任务变更和记录写入只提交一次。`flush()` 可获取任务 ID，但不等于提交；记录写入失败时二者一起回滚。
