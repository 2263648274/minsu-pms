# PMS Backend API 接口文档

> 适用版本：v1.0（Phase 2 配套 + Phase 1 既有）
> 后端栈：Spring Boot 3 + MyBatis-Plus + MySQL 8 + JWT
> Base URL：`http://localhost:8090/api`
> 前端 Vite proxy：`/api` → `http://localhost:8090`
> 统一响应：`{ code: 200, message: "OK", data: T }`，前端 request 拦截器已自动解包 `data`

---

## 0. 通用约定

### 响应格式

```json
{
  "code": 200,
  "message": "OK",
  "data": <T>
}
```

| code | 含义 | 前端处理建议 |
| --- | --- | --- |
| 200 | 成功 | 直接用 data |
| 400 | 业务校验失败 | `ElMessage.error(message)` |
| 401 | 未登录 / token 失效 | 跳登录页 |
| 404 | 资源不存在 | `ElMessage.warning(message)` |
| 500 | 系统错误 | `ElMessage.error("系统繁忙")` |

### 鉴权

除 `/auth/login`、`/auth/register`、`/health`、`/dashboard/overview`、`/dashboard/recent-bookings` 外，其余接口均需在请求头带 `Authorization: Bearer <token>`。

### 分页

后端用 MyBatis-Plus `Page<T>`：
```json
{
  "records": [ ... ],
  "total": 100,
  "current": 1,
  "size": 20,
  "pages": 5
}
```
前端 service 层已封装 `PageResult<T>` 适配：
```json
{
  "list": [ ... ],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### 时间格式

- `LocalDateTime` → `yyyy-MM-dd HH:mm:ss`（已在 `application.yml` 配置）
- `LocalDate` → `yyyy-MM-dd`

---

## 1. 认证 `/api/auth`

### POST `/auth/login`

**Request**
```json
{ "username": "admin", "password": "Pms@App2026" }
```

**Response.data**
```json
{ "token": "eyJhbGc...", "user": { "id": 1, "username": "admin", "realName": "管理员", "role": "ADMIN" } }
```

### POST `/auth/register`

**Request**
```json
{ "username": "newuser", "password": "Pwd@123", "email": "u@x.com", "phone": "138..." }
```

**Response.data**：`User` 对象

### POST `/auth/logout`

无 body，客户端清除本地 token 即可

---

## 2. 仪表盘 `/api/dashboard`

### GET `/dashboard/overview`

免鉴权。返回 K 线 / 待办 / 房态概览。

**Response.data**
```json
{
  "totalProperties": 3,
  "totalRoomTypes": 12,
  "totalRooms": 36,
  "todayCheckIns": 5,
  "todayCheckOuts": 4,
  "occupiedRooms": 18,
  "vacantRooms": 16,
  "cleaningRooms": 2,
  "blockedRooms": 0,
  "date": "2026-08-14"
}
```

### GET `/dashboard/recent-bookings`

返回最近 10 笔订单（按 created_at desc）。

**Response.data**：`Booking[]`

---

## 3. 健康检查 `/api/health`

### GET `/health`

返回 `{ "status": "UP", "timestamp": "..." }`

---

## 4. 物业 `/api/properties`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/properties?current=1&size=20&keyword=...&city=...` | 分页列表 |
| GET | `/properties/{id}` | 详情 |
| POST | `/properties` | 新增 |
| PUT | `/properties/{id}` | 更新 |
| DELETE | `/properties/{id}` | 逻辑删除 |

**Property 实体字段**
```json
{
  "id": 1, "name": "云栖民宿·西湖店", "code": "P001",
  "address": "...", "city": "杭州", "phone": "0571-...",
  "starRating": 4, "description": "...", "status": 1,
  "createdAt": "2026-08-14 10:00:00", "updatedAt": "..."
}
```

> 前端：`src/views/admin/property/PropertyManage.vue` 已对接真实接口

---

## 5. 房型 `/api/room-types`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/room-types?propertyId=1&current=1&size=20` | 分页列表 |
| GET | `/room-types/{id}` | 详情 |
| POST | `/room-types` | 新增 |
| PUT | `/room-types/{id}` | 更新 |
| DELETE | `/room-types/{id}` | 逻辑删除 |

**RoomType 字段**
```json
{
  "id": 1, "propertyId": 1, "name": "豪华大床房",
  "code": "RT001", "bedType": "KING", "area": 32,
  "maxOccupancy": 2, "basePrice": 388.00, "currency": "CNY",
  "amenities": "wifi,ac,...",
  "description": "...", "status": 1,
  "createdAt": "...", "updatedAt": "..."
}
```

