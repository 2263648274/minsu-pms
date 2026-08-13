/**
 * 全局类型统一导出（向后兼容层）
 *
 * 旧代码（admin/* 现有页面）：从 `@/types` 导入 `RoomInfo` 等 → 来自 ./api
 *
 * 新代码：直接通过深路径 `@/types/domain/<module>` 引用，避免与旧类型同名冲突。
 * 推荐导入方式：
 * ```ts
 * // 新代码推荐
 * import type { Booking, Guest, Channel } from '@/types/domain/booking'
 * import type { ApiResponse, PageResult, Money } from '@/types/domain/common'
 * ```
 *
 * Phase 2 会逐步将旧 api.d.ts 字段迁移到对应 domain 文件后废弃。
 */

export * from './api'