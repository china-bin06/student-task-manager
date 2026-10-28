# 历史学习验证脚本

这里保存从根目录迁入的 11 个 check_*.py，迁移时保持代码内容不变，供回顾学习过程使用。它们不属于当前版本的启动流程或自动化测试。

部分脚本有数据库读写操作，并直接读取根目录配置。例如 check_task.py 创建任务时未填写现行模型要求的 owner_id，不能用于验证当前任务创建流程。不要把全部脚本连续运行当作验收。

需要运行某个适用于当前阶段的脚本时，从项目根目录使用模块形式，确保可以导入 app。下例仅校验请求模型：

```powershell
.\.venv\Scripts\python.exe -m check脚本.check_schema_tasks
```

当前功能验证使用正式接口测试和前端测试。在项目根目录执行：

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_tasks.py -q
npm --prefix frontend test
npm --prefix frontend run build
```

接口测试的数据库隔离规则见根 README。涉及旧数据库修补的 backfill_task_owner.py 仍保留在根目录，不在日常启动时执行。
