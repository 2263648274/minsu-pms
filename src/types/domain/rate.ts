/**
 * 房价计划 领域类型
 * 同一房型可有多个房价计划（基础价、会员价、OTA 卖价、连住优惠等），
 * 每个房价计划绑定一个日历（按日期覆盖）。
 */
import type { ID, ISODateTime, DateString, Money } from './common'
import type { RoomTypeCategory } from './property'

// ========== 房价策略 ==========

/** 房价策略类型 */
export type RateStrategy =
  | 'base'          // 基础价
  | 'weekend'       // 周末加价
  | 'holiday'       // 节假日加价
  | 'seasonal'      // 季节性
  | 'member'        // 会员价
  | 'channel'       // 渠道价（OTA 卖价/底价）
  | 'long_stay'     // 连住优惠
  | 'early_bird'    // 提前预订
  | 'last_minute'   // 最后一刻

/** 计价单位 */
export type PricingUnit = 'per_night' | 'per_stay' | 'per_person' | 'per_room'

/** 房价计划 */
export interface RatePlan {
  id: ID
  propertyId: ID
  /** 房价名（如"周末加价"、"携程卖价"） */
  name: string
  strategy: RateStrategy
  /** 适用范围：所有房型 / 指定房型分类 / 指定房型 */
  scope: 'all' | { category: RoomTypeCategory } | { roomTypeIds: ID[] }
  /** 计价单位 */
  pricingUnit: PricingUnit
  /** 价格（单位：分） */
  price: Money
  /** 起始日期（含） */
  startDate?: DateString
  /** 截止日期（含） */
  endDate?: DateString
  /** 生效星期（0-6，0 表示周日） */
  weekdays?: number[]
  /** 连住 N 晚起触发 */
  minNights?: number
  /** 连住最多 N 晚 */
  maxNights?: number
  /** 提前 N 天预订触发 */
  minAdvanceDays?: number
  /** 适用渠道 ID（仅 strategy='channel'） */
  channelId?: ID
  /** 适用 VIP 等级（仅 strategy='member'） */
  memberLevel?: 0 | 1 | 2 | 3
  /** 优先级（高优先级覆盖低） */
  priority: number
  /** 状态：1 启用 0 禁用 */
  status: 0 | 1
  description?: string
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

// ========== 日历项 ==========

/** 单日房价 */
export interface DailyRate {
  date: DateString
  /** 房型 ID */
  roomTypeId: ID
  /** 房价计划 ID */
  ratePlanId?: ID
  /** 该日最终卖价（单位：分） */
  price: Money
  /** 是否强制覆盖（被人工改价标记） */
  overridden: boolean
  /** 改价人 */
  overriddenBy?: ID
  /** 改价备注 */
  overrideReason?: string
}

/** 单日房价更新请求 */
export interface DailyRateUpdate {
  date: DateString
  roomTypeId: ID
  /** 目标价格（单位：分） */
  price: Money
  overrideReason?: string
}

/** 单日房价批量更新请求 */
export interface DailyRateBatchUpdate {
  roomTypeId: ID
  startDate: DateString
  endDate: DateString
  /** 目标价格（单位：分） */
  price: Money
  /** 是否跳过已手动改价的日期 */
  skipOverridden?: boolean
}

/** 单日房价批量更新结果（后端按天三向计数） */
export interface DailyRateBatchResult {
  /** 范围内原本缺行、本次创建的天数 */
  inserted: number
  /** 范围内已有行、本次改价的天数 */
  updated: number
  /** 因 skipOverridden 保持原状的已覆盖天数 */
  skipped: number
}

// ========== 房价日历查询 ==========

/** 房价日历查询参数 */
export interface RateCalendarQuery {
  propertyId: ID
  roomTypeId?: ID
  startDate: DateString
  endDate: DateString
}

/** 房价日历响应 */
export interface RateCalendar {
  propertyId: ID
  roomTypeId: ID
  /** 日历项列表 */
  rates: DailyRate[]
}