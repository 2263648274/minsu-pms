# [Feature][前端] 补齐 Capacitor Android WebView 交互与 debug APK 验收

## 背景

仓库已有 Capacitor 5 Android 工程，但当前仍保留模板身份：

- `capacitor.config.ts`：`appId=com.crud.template`、`appName=CRUDTemplate`
- `android/app/build.gradle`：`namespace/applicationId=com.crud.template`、`versionCode=1`、`versionName=1.0`

此外，`npm run build:android` 实际只执行 Vite build、`cap copy` 和 `cap sync`，**不会产出 APK**。本 issue 应聚焦管理端在 Android WebView 的真实交互和 debug APK 构建，不把网页构建成功误报为 APK 验收。

## 上手难度

中高。涉及响应式布局、Capacitor 配置、Android 包身份和模拟器/真机验证。

## 涉及模块 / 文件

- `src/layouts/`
- `src/views/admin/Dashboard.vue`
- `src/views/admin/InventoryManage.vue`
- `src/views/admin/OrderManage.vue`
- `src/views/admin/RatePlanManage.vue`
- `capacitor.config.ts`
- `android/app/build.gradle`
- `android/app/src/main/java/`（包名变更时同步目录与 package）
- 新增移动端验收文档

## 验收标准

- [ ] 先由维护者确认正式 `appId`、应用名和版本策略，再同步 Capacitor 与 Android 配置
- [ ] 360×800、412×915 视口下核心页面无非预期横向页面溢出；允许表格自身在明确容器内横向滚动
- [ ] 导航、抽屉、弹窗、日期选择和表格操作可触控
- [ ] 库存与房价日历支持小屏查看和编辑，不遮挡主要操作
- [ ] Android 返回键优先关闭当前弹窗/抽屉或返回上一页，不在可返回时直接退出应用
- [ ] 明确登录态持久化策略；token 失效后能清理状态并返回登录页，日志中不输出 token
- [ ] `npm run build:android` 通过（仅代表 Web 资源构建与 Capacitor 同步）
- [ ] 在 `android/` 执行 `gradlew.bat assembleDebug` 通过，并确认产物 `android/app/build/outputs/apk/debug/app-debug.apk`
- [ ] 在模拟器或真机完成登录 → 查订单 → 改库存（测试数据）→ 查看报表的录屏验收

## 自测要求

- [ ] `npm run test:quality`
- [ ] `npm run build:android`
- [ ] `cd android && .\gradlew.bat assembleDebug`
- [ ] Android 模拟器或真机交互
- [ ] 验证旋转屏幕、软键盘、系统返回键、断网与恢复网络

## 非目标

- 不在本 issue 中生成或使用生产签名
- 不上架应用市场
- 不把 debug APK 验收描述为 release/发布完成
- 不引入新的移动 UI 框架