---

## 6. 房间 `/api/rooms`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/rooms?propertyId=&roomTypeId=&roomNo=&floor=&status=&current=1&size=20` | 分页列表 |
| GET | `/rooms/{id}` | 详情 |
| POST | `/rooms` | 新增 |
| PUT | `/rooms/{id}` | 更新 |
| DELETE | `/rooms/{id}` | 逻辑删除 |

**Room 字段**
```json
{
  "id": 1, "propertyId": 1, "roomTypeId": 1,
  "roomNo": "802", "floor": 8, "area": 32,
  "status": "VACANT",  // VACANT / OCCUPIED / CLEANING / OUT_OF_ORDER
  "description": "...", "images": "url1,url2",
  "createdAt": "...", "updatedAt": "..."
}
```

> 前端：`src/views/admin/RoomManage.vue` 已对接真实接口

---

## 7. 房价方案 `/api/rate-plans`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/rate-plans?roomTypeId=&current=1&size=20` | 分页列表 |
| GET | `/rate-plans/{id}` | 详情 |
| POST | `/rate-plans` | 新增 |
| PUT | `/rate-plans/{id}` | 更新 |
| DELETE | `/rate-plans/{id}` | 逻辑删除 |

**RatePlan 字段**
```json
{
  "id": 1, "roomTypeId": 1, "name": "标准价",
  "code": "RP001", "type": "STANDARD",  // STANDARD / WEEKEND / HOLIDAY / MEMBER / EARLY_BIRD
  "basePrice": 388.00, "currency": "CNY",
  "minNights": 1, "maxNights": 30,
  "startDate": "2026-08-01", "endDate": "2026-12-31",
  "description": "...", "status": 1,
  "createdAt": "...", "updatedAt": "..."
}
```

> 前端：`src/views/admin/RatePlanManage.vue` 已对接真实接口

---

## 8. 房价日历 `/api/rate-calendar`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/rate-calendar?roomTypeId=1&from=2026-08-01&to=2026-08-31&ratePlanId=1` | 区间查询 |
| POST | `/rate-calendar` | 单日 upsert |
| POST | `/rate-calendar/batch` | 批量调价/关房 |

**GET 响应**：`RateCalendar[]`
```json
{
  "id": 1, "roomTypeId": 1, "ratePlanId": 1,
  "stayDate": "2026-08-15", "price": 488.00,
  "currency": "CNY", "available": 1,  // 0=关房
  "remarks": "周末价"
}
```

**POST upsert Request**
```json
{ "roomTypeId": 1, "ratePlanId": 1, "stayDate": "2026-08-15",
  "price": 488.00, "available": 1, "remarks": "周末价" }
```

**POST batch Request**
```json
{
  "roomTypeId": 1, "from": "2026-08-15", "to": "2026-08-21",
  "mode": "PERCENT",   // FIXED / PERCENT / SET
  "value": 20,         // PERCENT=百分比, FIXED/SET=绝对值
  "closeRoom": false,
  "remarks": "周末上浮20%"
}
```

---

## 9. 库存房态 `/api/inventory`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/inventory?roomTypeId=1&from=2026-08-01&to=2026-08-31` | 区间查询 |
| PUT | `/inventory` | 单日 upsert（status / total / sold / blocked） |
| PATCH | `/inventory/{roomTypeId}/{date}/close?close=true` | 开关房 |

**Inventory 字段**
```json
{
  "id": 1, "roomTypeId": 1, "stayDate": "2026-08-15",
  "totalRooms": 10, "soldRooms": 3, "blockedRooms": 0,
  "status": "OPEN",  // OPEN / CLOSED / SOLD_OUT
  "remarks": "..."
}
```

> 前端：`src/views/admin/InventoryManage.vue` 已对接真实接口

---

## 10. 客人 `/api/customers`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/customers?keyword=&vipLevel=&current=1&size=20` | 分页列表 |
| GET | `/customers/{id}` | 详情 |
| GET | `/customers/{id}/bookings` | 该客户的所有订单 |
| POST | `/customers` | 新增 |
| PUT | `/customers/{id}` | 更新 |
| DELETE | `/customers/{id}` | 逻辑删除 |

