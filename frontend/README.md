# 拾序前端

React + TypeScript + Vite 构建的学生任务工作台，直接调用仓库既有 FastAPI 接口。

```powershell
npm ci
npm run dev
```

访问 http://127.0.0.1:5173，默认 API 为 http://127.0.0.1:8000。后端需要另行启动。

- `npm test`：前端自动化测试。
- `npm run typecheck`：类型检查。
- `npm run build`：类型检查及生产构建，产物在 dist/。
- `npm run preview`：在相同的 5173 端口预览产物，先停止 dev。
- `npm run format`：格式化源码。

完整功能、配置、架构、部署和验证证据见 [前端文档](../docs/前端文档.md)；逐项 review 见 [前端实现任务](../docs/前端实现任务.md)。
