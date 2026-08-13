# CRUD Frontend Template

[![Vue 3](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-409EFF?style=flat-square&logo=element&logoColor=white)](https://element-plus.org/)
[![Pinia](https://img.shields.io/badge/Pinia-FCD34D?style=flat-square&logo=pinia&logoColor=black)](https://pinia.vuejs.org/)

通用前端 CRUD 开发模板，基于 Vue 3 + TypeScript 构建，开箱即用，支持响应式多端适配。

## ✨ 特性

- 🎨 **双端架构** - 用户端 + 管理员端分离设计
- 🌓 **深色模式** - 支持浅色/深色主题一键切换
- 📱 **全响应式** - 完美适配桌面端、平板、手机
- 📲 **原生移动应用** - 支持 Capacitor 打包成 Android/iOS 原生应用
- 🔐 **权限管理** - 基于角色的路由权限控制
- 🎯 **TypeScript** - 全程类型推导，更好的开发体验
- ⚡ **Vite 驱动** - 极速的开发启动和热更新
- 🎭 **流畅动画** - GSAP 动画 + 视差滚动 + 卡片光斑效果
- 📦 **组件化** - 清晰的项目结构，易于扩展

## 🛠️ 技术栈

- **框架:** Vue 3 + Composition API + `<script setup>`
- **语言:** TypeScript
- **构建工具:** Vite
- **UI 组件库:** Element Plus
- **状态管理:** Pinia
- **路由:** Vue Router
- **动画:** GSAP
- **样式:** SCSS
- **移动端:** Capacitor（支持原生App打包）

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/your-username/crud-frontend-template.git

# 进入项目目录
cd crud-frontend-template

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📦 构建

```bash
# 生产构建
npm run build

# 预览构建结果
npm run preview
```

## 📲 移动端打包

项目集成 [Capacitor](https://capacitorjs.com/)，支持打包成 Android/iOS 原生应用：

```bash
# 构建网页资源
npm run build

# 同步资源到原生项目
npx cap sync

# 打开 Android Studio 编译调试
npx cap open android

# 打开 Xcode 编译调试（仅 macOS）
npx cap open ios
```

## 📁 项目结构

```
├── src/
│   ├── components/      # 通用组件
│   │   └── user/       # 用户端组件
│   ├── composables/     # 组合式函数
│   ├── layouts/        # 布局组件
│   ├── pages/          # 页面路由
│   ├── router/         # 路由配置
│   ├── services/       # API 服务
│   ├── store/          # Pinia 状态管理
│   │   └── modules/    # 状态模块
│   ├── styles/         # 全局样式
│   ├── types/          # 类型定义
│   └── views/          # 页面视图
│       ├── user/       # 用户端页面
│       ├── admin/      # 管理员端页面
│       └── error/      # 错误页面
├── public/             # 静态资源
├── android/            # Android 原生工程（Capacitor）
└── capacitor.config.ts # Capacitor 配置
```

## 🔄 路由说明

### 用户端
- `/` - 首页
- `/features` - 功能特性
- `/about` - 关于我们
- `/profile` - 个人中心 (需要登录)

### 管理员端
- `/admin/login` - 登录
- `/admin/register` - 注册
- `/admin/dashboard` - 仪表盘
- `/admin/user` - 用户管理
- `/admin/role` - 角色管理
- `/admin/profile` - 个人信息

## 🎨 设计特色

- **Linear Design 风格** - 简约现代的设计语言
- **CSS 变量主题** - 深浅色模式无缝切换
- **毛玻璃效果** - 顶部导航栏使用 backdrop-filter
- **渐变色搭配** - 紫蓝渐变主题色
- **安全区域适配** - 适配刘海屏和底部指示条

## 📱 移动端适配

- 顶部导航栏菜单自动隐藏
- 底部固定标签栏导航
- 内容区域底部预留安全空间
- 栅格系统自动适配

## 🔑 认证流程

1. 用户登录后存储 Token 到 localStorage
2. 路由守卫自动验证 Token 有效性
3. 根据用户角色分配访问权限
4.  Token 失效自动清除并重定向登录页

## 📝 环境变量

项目提供两个环境配置文件：

- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

可用环境变量：

```env
# 应用标题
VITE_APP_TITLE=CRUD Template

# API 基础地址
VITE_APP_BASE_API=http://localhost:3000/api

# 是否启用 Mock 数据（纯前端演示请设为 true）
VITE_APP_MOCK_ENABLED=true
```

**说明：**
- 当 `VITE_APP_MOCK_ENABLED=true` 时，所有请求使用本地 Mock 数据，无需后端服务即可运行
- 打包原生 App 演示时，请确保 `VITE_APP_MOCK_ENABLED=true`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

觉得有用别忘了点个 Star ⭐️