**Customer 字段**
```json
{
  "id": 1, "name": "张三", "phone": "138...", "email": "u@x.com",
  "idCard": "3301...", "gender": "M", "vipLevel": 2,  // 0=普通,1=银卡,2=金卡,3=钻石
  "totalOrders": 5, "totalSpent": 5800.00,
  "address": "...", "remark": "...",
  "createdAt": "...", "updatedAt": "..."
}
```

> 前端：`src/views/admin/CustomerManage.vue` 已对接真实接口

---

## 11. 订单 `/api/bookings`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/bookings?orderNo=&customerName=&status=&paymentStatus=&source=&from=&to=&current=1&size=20` | 分页列表 |
| GET | `/bookings/{id}` | 详情 |
| POST | `/bookings` | 新建（自动生成 orderNo: BKyyyyMMddNNNN） |
| PUT | `/bookings/{id}` | 更新（仅未入住订单） |
| POST | `/bookings/{id}/confirm` | 确认订单 |
| POST | `/bookings/{id}/check-in` | 入住 |
| POST | `/bookings/{id}/check-out` | 退房 |
| POST | `/bookings/{id}/cancel` | 取消 |

**Booking 字段**
```json
{
  "id": 1, "bookingNo": "BK202608140005",
  "propertyId": 1, "roomTypeId": 1, "ratePlanId": 1,
  "customerId": 5,
  "checkInDate": "2026-08-15", "checkOutDate": "2026-08-17",
  "nights": 2, "rooms": 1, "guests": 2,
  "roomPrice": 388.00, "totalAmount": 776.00, "paidAmount": 776.00,
  "currency": "CNY",
  "source": "DIRECT",  // DIRECT/CTRIP/MEITUAN/FLIGGY/BOOKING/AIRBNB
  "status": "CONFIRMED",        // PENDING / CONFIRMED / CHECKED_IN / CHECKED_OUT / CANCELLED
  "paymentStatus": "PAID",      // UNPAID / PARTIAL / PAID / REFUNDED
  "guestName": "张三", "guestPhone": "138...",
  "specialRequests": "...", "internalNotes": "...",
  "confirmedAt": "...", "checkedInAt": "...", "checkedOutAt": "...", "cancelledAt": "...",
  "createdAt": "...", "updatedAt": "..."
}
```

> 前端：`src/views/admin/OrderManage.vue` 已对接真实接口

---

## 12. OTA 渠道 `/api/channels`

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/channels` | 全量列表（按 code 排序） |
| GET | `/channels/{id}` | 详情 |
| POST | `/channels` | 新增（code 小写字母/数字/下划线 2-30 字符） |
| PUT | `/channels/{id}` | 更新 |
| DELETE | `/channels/{id}` | 逻辑删除 |
| POST | `/channels/{id}/ping` | 连接检测（Phase 2 mock 随机成功/失败） |

**Channel 字段**
```json
{
  "id": 1, "code": "ctrip", "name": "携程",
  "enabled": 1, "lastStatus": "OK",  // OK / ERROR / UNKNOWN
  "lastError": null, "lastSyncAt": "...",
  "createdAt": "...", "updatedAt": "..."
}
```

**POST /ping Response.data**
```json
{
  "channelId": 1, "code": "ctrip", "name": "携程",
  "status": "OK",  // OK / ERROR
  "durationMs": 187,
  "checkedAt": "...",
  "error": null    // 仅 ERROR 时存在
}
```

> 前端：`src/views/admin/ChannelManage.vue` 已对接真实接口
> 注意：前端用 `channelList` from `@/channels/adapters/registry`（前端 mock 元数据），**Phase 3 接入 OTA 时需把 channel 静态元数据迁移到后端 / 或继续保留前端 registry**。

---

## 13. OTA 同步日志 `/api/sync-logs`（Phase 2 新增）

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/sync-logs?channelId=&operation=&status=&from=&to=&current=1&size=20` | 分页列表 |
| GET | `/sync-logs/{id}` | 详情（含 request/response/errorMsg 全量） |
| POST | `/sync-logs` | 新增（手动推送 / 调试 / OTA 适配器回调） |
| GET | `/sync-logs/stats?channelId=&from=&to=` | 聚合统计：success / error / skip / successRate / avgDurationMs |

**Query 参数**
- `channelId`：渠道 ID（可选）
- `operation`：操作类型 `PUSH_AVAIL / PUSH_RATE / FETCH_BOOKING / PUSH_BOOKING`（可选）
- `status`：状态 `OK / ERROR / SKIP`（可选）
- `from` / `to`：`yyyy-MM-dd`（可选，默认全量）
- `current` / `size`：分页（默认 1 / 20）

