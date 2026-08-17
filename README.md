# 民宿主后台系统 · minsu-pms

[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-409EFF?style=flat-square&logo=element-plus&logoColor=white)](https://element-plus.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot%202.7-6DB33F?style=flat-square&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![MyBatis-Plus](https://img.shields.io/badge/MyBatis--Plus%203.5-2C8EB7?style=flat-square)](https://baomidou.com/)
[![MySQL](https://img.shields.io/badge/MySQL%208-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-1199EE?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

> 民宿 PMS（Property Management System）管理系统，专为民宿管理者使用，**不对用户开放**。
> 类似百居易的全栈方案：房源管理、库存房态、房价管理、订单管理、OTA 渠道分发、财务对账、营业报表。
>
> **当前状态（2026-08）：** Phase 2 核心链路已贯通，含内置浏览器 UI 回归和家庭旅馆试点验收；
> 第二阶段加固（事务库存、租户隔离、RBAC + 凭据保护、生产可观测性、非破坏迁移）已全部完成。
> OTA 真实平台接入仍按计划排在 Phase 3，统一通过 `src/channels/` 适配层接入。

---

## ✨ 核心模块

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 仪表盘 | ✅ Phase 2 | 今日概览、本月营收趋势、渠道表现和房型表现均接真实后端报表接口 |
| 房源管理 | ✅ Phase 2 | 物业 CRUD + 房型 / 房间 / 图集 / 入住政策；接入后端 `/api/properties`（CRUD + 分页查询） |
| **库存房态** | ✅ Phase 2 | 30/60/90 天日历，可视化关房 / 限量 |
| **房价管理** | ✅ Phase 2（基础价日历 MVP） | 房价计划列表与房型日历已接真实后端；支持单日改价 / 批量调价。当前范围为基础价，节假日 / 渠道 / 会员 / 连住优惠等扩展策略后续处理 |
| 库存日历 | ✅ Phase 2 | 30/60/90 天真实房态；缺失日期按该房型真实物理房间数初始化，支持单日改库存与批量关房 |
| 订单管理 | ✅ Phase 2 | 列表/创建/修改/删除/入住/退房/取消/退款均走真实后端状态机 |
| 客人管理 | ✅ Phase 2 | 客户 CRUD、消费历史详情、真实累计消费和黑名单筛选/切换均已接 `/api/customers` |
| OTA 渠道 | ⏸️ 暂缓 | 携程 / 飞猪 / 美团 / 抖音 / 淘宝配置与适配层骨架已保留；真实 OTA API 调用按计划最后处理 |
| 渠道同步日志 | ✅ Phase 2 数据层 | 列表、详情、统计与调试写入均接后端 `/api/sync-logs`；真实 OTA 同步事件留待 Phase 3 |
| 财务对账 | ✅ Phase 2 接线 | 已接后端 `/api/finance/stats`、`/api/finance/channel-settlements`、`/api/finance/order-settlements`；支持按渠道聚合、订单明细与 CSV 导出 |
| 营业报表 | ✅ Phase 2 接线 | 已接后端 `/api/reports/overview`、`trend`、`channel-breakdown`、`roomtype-breakdown`；展示 KPI、趋势及渠道 / 房型贡献 |
| 非 OTA mock 收尾 | ✅ 完成 | 非 OTA 主调用链已切真实后端；质量门与内置浏览器 UI 回归均通过 |
| 库存预订并发 | ✅ 已加固 | 库存预订改为事务化处理，关键路径覆盖幂等与并发竞争 |
| 租户级数据隔离 | ✅ 已加固 | 跨租户数据访问受约束，配合 `test:tenant` 双租户冒烟校验 |
| 角色权限与凭据 | ✅ 已加固 | RBAC 收紧；OTA 密钥加密 / 脱敏、审计可见；`test:security` 通过 |
| 生产运行与可观测性 | ✅ 已加固 | 健康检查、结构化日志、关键指标暴露，配套 `docs/operations-runbook.md` |
| 数据库迁移安全 | ✅ 已加固 | 启动迁移改为非破坏性方式，避免误删或覆盖业务数据 |
| 家庭旅馆试点验收 | ✅ 已记录 | 试点民宿已按核心业务路径完成验收，材料见 [`docs/pilot-acceptance.md`](docs/pilot-acceptance.md) |

---

## 🏗️ 技术栈

### 前端
- **Vue 3** + Composition API + `<script setup>`
- **TypeScript** 全程类型推导
- **Vite** 构建工具
- **Element Plus** UI 组件库
- **Pinia** 状态管理
- **Vue Router** + 路由守卫（基于角色）
- **Capacitor** Android 壳打包

### 后端 (`backend/`)
- **Spring Boot 2.7.18** + JDK 17
- **MyBatis-Plus 3.5.5** ORM
- **Spring Security** + **JWT (jjwt 0.12.5)**
- **Flyway** 数据库迁移
- **Hutool** 工具库

### 数据
- **MySQL 8.0+**

---

## 📁 项目结构

```
minsu-pms/
├── src/                          # 前端源码
│   ├── api/                      # axios 接口封装
│   ├── views/admin/              # 管理后台页面
│   │   ├── Dashboard.vue
│   │   ├── InventoryManage.vue   # 库存房态（Phase 2）
│   │   ├── RatePlanManage.vue    # 房价管理（Phase 2）
│   │   ├── RoomManage.vue
│   │   └── ...
│   ├── channels/                 # OTA 适配层骨架
│   │   ├── adapters/             # 5 平台 adapter 占位
│   │   ├── core/                 # ChannelManager / SyncEngine
│   │   └── types/                # ChannelAdapter 接口契约
│   ├── layouts/                  # 布局组件
│   ├── stores/                   # Pinia 状态模块
│   ├── types/domain/             # 领域类型（property / booking / channel ...）
│   ├── router/                   # 路由配置 + 守卫
│   └── styles/                   # 全局样式
├── android/                      # Capacitor 安卓工程
├── backend/                      # Spring Boot 后端
│   ├── src/main/java/com/xkzoom/
│   │   ├── controller/           # InventoryController / RateCalendarController ...
│   │   ├── service/
│   │   ├── mapper/               # MyBatis-Plus mapper
│   │   └── entity/               # Inventory / RoomType / Property ...
│   └── src/main/resources/
│       ├── db/migration/         # Flyway V1__init.sql 等
│       └── application.yml
├── docs/
│   └── phase-plan.md             # 详细阶段规划
├── public/                       # 静态资源
├── capacitor.config.ts
└── package.json
```

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- JDK 17 + Maven 3.8+
- MySQL 8.0+

### 🚀 一键启动（推荐）

```powershell
# 前置：MySQL 已启动（脚本会探测 3306，未启动会提示）
.\start-app.ps1        # 后台拉起前后端，立即返回
.\start-app.ps1 -Wait  # 阻塞模式：等后端健康检查通过再返回
.\stop-app.ps1         # 按端口停掉前后端
```

### 1️⃣ 启动后端

```bash
cd backend

# 首次：复制环境变量模板并配置数据库连接
cp .env.example .env

# 启动 Spring Boot（Flyway 自动迁移数据库 schema）
mvn spring-boot:run

# 默认监听 http://localhost:8090
```

### 2️⃣ 启动前端

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热更新）
npm run dev

# 默认监听 http://localhost:5173
```

### 3️⃣ 打包移动端（可选）

```bash
npm run build          # 构建网页资源
npx cap sync           # 同步到原生项目
npx cap open android   # 用 Android Studio 打开
```

### 🔑 默认账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 本地 `dev` 管理员 | `admin` | `admin123` |

> 默认账号仅由 `dev` profile 创建；生产环境不会创建默认管理员。

---

## 🗺️ 开发路线

| Phase | 主题 | 状态 |
| --- | --- | --- |
| **Phase 1** | 业务抽象 + OTA 适配层骨架 | ✅ 已完成 |
| **Phase 2** | 管理端核心模块 + 非 OTA mock 收尾 | ✅ 完成：核心链路、内置浏览器 UI 回归、家庭旅馆试点验收均已落地 |
| **Phase 2.5** | 第二阶段加固（事务/隔离/RBAC/可观测/非破坏迁移） | ✅ 完成；与 Phase 2 一并纳入交付基线 |
| **Phase 3** | OTA 适配器实现（5 平台） | ⏸️ 暂缓，按计划最后处理 |
| **Phase 4** | 财务对账 + 营业报表深度能力 | 🚧 基础对账、KPI、趋势、渠道/房型贡献和 CSV 已完成；深度财务能力后续扩展 |
| **Phase 5** | 移动端优化 + 报表导出 | 🚧 Capacitor Android 壳与 CSV 已有；APK 发布验收和移动端专项优化未完成 |

详细规划：[docs/phase-plan.md](docs/phase-plan.md)；试点验收：[docs/pilot-acceptance.md](docs/pilot-acceptance.md)；生产运维：[docs/operations-runbook.md](docs/operations-runbook.md)。

### 质量检查

```bash
npm run lint          # ESLint：硬错误必须为 0
npm run typecheck     # Vue + TypeScript 类型检查
npm run build         # Vite 生产构建
npm run test:api      # 对运行中的后端执行 13 项只读核心 API 冒烟
npm run test:tenant   # 真实双租户隔离冒烟
npm run test:booking-concurrency # 订单幂等、并发取消与库存竞争
npm run test:security # RBAC、OTA 密钥加密/脱敏与审计
npm run test:quality  # lint + typecheck + build
```

生产容器部署、备份恢复、监控指标与事故处理见
[生产运维手册](docs/operations-runbook.md)。

---

## 🔄 OTA 平台接入

| 平台 | 协议 | Phase |
| --- | --- | --- |
| 携程 Ctrip | PMS API | Phase 3 |
| 飞猪 Fliggy | OpenAPI | Phase 3 |
| 美团 Meituan | PMS | Phase 3 |
| 抖音 Douyin | OpenAPI | Phase 3 |
| 淘宝 Taobao | OpenAPI | Phase 3 |

`src/channels/` 提供统一 `ChannelAdapter` 接口，Phase 3 接入时各平台实现具体 API。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📄 许可证

MIT License
