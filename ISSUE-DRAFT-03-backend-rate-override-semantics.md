# [Feature][后端模型层] 实现房价日历真实“清除覆盖”和“跳过已覆盖”语义

## 技术栈说明

当前仓库后端是 Spring Boot + MyBatis-Plus + Flyway + MySQL，不存在 Prisma schema。本 issue 按现有模型层起草；若要引入 Prisma，应另开架构迁移 RFC，不能在单一功能 issue 中混入双 ORM。

## 背景

`src/api/rate.ts` 当前把“清除单日价”模拟为再次 upsert 基础价，并写入备注“已清除”，因此该日期仍被 `calendarToDaily` 标记为 `overridden=true`。批量调价的 `skipOverridden` 也只写入备注；后端 `RateCalendarBatchRequest` 没有该字段，`RateCalendarService.batchUpdate` 仅更新查询到的已有行，不会为缺失日期创建记录。

当前前端已经采用一个可复用的最小语义：数据库中存在 `rate_calendar` 行即为显式覆盖；缺少行时由前端回落到 `room_type.base_price` 并标记 `overridden=false`。本 issue 应优先沿用该语义，不必先增加新的 schema 字段。

## 上手难度

高。涉及批量 upsert、事务、唯一约束、租户关系校验和前后端契约。

## 涉及模块 / 文件

- `backend/src/main/java/com/xkzoom/pms/dto/RateCalendarBatchRequest.java`
- `backend/src/main/java/com/xkzoom/pms/service/RateCalendarService.java`
- `backend/src/main/java/com/xkzoom/pms/controller/RateCalendarController.java`
- `backend/src/test/java/com/xkzoom/pms/service/`
- `src/api/rate.ts`
- `src/views/admin/RatePlanManage.vue`
- 仅当实现确实需要新字段时才新增 Flyway migration；不得预设必须改 schema

## 数据与租户边界

- `rate_calendar` 已有租户级唯一键 `(tenant_id, rate_plan_id, stay_date)`
- MyBatis-Plus `TenantLineInnerInterceptor` 已为 CRUD 注入 `tenant_id`；本 issue 仍需额外校验 `rate_plan_id` 与 `room_type_id` 属于同一当前租户且彼此关联
- 清除覆盖应删除当前租户、指定 rate plan、指定日期的显式记录
- `skipOverridden=true`：保留已有行，只为日期范围内缺失日期创建固定价记录
- `skipOverridden=false`：对日期范围内每一天执行租户内 upsert
- 金额后端使用 DECIMAL 元，前端使用 cents，不改变现有换算边界

## 建议 API

- 新增明确的删除端点，参数至少包含 `ratePlanId` 和 `stayDate`
- `RateCalendarBatchRequest` 增加真实 `skipOverridden` 字段
- batch 返回新增、更新、跳过数量，而不只返回含义模糊的单个整数
- 非法日期范围、未知 mode 和无权访问的模型关系返回明确业务错误

## 验收标准

- [ ] 清除后数据库中不存在该日显式覆盖记录
- [ ] 重新查询后前端显示基础价且 `overridden=false`
- [ ] `skipOverridden=true` 时已有显式覆盖保持不变，缺失日期按请求创建
- [ ] `skipOverridden=false` 时范围内已有和缺失日期均按请求 upsert
- [ ] 空范围、反向日期和超过约定上限的范围被拒绝
- [ ] 跨租户或不匹配的 ratePlanId / roomTypeId 请求被拒绝，不泄露记录存在性
- [ ] 并发 upsert 在租户级唯一键下结果幂等，不产生重复记录
- [ ] 补齐 Service 单测与真实 MySQL smoke

## 自测要求

- [ ] `cd backend && mvn -B verify`
- [ ] `npm run test:tenant`
- [ ] 新增房价日历 API smoke，覆盖新增/更新/跳过/删除
- [ ] `npm run test:quality`
