/**
 * 民宿 PMS 领域类型统一导出
 * 新代码应通过 `@/types/domain/xxx` 或 `@/types`（再导出）路径引用。
 *
 * 旧代码兼容：现有 admin/* 页面继续从 `@/types` 引用旧类型（来自 api.d.ts）。
 * Phase 2 改造页面时，会把这些旧类型迁移到对应 domain 文件后废弃。
 */

// 通用
export * from './common'

// 认证 / 用户 / 角色
export * from './auth'

// 物业 / 房型 / 房间
export * from './property'

// 房价计划 / 日历
export * from './rate'

// 库存 / 房态
export * from './inventory'

// 订单 / 预订
export * from './booking'

// 客人
export * from './guest'

// OTA 渠道
export * from './channel'

// 支付 / 退款 / 发票 / 佣金
export * from './payment'

// 仪表盘统计
export * from './dashboard'