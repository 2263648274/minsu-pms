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

---

## ✨ 核心模块

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 仪表盘 | ✅ | 今日营收 / 入住率 / 房态概览 |
| 房源管理 | ✅ | 物业 / 房型 / 房间三级管理 |
| **库存房态** | ✅ Phase 2 | 30/60/90 天日历，可视化关房 / 限量 |
| **房价管理** | 🚧 Phase 2 | 基础价 / 节假日 / 渠道 / 会员四维定价 |
| 订单管理 | ✅ | 多平台订单聚合与入住核验 |
| 客人管理 | ✅ | 客户档案 / VIP 等级 / 入住历史 |
| OTA 渠道 | 📅 Phase 3 | 携程 / 飞猪 / 美团 / 抖音 / 淘宝 一键上架 |
| 财务对账 | 📅 Phase 4 | 多平台结算单核对 |
| 营业报表 | 📅 Phase 4 | 营收 / ADR / RevPAR 可视化 |

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

### 1️⃣ 启动后端

```bash
cd backend

# 首次：复制环境变量模板并配置数据库连接
cp .env.example .env

# 启动 Spring Boot（Flyway 自动迁移数据库 schema）
mvn spring-boot:run

# 默认监听 http://localhost:8080
```

### 2️⃣ 启动前端

```bash
# 安装依赖
npm install

# 启动开发服务器（支持热更新）
npm run dev

# 默认监听 http://localhost:3000
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
| 系统管理员 | `admin` | `admin123` |

---

## 🗺️ 开发路线

| Phase | 主题 | 状态 |
| --- | --- | --- |
| **Phase 1** | 业务抽象 + OTA 适配层骨架 | ✅ 已完成 |
| **Phase 2** | 管理端核心模块（库存房态 / 房价管理） | 🚧 进行中 |
| **Phase 3** | OTA 适配器实现（5 平台） | 📅 待开始 |
| **Phase 4** | 财务对账 + 营业报表 | 📅 待开始 |
| **Phase 5** | 移动端优化 + 报表导出 | 📅 待开始 |

详细规划：[docs/phase-plan.md](docs/phase-plan.md)

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