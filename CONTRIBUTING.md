# 贡献指南

感谢参与 minsu-pms。仓库当前采用 Vue 3 + TypeScript 前端、Spring Boot + MyBatis-Plus 后端和 MySQL；**本仓库没有 Prisma**。涉及后端模型层的任务应基于现有 Java Entity、Mapper、Service 与 Flyway migration 落地，除非维护者另行批准技术栈迁移。

## 开始前

1. 从最新 `main` 创建短生命周期分支。
2. 一张 issue 对应一个可独立验收的改动，不夹带格式化或无关重构。
3. 先阅读相关领域类型、API 契约、Flyway migration 和租户隔离实现。
4. 不提交真实账号、密钥、客户身份信息、生产抓包或数据库备份。

## 分支与提交

推荐分支名：

- `feat/<issue>-<short-name>`
- `fix/<issue>-<short-name>`
- `chore/<issue>-<short-name>`
- `docs/<issue>-<short-name>`

提交信息使用 Conventional Commits：

- `feat: ...`
- `fix: ...`
- `test: ...`
- `docs: ...`
- `chore: ...`

每个提交应可单独说明、审查和回退。禁止重写他人的未提交工作，禁止未经授权直接 push 到 `main`。

## 本地验证

前端改动至少执行：

```bash
npm run lint
npm run typecheck
npm run build
```

也可一次执行 `npm run test:quality`。

后端改动至少执行：

```bash
cd backend
mvn -B verify
```

涉及真实接口或不变量时，根据改动范围补跑：

```bash
npm run test:api
npm run test:tenant
npm run test:booking-concurrency
npm run test:security
```

这些冒烟测试要求后端和测试数据库已启动。构建通过不等于浏览器、容器或部署验收通过。

## 数据库与租户边界

- Schema 变更只能新增 Flyway migration；不得修改已发布 migration 来伪造升级结果。
- 所有业务读写必须受当前 `tenant_id` 约束。
- 新增唯一约束时优先把 `tenant_id` 纳入组合键。
- 关联写入必须验证父记录属于当前租户，例如 `rate_plan.room_type_id`、`rate_calendar.rate_plan_id` 与 `room_type_id`。
- migration 必须兼容已有数据并提供回滚/恢复说明；禁止破坏性清表。
- 金额口径需写清：前端使用 cents，后端使用 `DECIMAL` 元。

## OTA 与日志

- 未获得真实平台凭据和官方文档前，不得把骨架适配器描述为真实接入成功。
- issue/PR 需注明平台、操作类型、失败分类、重试/幂等策略和关联 ID。
- 抓包必须脱敏：移除 token、cookie、手机号、身份证、app secret 与签名原文。
- 日志不得记录明文凭据；请求与响应样例只能使用伪造值。

## Pull Request 要求

PR 必须：

- 关联 issue，并说明范围与明确不做的事项。
- 列出修改文件、风险、迁移影响和验收点。
- 附实际执行过的命令与结果；未执行的检查必须明确写出原因。
- UI 改动附截图或录屏，并覆盖 loading、empty、error 和成功状态。
- 数据库改动附 migration 验证、租户隔离和唯一约束证据。
- 等待 CI 全部通过后再请求 review；未经维护者 review 不 push/merge。

提交前请使用仓库的 PR 模板完成自检。