**OtaSyncLog 字段**
```json
{
  "id": 1, "channelId": 1,
  "operation": "PUSH_AVAIL",  // PUSH_AVAIL / PUSH_RATE / FETCH_BOOKING / PUSH_BOOKING
  "status": "OK",              // OK / ERROR / SKIP
  "request": "{\"dates\":[...]}",
  "response": "{\"code\":0,\"msg\":\"success\"}",
  "errorMsg": null,
  "durationMs": 187,
  "occurredAt": "2026-08-14 10:30:00"
}
```

**字段命名映射**（前端 ChannelSyncLog.vue 接入时处理）
| 后端 | 前端 | 说明 |
| --- | --- | --- |
| `operation` | `type` | `PUSH_AVAIL → inventory_push`，`PUSH_RATE → rate_push`，`FETCH_BOOKING → order_pull`，`PUSH_BOOKING → order_confirm`，在前端 service 层做映射 |
| `status` | `status` | 后端 `OK/ERROR/SKIP` ↔ 前端 `success/failed/partial`，前端做映射 |
| `errorMsg` | `errorMessage` | 驼峰自动 |
| `occurredAt` | `createdAt` | 驼峰自动 |
| — | `trigger` | DB 未存。前端兜底为 `'auto'`，Phase 3 OTA 真实接入时再决定落库 |

**POST Request**
```json
{
  "channelId": 1, "operation": "PUSH_AVAIL",
  "status": "OK", "request": "...", "response": "...",
  "durationMs": 187
  // occurredAt 缺省 = now
}
```

**GET /stats Response.data**
```json
{
  "total": 120, "success": 105, "error": 12, "skip": 3,
  "successRate": 0.875,
  "avgDurationMs": 234
}
```

---

