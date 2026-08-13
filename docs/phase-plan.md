# 民宿 PMS 改造蓝图

> 项目定位：类似百居易的民宿/酒店 PMS 管理系统，专为**民宿管理者**使用，**不对用户开放**。
> 当前阶段：通用 CRUD 模板 → 民宿 PMS 第一阶段改造。
> 最后更新：2026-08-13

---

## 0. 决策摘要

| 决策项 | 选择 |
| --- | --- |
| 改造节奏 | **分阶段交付**（5 阶段） |
| OTA 对接 | **先做骨架**，Phase 4 实现具体平台 |
| 后端策略 | **走平台 API**，不自研后端 |
| 用户端 | **完全删除** `views/user/`，仅保留管理端 |
| OTA 平台 | 携程（Ctrip）/ 飞猪（Fliggy）/ 美团（Meituan）/ 抖音（Douyin）/ 淘宝（Taobao） |

---

## 1. 总体阶段

| Phase | 主题 | 验收 |
| --- | --- | --- |
| **Phase 1** | 业务抽象 + OTA 适配层骨架 | 类型完整 + build 通过 + 路由可达 |
| Phase 2 | 管理端核心模块重做（房源/订单/客人/渠道/仪表盘） | 各模块 CRUD + 房价日历 |
| Phase 3 | OTA 适配器实现（5 平台） | 鉴权 + 库存/价格推送 + 订单拉取 |
| Phase 4 | 财务对账 + 报表 | 收入报表 + 渠道佣金 |
| Phase 5 | 移动端 + 报表（Capacitor + 报表导出） | APK 打包 + 报表导出 |

---

## 2. Phase 1 详细工作

### 2.1 删除用户端
- 删除 `src/views/user/`（Home/Features/About/Profile/Home.vue.bak）
- 删除 `src/components/user/`（ContentSection/HeroSection/Navbar/Tabbar）
- 删除 `src/layouts/UserLayout.vue`

### 2.2 路由表收敛
- 移除 `userRoutes`
- 保留 `adminRoutes`，扩展 PMS 模块占位（property/ratePlan/inventory/channel/finance 等）
- 主入口 `/` → 重定向到 `/admin/dashboard`

### 2.3 领域类型拆分（`src/types/domain/`）
- `property.ts` — Property / PropertyType / RoomType / RatePlan / Inventory
- `booking.ts` — Booking / BookingStatus / GuestInfo / CheckInRecord
- `guest.ts` — Guest / VipLevel / GuestPreference
- `channel.ts` — Channel / ChannelConfig / ChannelOrder / ChannelMapping
- `payment.ts` — Payment / Invoice / Refund / Commission
- `common.ts` — Response / PageResult / ID / DateRange / Money
- `index.ts` — 统一导出

### 2.4 Service 层重构（业务意图导向）
- `auth.ts` — login / getProfile / register
- `property.ts` — list / get / create / update / delete / searchAvailable
- `ratePlan.ts` — list / create / update / delete / setDailyRate
- `inventory.ts` — list / batchUpdate / getCalendar / lock / unlock
- `booking.ts` — list / create / update / checkIn / checkOut / cancel
- `guest.ts` — list / get / create / update / delete / search
- `channel.ts` — list / get / connect / disconnect / syncStatus / pushRate / pullOrders
- `payment.ts` — list / refund / generateInvoice
- `dashboard.ts` — getStats / getRevenue / getOccupancyRate
- `index.ts` — 统一导出

### 2.5 OTA 适配层骨架（`src/channels/`）
```
src/channels/
├── README.md                         # OTA 接入指南
├── types/
│   ├── ChannelAdapter.ts             # 统一接口契约
│   ├── ChannelTypes.ts               # 渠道类型定义
│   └── index.ts
├── core/
│   ├── ChannelManager.ts             # 渠道注册 + 路由
│   ├── InventorySyncEngine.ts        # 库存同步引擎
│   ├── RateSyncEngine.ts             # 价格同步引擎
│   └── OrderAggregator.ts            # 订单聚合 + 防超售
├── adapters/
│   ├── ctrip/index.ts                # 携程 PMS API
│   ├── fliggy/index.ts               # 飞猪 OpenAPI
│   ├── meituan/index.ts              # 美团 PMS
│   ├── douyin/index.ts               # 抖音民宿
│   └── taobao/index.ts               # 淘宝/飞猪
└── index.ts                          # 统一导出
```

#### ChannelAdapter 接口
```ts
interface ChannelAdapter {
  readonly id: ChannelId               // 'ctrip' | 'fliggy' | ...
  readonly displayName: string         // 中文显示名
  readonly protocol: 'pms-api' | 'openapi' | 'pms' | 'webhook'
  
  // 鉴权
  authenticate(config: ChannelConfig): Promise<AuthResult>
  refreshToken(config: ChannelConfig): Promise<AuthResult>
  
  // 库存
  pushInventory(propertyId: string, rooms: InventoryUpdate[]): Promise<ChannelResult>
  
  // 价格
  pushRate(propertyId: string, rates: RateUpdate[]): Promise<ChannelResult>
  
  // 订单
  pullOrders(since: Date): Promise<ChannelOrder[]>
  confirmOrder(channelOrderId: string): Promise<ChannelResult>
  cancelOrder(channelOrderId: string, reason: string): Promise<ChannelResult>
  
  // 健康检查
  ping(): Promise<{ ok: boolean; latencyMs: number }>
}
```

### 2.6 Mock 数据按 PMS 场景重塑
- 拆分到 `src/services/mock/{auth,property,rate,inventory,booking,guest,channel}.ts`
- 扩展 mock 数据：增加 RatePlan、Inventory、ChannelConfig 等

### 2.7 验收标准
- [ ] `views/user/` 目录与 `userRoutes` 路由表已彻底删除
- [ ] 领域类型完整：Property/RoomType/RatePlan/Inventory/Booking/Guest/Channel/Payment
- [ ] service 层按业务意图暴露（`bookingService.createOrder`），不再按 URL 直调
- [ ] OTA 适配层骨架：ChannelAdapter 接口 + 5 个平台 adapter 空壳 + ChannelManager 路由
- [ ] `tsc` 类型检查 + `vite build` 构建双通过
- [ ] 管理端路由可达，登录后可访问核心 PMS 模块占位页

---

## 3. PMS 业务全景（Phase 2 之后展开）

### 3.1 房源管理
- 房源/物业（Property）：地址、配套设施、营业执照、发票信息
- 房型（RoomType）：分类、面积、床型、可住人数
- 房价（RatePlan）：基础价、节假日价、渠道价、会员价
- 库存（Inventory）：每日房态、关房、限量
- 图集、配套设施、政策（入住/退房时间）

### 3.2 订单管理
- 直订订单 + OTA 订单聚合
- 订单状态：待支付 / 待入住 / 已入住 / 已退房 / 已取消 / 部分退款
- 入住记录：身份证扫描、人数核验
- 订单备注、特殊要求

### 3.3 渠道管理（OTA）
- 渠道列表：携程 / 飞猪 / 美团 / 抖音 / 淘宝
- API 凭证管理、刷新
- 库存/价格推送、订单拉取
- 同步日志、错误重试
- 佣金规则、平台费率

### 3.4 客人管理
- 会员档案、消费记录
- VIP 等级、偏好
- 黑名单、备注
- 来源渠道统计

### 3.5 财务对账
- 收入日报 / 月报
- 渠道佣金、手续费
- 退款、发票
- 提现记录

### 3.6 报表统计
- 入住率、ADR、RevPAR
- 渠道占比、客单价
- 复购率、新客占比
- 同比环比