# [Bug][前端] 复现并消除管理后台残留 console error，补齐异步页面错误态

## 背景

历史试点验收记录（`docs/pilot-acceptance.md`）曾报告浏览器元数据存在 1 条 console error，并记录订单、客户和仪表盘首次跳转时可能短暂显示为 0。该记录可能已随代码变化而过期，因此本 issue 的第一步必须是复现并保存错误正文，而不是直接假定根因。

源码现状并非“完全没有 loading”：客户、渠道和同步日志等页面已经使用 `v-loading` / `empty-text`，异常时也常有 `ElMessage.error`。真正缺口是页面级 error 状态和可重试入口不一致；`ChannelManage.vue`、`ChannelSyncLog.vue`、`PropertyManage.vue` 的失败路径仍直接写 `console.error` / `console.warn`。

## 上手难度

中等。无需改数据库，先复现归因，再做最小范围的状态收敛。

## 涉及模块 / 文件

### console error 归因与错误态

- `src/views/admin/ChannelManage.vue`
- `src/views/admin/ChannelSyncLog.vue`
- `src/views/admin/property/PropertyManage.vue`
- `src/services/request.ts`（如需统一读取响应头 `X-Request-ID`）

### 首屏 0 值与 loading 复核

- `src/views/admin/Dashboard.vue`
- `src/views/admin/OrderManage.vue`
- `src/views/admin/CustomerManage.vue`

### 验收记录

- `docs/pilot-acceptance.md`

只有多个页面出现相同状态模式时，才新增公共状态组件；不要为单页问题提前抽象。

## 验收标准

- [ ] 在当前 HEAD 上复现并记录原始 console error 正文、URL、触发步骤和请求 `X-Request-ID`
- [ ] 若无法复现，更新历史验收记录并保留“未复现”的环境与步骤，不伪造修复
- [ ] 登录后依次访问仪表盘、订单、客户、房源、渠道和渠道同步日志；正常成功路径 console error 数量为 0
- [ ] 首次加载期间展示 loading，不先渲染误导性的统计 0 值
- [ ] 空数据与接口失败分别展示 empty / error 状态
- [ ] error 状态提供可操作的重试入口
- [ ] 401 继续走现有登录失效流程；500/网络失败不得被误显示为空数据
- [ ] 用户提示或诊断信息展示后端 `X-Request-ID`（存在时），且不泄露 token、响应体敏感字段
- [ ] 更新试点验收记录，写清浏览器交互与 console 证据

## 自测要求

- [ ] `npm run test:quality`
- [ ] 启动前后端后完成上述页面交互
- [ ] 人为制造 401、500、空数组、断网和慢响应
- [ ] 记录浏览器 URL、console error 数量、关键 DOM 状态和 `X-Request-ID`

## 非目标

- 不实现真实 OTA API
- 不重做页面视觉风格
- 不通过删除所有 `console.error` 或静默吞错来“清零”