## 14. 支付流水 `/api/payments`（Phase 2 新增）

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/payments?bookingId=&type=&method=&current=1&size=20` | 分页列表 |
| GET | `/payments/{id}` | 详情 |
| POST | `/payments` | 新增（默认 type=PAYMENT, method=OTHER, currency=CNY） |
| PUT | `/payments/{id}` | 更新 |
| DELETE | `/payments/{id}` | 逻辑删除 |
| GET | `/payments/booking/{bookingId}/summary` | 订单级汇总：已收/已退/净额/笔数 |

**Payment 字段**
```json
{
  "id": 1, "bookingId": 5,
  "amount": 776.00, "currency": "CNY",
  "method": "WECHAT",   // CASH / CARD / WECHAT / ALIPAY / TRANSFER / OTHER
  "type": "PAYMENT",     // PAYMENT（收款） / REFUND（退款）
  "transactionNo": "wx_20260814_xxx",
  "paidAt": "2026-08-14 10:00:00",
  "operator": "admin", "remarks": "...",
  "createdAt": "..."
}
```

**GET /booking/{bookingId}/summary Response.data**
```json
{
  "bookingId": 5,
  "paidAmount": 776.00,
  "refundedAmount": 0,
  "netAmount": 776.00,
  "paymentCount": 1
}
```

---

## 15. 财务对账 `/api/finance`（Phase 2 新增）

### GET `/finance/stats`

顶部 4 张统计卡（月度营收 / 底价 / 佣金 / 净收入 + 订单数）。

**Query**
- `month`：yyyy-MM（可选，默认当月）

**Response.data**
```json
{
  "month": "2026-08",
  "monthRevenue":  38800.00,
  "monthBase":     26441.00,
  "monthCommission": 4656.00,
  "monthNet":      34144.00,
  "orderCount":    50
}
```

### GET `/finance/channel-settlements`

按渠道聚合（FinanceManage.vue 上表）。

**Query**：`month`（可选）

**Response.data**：`List<ChannelSettlement>`
```json
[
  {
    "channelId": "DIRECT",
    "orderCount": 30, "nights": 60,
    "sellingAmount": 12000.00, "baseAmount":  8670.00,
    "commissionRate": 0.0, "commission":     0.00,
    "netRevenue":    12000.00
  },
  {
    "channelId": "CTRIP",
    "orderCount": 12, "nights": 24,
    "sellingAmount":  9600.00, "baseAmount":  6936.00,
    "commissionRate": 0.15, "commission":  1440.00,
    "netRevenue":     8160.00
  }
]
```

### GET `/finance/order-settlements`

订单级对账明细（FinanceManage.vue 下表，分页）。

**Query**
- `month`：yyyy-MM（可选）
- `channelId`：DIRECT/CTRIP/...（可选）
- `current` / `size`：分页（默认 1 / 20）

**Response.data**：`Page<Map>`，records 为 `OrderSettlement[]`
```json
{
  "records": [
    {
      "orderNo": "BK202608140005",
      "channelId": "DIRECT",
      "checkInDate": "2026-08-15", "checkOutDate": "2026-08-17",
      "nights": 2, "guestName": "张三",
      "sellingAmount": 776.00, "baseAmount": 559.86,
      "commission": 0.00, "netRevenue": 776.00, "diff": 216.14
    }
  ],
  "total": 50, "current": 1, "size": 20, "pages": 3
}
```

**计算口径**
| 渠道 | commissionRate |
| --- | --- |
| DIRECT  | 0%   |
| CTRIP   | 15%  |
| MEITUAN | 12%  |
| FLIGGY  | 10%  |
| BOOKING | 18%  |
| AIRBNB  | 3%   |
| 其他 / 未知 | 10% |

- `commission   = sellingAmount × commissionRate`
- `netRevenue   = sellingAmount − commission`
- `baseAmount   = (sellingAmount − commission) × (1 − 15%)`  ← 保留 15% 利润空间
- `diff         = netRevenue − baseAmount`

---

## 16. 营业报表 `/api/reports`（Phase 2 新增）

### GET `/reports/overview`

KPI 概览。

**Query**
- `from` / `to`：yyyy-MM-dd（可选，默认近 14 天）

**Response.data**
```json
{
  "from": "2026-08-01", "to": "2026-08-14", "days": 14,
  "revenue": 38800.00, "orderCount": 50, "nights": 100,
  "totalRoomNights": 504,
  "adr": 388.00, "revpar": 76.98,
  "occupancyRate": 0.198
}
```

### GET `/reports/trend`

每日营收 + 入住率趋势。

**Query**：`from` / `to`（可选，默认近 14 天）

**Response.data**：`List<DailyTrend>`（按日期升序，length = (to - from + 1) 天）
```json
[
  { "date": "2026-08-01", "revenue": 2400.00, "occupancy": 0.30 },
  { "date": "2026-08-02", "revenue": 3100.00, "occupancy": 0.42 }
]
```

### GET `/reports/channel-breakdown`

渠道贡献（按订单数降序）。

**Query**：`from` / `to`（可选）

**Response.data**
```json
[
  { "channelId": "DIRECT",  "orderCount": 30, "revenue": 12000.00, "share": 0.309 },
  { "channelId": "CTRIP",   "orderCount": 12, "revenue":  9600.00, "share": 0.247 }
]
```

### GET `/reports/roomtype-breakdown`

房型贡献（按订单数降序）。

**Query**：`from` / `to`（可选）

**Response.data**
```json
[
  { "roomTypeId": 1, "name": "豪华大床房", "orderCount": 25, "revenue": 9700.00, "share": 0.250 },
  { "roomTypeId": 2, "name": "标准双床房", "orderCount": 18, "revenue": 5400.00, "share": 0.139 }
]
```

---

## 17. 错误码

| code | 含义 |
| --- | --- |
| 200 | 成功 |
| 400 | 业务校验失败（message 含具体原因） |
| 401 | 未登录 / token 失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 系统异常 |

---

## 18. 接入检查清单（前端研发）

接入 `ChannelSyncLog.vue` / `FinanceManage.vue` / `ReportManage.vue` 时：

- [ ] 把 mock 数据生成函数替换为对应 service 函数（见 src/services/api.ts）
- [ ] `ChannelSyncLog.vue`：做 `operation → type` 字段映射；`trigger` 兜底为 `'auto'`
- [ ] `FinanceManage.vue`：保留 4 张统计卡 + 2 张表组件结构；改 service 字段对齐
- [ ] `ReportManage.vue`：移除顶部 "数据为前端聚合演示" tag；改 service 字段对齐
- [ ] 移除 Phase 4 实施路径提示（接口已实）
- [ ] 联调：`/api/sync-logs/stats`、`/api/finance/stats`、`/api/reports/overview` 三处顶部统计
- [ ] 前端 vite proxy 已配 `/api → http://localhost:8090`，无需跨域