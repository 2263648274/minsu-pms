# OTA 渠道适配层

> 民宿 PMS 与外部 OTA 平台对接的标准化接口层。
> 当前阶段：**Phase 1 骨架**（接口契约 + 5 平台空壳）。
> Phase 4 将按真实平台 API 文档实现具体业务逻辑。

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────┐
│  业务层（PMS）                                            │
│  ChannelManage.vue / InventoryManage.vue / 订单管理 / ...  │
└────────────────────┬────────────────────────────────────┘
                     │ 调用
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Core 核心引擎                                            │
│  · ChannelManager        — 渠道注册 + 路由 + 健康检查     │
│  · InventorySyncEngine   — 库存推送（关房/限量）          │
│  · RateSyncEngine        — 价格推送（卖价/底价）          │
│  · OrderAggregator       — 订单拉取 + 防超售 + 去重       │
└────────────────────┬────────────────────────────────────┘
                     │ 调用统一接口
                     ▼
┌─────────────────────────────────────────────────────────┐
│  ChannelAdapter 接口契约                                   │
│  authenticate / refreshToken / pushInventory / pushRate  │
│  pullOrders / confirmOrder / cancelOrder / ping          │
└────────────────────┬────────────────────────────────────┘
                     │ 各自实现
       ┌─────────────┼─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼             ▼
   ┌────────┐  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
   │ 携程    │  │ 飞猪    │   │ 美团    │   │ 抖音    │   │ 淘宝    │
   │ PMS API│  │ OpenAPI│   │ PMS    │   │ OpenAPI│   │ OpenAPI│
   └────────┘  └────────┘   └────────┘   └────────┘   └────────┘
```

---

## 2. Phase 1 当前状态

| 组件 | 状态 | 备注 |
| --- | --- | --- |
| `ChannelAdapter` 接口 | ✅ 完成 | 9 个方法全部定义 |
| 携程 `CtripAdapter` | 🟡 骨架 | Phase 4 实现 |
| 飞猪 `FliggyAdapter` | 🟡 骨架 | Phase 4 实现 |
| 美团 `MeituanAdapter` | 🟡 骨架 | Phase 4 实现 |
| 抖音 `DouyinAdapter` | 🟡 骨架 | Phase 4 实现 |
| 淘宝 `TaobaoAdapter` | 🟡 骨架 | Phase 4 实现 |
| `ChannelManager` | ✅ 完成 | 路由 + 健康检查 |
| `InventorySyncEngine` | ✅ 完成 | 任务封装，Phase 2 增强 |
| `RateSyncEngine` | ✅ 完成 | 任务封装，Phase 2 增强 |
| `OrderAggregator` | 🟡 骨架 | 防超售算法 Phase 4 实现 |
| `channelList` 平台元信息 | ✅ 完成 | 5 平台展示数据 |
| `ChannelManage.vue` 入口 | ✅ 完成 | 列出 5 平台 |

---

## 3. 业务代码使用方式

### 3.1 列出所有平台（UI 展示）

```ts
import { channelList, statusLabel, statusTagType } from '@/channels'

// 列表展示
channelList.forEach(c => ({
  name: c.displayName,
  protocol: c.protocolLabel,
  logoColor: c.color
}))
```

### 3.2 推送库存到指定平台

```ts
import { channelManager, inventorySyncEngine } from '@/channels'

const adapter = channelManager.getAdapter('ctrip')
const task = await inventorySyncEngine.push(adapter, propertyId, [
  { roomTypeId: '1', channelRoomTypeId: 'ctrip-rt-001', date: '2026-09-01', available: 3 },
  { roomTypeId: '1', channelRoomTypeId: 'ctrip-rt-001', date: '2026-09-02', available: -1, closeReason: '维护' }
])
```

### 3.3 拉取渠道订单

```ts
import { channelManager, orderAggregator } from '@/channels'

const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h ago
const adapter = channelManager.getAdapter('fliggy')
const orders = await orderAggregator.pullFromChannel(adapter, { since })
```

### 3.4 健康检查

```ts
import { channelManager } from '@/channels'

const health = await channelManager.healthCheckAll()
// { ctrip: { ok: true, latencyMs: 234 }, fliggy: { ok: false, ... } }
```

---

## 4. Phase 4 接入计划

### 4.1 携程（PMS API）
- **认证**：OAuth 2.0，需要 PMS 账号开通 API
- **库存**：`POST /api/hotel/inventory/update`
- **价格**：`POST /api/hotel/rate/update`
- **订单**：`GET /api/hotel/order/list?since=...`
- **文档**：https://pmsopen.ctrip.com/

### 4.2 飞猪（OpenAPI TOP）
- **认证**：App Key + App Secret + SessionKey 签名
- **库存**：`taobao.xhotel.room.update`
- **价格**：`taobao.xhotel.rate.update`
- **订单**：`taobao.xhotel.order.search`
- **文档**：https://open.alitrip.com/

### 4.3 美团（PMS）
- **认证**：App Key + App Secret + Token
- **库存/价格**：PMS 标准接口
- **订单**：轮询 / Webhook
- **文档**：商家后台 → 技术对接

### 4.4 抖音民宿（OpenAPI）
- **认证**：OAuth 2.0
- **库存/价格**：`/api/life/goods/stock/update`
- **订单**：`/api/life/trade/order/list`
- **文档**：https://developer.open-douyin.com/

### 4.5 淘宝飞旅（OpenAPI TOP）
- **认证**：与飞猪类似但独立账号体系
- **接口**：参考飞猪 TOP 协议
- **文档**：申请开通后获取

---

## 5. 安全与运维

- **凭证加密**：ChannelConfig.credentials 必须加密存储（Phase 2 接入）
- **请求签名**：各平台要求不一（OAuth/HMAC/MD5），在适配器内部封装
- **重试策略**：InventorySyncEngine / RateSyncEngine 提供重试配置入口
- **限流**：各平台 API 限流差异大（飞猪 5000/天、美团更严），需要令牌桶
- **监控**：所有调用记录到 ChannelSyncLog，便于审计与告警

---

## 6. 测试策略

- **Mock 适配器**：每个平台适配器单元测试中应 mock HTTP 层
- **集成测试**：使用平台沙箱环境（sandbox），不可直接对生产接口
- **防超售**：OrderAggregator.checkOversell 需要专门的并发测试用例
- **契约测试**：ChannelAdapter 接口的所有方法必须可替换实现