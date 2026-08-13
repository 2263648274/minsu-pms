/**
 * 仪表盘统计 领域类型
 * 民宿 PMS 首页核心指标。
 */
import type { Money } from './common'
import type { ChannelId } from './channel'

// ========== 核心指标 ==========

/** 核心 KPI */
export interface CoreKpi {
  /** 入住率（0-1） */
  occupancyRate: number
  /** ADR（平均每日房价，单位：分） */
  adr: Money
  /** RevPAR（每可用房收入，单位：分） */
  revpar: Money
  /** 当日对比昨日变化（百分比，正负） */
  occupancyChangePct?: number
  adrChangePct?: number
  revparChangePct?: number
}

// ========== 仪表盘聚合 ==========

/** 仪表盘综合统计 */
export interface DashboardStats {
  // 房源维度
  totalRooms: number
  vacantRooms: number
  occupiedRooms: number
  cleaningRooms: number
  maintenanceRooms: number
  outOfOrderRooms?: number
  /** 入住率（0-1） */
  occupancyRate: number
  // 订单维度
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  checkedInBookings: number
  todayCheckIns: number
  todayCheckOuts: number
  // 营收维度
  todayRevenue: Money
  monthRevenue: Money
  totalRevenue: Money
  // 客人维度
  totalGuests: number
  newGuestsThisMonth: number
  // 渠道维度
  channelBreakdown?: Array<{
    channelId: ChannelId | 'direct'
    channelName: string
    bookings: number
    revenue: Money
    share: number
  }>
}

// ========== 营收趋势 ==========

/** 营收趋势点 */
export interface RevenueTrendPoint {
  date: string
  revenue: Money
  bookings: number
  occupancyRate: number
}

/** 营收趋势查询 */
export interface RevenueTrendQuery {
  propertyId?: string
  startDate: string
  endDate: string
  /** 粒度：日/周/月 */
  granularity: 'day' | 'week' | 'month'
}

/** 营收趋势响应 */
export interface RevenueTrend {
  series: RevenueTrendPoint[]
  /** 同比变化（百分比） */
  yoyChangePct?: number
  /** 环比变化（百分比） */
  momChangePct?: number
}

// ========== 房型表现 ==========

/** 房型表现统计 */
export interface RoomTypePerformance {
  roomTypeId: string
  roomTypeName: string
  /** 售出间夜数 */
  soldNights: number
  /** 营收 */
  revenue: Money
  /** 入住率 */
  occupancyRate: number
  /** 平均房价 */
  adr: Money
}

// ========== 渠道表现 ==========

/** 渠道表现 */
export interface ChannelPerformance {
  channelId: ChannelId
  channelName: string
  /** 订单数 */
  bookings: number
  /** 营收 */
  revenue: Money
  /** 佣金 */
  commission: Money
  /** 净收入 */
  netRevenue: Money
  /** 入住率占比 */
  occupancyShare: number
}