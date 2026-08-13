/**
 * 库存 / 房态 领域类型
 * 描述每个房间在每个日期的销售状态、库存量、关房信息。
 * 是 OTA 同步的核心数据源（推送 inventory 到各平台）。
 */
import type { ID, ISODateTime, DateString } from './common'

// ========== 房态枚举 ==========

/**
 * 单夜房态：
 * - available 可售
 * - sold 已售（已确认订单占用）
 * - held 占用（pending 订单或人工锁定）
 * - closed 关房（主动停售）
 * - out_of_order 维修/停用
 */
export type RoomNightStatus = 'available' | 'sold' | 'held' | 'closed' | 'out_of_order'

// ========== 单夜房态 ==========

/** 单夜房态（房间 × 日期 维度） */
export interface RoomNightInventory {
  /** 房间 ID */
  roomId: ID
  /** 日期 */
  date: DateString
  /** 房态 */
  status: RoomNightStatus
  /** 价格覆盖（单位：分；可选） */
  priceOverride?: number
  /** 关房原因（仅 status='closed'） */
  closeReason?: string
  /** 占用的订单 ID（仅 status='sold'/'held'） */
  bookingId?: ID
  /** 占用来源渠道（sold 时记录） */
  sourceChannel?: string
  /** 最后同步时间 */
  lastSyncedAt?: ISODateTime
}

// ========== 房型级房态 ==========

/**
 * 房型级聚合房态：
 * 一个房型在某日期的整体状态（按房间数聚合得出）
 */
export interface RoomTypeNightInventory {
  roomTypeId: ID
  date: DateString
  /** 总房间数 */
  total: number
  /** 可售数 */
  available: number
  /** 已售数 */
  sold: number
  /** 占用数（pending/锁定） */
  held: number
  /** 关房数 */
  closed: number
  /** 维修数 */
  outOfOrder: number
}

// ========== 库存更新 ==========

/** 单夜库存更新请求 */
export interface InventoryUpdate {
  roomId: ID
  date: DateString
  status: RoomNightStatus
  closeReason?: string
}

/** 批量关房请求 */
export interface BatchCloseRequest {
  /** 范围：所有房间 / 指定房型 / 指定房间 */
  scope: 'all' | { roomTypeIds: ID[] } | { roomIds: ID[] }
  startDate: DateString
  endDate: DateString
  closeReason: string
}

// ========== 房态日历 ==========

/** 房态日历查询参数 */
export interface InventoryCalendarQuery {
  propertyId: ID
  roomTypeId?: ID
  startDate: DateString
  endDate: DateString
}

/** 房态日历响应（房型级） */
export interface InventoryCalendar {
  propertyId: ID
  roomTypeId?: ID
  /** 日期范围内的房型级聚合 */
  roomTypeNights: RoomTypeNightInventory[]
  /** 日期范围内的房间级详情 */
  roomNights?: RoomNightInventory[]
}