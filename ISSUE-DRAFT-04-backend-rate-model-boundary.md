# [Bug][前后端契约] 使用显式 ratePlan 上下文，修复 scope 映射和隐式默认写入

## 技术栈说明

本仓库没有 Prisma；后端模型由 Java Entity、MyBatis-Plus Mapper 与 Flyway schema 管理。该 issue 聚焦现有 Vue/TypeScript 与 Spring/MyBatis-Plus 契约，不引入第二套 ORM。

## 背景

房价计划和日历当前存在多处源码级契约错误：

1. `RatePlan.scope` 的类型是 `'all' | { category } | { roomTypeIds }`，但 `createRatePlan` / `updateRatePlan` 使用 `Array.isArray(scope) && 'roomTypeIds' in scope` 判断对象，该条件对正常 `{ roomTypeIds: [...] }` 永远为 false。
2. 页面允许选择“全部房型”，但后端 `rate_plan` 模型只保存一个 `room_type_id`；前端提交 `scope='all'` 后会回退到默认房型，实际语义与 UI 不符。
3. `ensureDefaultPlanId` 在找不到计划时会由写操作隐式创建 `BASE_<roomTypeId>`，并硬编码 888 元、`propertyId=1`。
4. 房价日历查询没有传 `ratePlanId`；同一房型存在多个计划时，后端可返回同一天的多条记录，而前端日历模型只期望一个当前计划。
5. 单日改价、清除和批量调价会自动选择“第一个启用计划”，用户无法确认实际修改的是哪个计划。

这些问题会造成写错房型、写错计划或 UI 显示“全部房型”但数据库仅绑定一个房型。

## 上手难度

高。需要先收敛产品语义，再调整前端类型与后端校验。

## 涉及模块 / 文件

- `src/types/domain/rate.ts`
- `src/api/rate.ts`
- `src/views/admin/RatePlanManage.vue`
- `backend/src/main/java/com/xkzoom/pms/controller/RatePlanController.java`
- `backend/src/main/java/com/xkzoom/pms/controller/RateCalendarController.java`
- `backend/src/main/java/com/xkzoom/pms/service/RateCalendarService.java`
- `backend/src/main/java/com/xkzoom/pms/entity/{RatePlan,RateCalendar,RoomType}.java`
- 相关 Mapper、测试和 API 文档

## 建议的最小范围

- 当前后端保持“一条 rate plan 绑定一个 room type”
- 在真正设计多房型关联表之前，移除或禁用 UI 的“全部房型”
- 页面必须显式选择 `roomTypeId + ratePlanId` 后才能查询或写入日历
- 给 `RateCalendarQuery`、`DailyRateUpdate`、批量更新和清除方法补充 `ratePlanId`
- 修复 `scope` 对象判断，不再使用错误的 `Array.isArray(scope)`
- 读操作不得创建计划；无计划时 UI 引导用户显式创建
- 默认价来自所选 `room_type.base_price` 或用户输入，不允许硬编码 888
- 移除业务写入路径中的 `propertyId=1` 静默回退

## 模型与租户边界

- MyBatis-Plus 租户插件已自动约束 `tenant_id`
- 后端还必须验证所选 `rate_plan.room_type_id` 与请求 `room_type_id` 一致
- `rate_plan.property_id`、`room_type.property_id` 必须一致
- 所有关联资源必须属于当前租户
- 现有 `AuthInterceptor` 已记录非 GET 请求审计；验收时应确认计划创建和房价写入确实生成对应记录，而不是重复建设另一套审计机制

## 验收标准

- [ ] 修复 `scope` 类型判断；创建“当前房型”计划写入当前选择的 roomTypeId
- [ ] 在后端支持多房型模型前，UI 不再提供无效的“全部房型”提交
- [ ] 查询、单日改价、清除和批量调价均显式携带 ratePlanId
- [ ] 同一房型存在两个以上计划时，日历只展示并修改当前选中计划
- [ ] 无计划时只展示创建引导，不在查询或改价流程中偷偷写库
- [ ] 删除业务写入路径的 `propertyId=1` 和 888 元硬编码
- [ ] 后端拒绝跨租户、跨物业或 ratePlan/roomType 不匹配的请求
- [ ] API 文档与前端类型同步更新
- [ ] 既有非 GET 审计记录包含 request ID、资源路径和成功状态

## 自测要求

- [ ] `cd backend && mvn -B verify`
- [ ] `npm run test:tenant`
- [ ] 新增双租户、双房型、双 rate plan 的正向与负向用例
- [ ] `npm run test:quality`

## 非目标

- 不迁移到 Prisma
- 不在本 issue 中设计多房型关联表
- 不实现节假日、会员价或 OTA 渠道价策略
