/**
 * Service 层统一导出
 *
 * 使用方式（新代码）：
 * ```ts
 * import { bookingService } from '@/services'
 * await bookingService.listBookings({ page: 1, pageSize: 20 })
 * ```
 *
 * 旧代码（admin/* 现有页面）继续从 `@/services/api` 引用旧函数，
 * Phase 2 改造页面时再迁移到新 service 对象。
 *
 * 历史说明：原本还有 channelService re-export（来自 ./channel）。
 *   Phase 2.6 收尾时确认 channel.ts 是 dead code（外部零消费），整文件删除，
 *   同步从此 barrel 中移除 channelService。
 */

export { authService } from './auth'
export type { AuthService } from './auth'

export { propertyService } from './property'
export type { PropertyService } from './property'

export { bookingService } from './booking'
export type { BookingService } from './booking'

export { guestService } from './guest'
export type { GuestService } from './guest'

export { dashboardService } from './dashboard'
export type { DashboardService } from './dashboard'

// 旧 API（向后兼容）
export * as legacyApi from './api'