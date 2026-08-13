/**
 * OTA 渠道 领域类型
 * 描述 PMS 与外部 OTA 平台（携程/飞猪/美团/抖音/淘宝）对接的业务模型。
 *
 * 注意：本文件定义的是**业务数据模型**。
 * **平台适配器接口契约**定义在 `src/channels/types/ChannelAdapter.ts`。
 */
import type { ID, ISODateTime, DateString, Money } from './common'
import type { BookingStatus } from './booking'

// ========== 渠道标识 ==========

/** OTA 渠道标识（与适配器 id 一致） */
export type ChannelId = 'ctrip' | 'fliggy' | 'meituan' | 'douyin' | 'taobao'

/** 渠道元信息（展示用） */
export interface ChannelMeta {
  id: ChannelId
  displayName: string
  /** 平台简称（用于 Logo 占位） */
  short: string
  /** Logo 背景色 */
  color: string
  /** 协议类型 */
  protocol: 'pms-api' | 'openapi' | 'pms' | 'webhook'
  /** 协议描述 */
  protocolLabel: string
  /** 官网链接（用于申请凭证） */
  portalUrl?: string
  /** 文档链接（Phase 4 接入用） */
  docsUrl?: string
}

// ========== 渠道配置 ==========

/** 渠道状态 */
export type ChannelStatus = 'disconnected' | 'pending' | 'connected' | 'suspended' | 'error'

/** 渠道配置（凭证） */
export interface ChannelConfig {
  id: ID
  /** 渠道 ID */
  channelId: ChannelId
  /** 物业 ID（多物业时可分别配置） */
  propertyId: ID
  status: ChannelStatus
  /** 凭证（敏感，加密存储） */
  credentials: {
    /** App Key / Hotel ID */
    appKey?: string
    /** Secret / API Secret */
    secret?: string
    /** 访问令牌 */
    accessToken?: string
    /** 刷新令牌 */
    refreshToken?: string
    /** Token 过期时间 */
    expiresAt?: ISODateTime
    /** 卖家/酒店 ID */
    sellerId?: string
    /** 额外自定义字段 */
    extras?: Record<string, string>
  }
  /** 佣金率（0-1） */
  commissionRate: number
  /** 结算账户 */
  settlementAccount?: string
  /** 同步设置 */
  syncSettings: {
    /** 是否推送库存 */
    pushInventory: boolean
    /** 是否推送价格 */
    pushRate: boolean
    /** 是否拉取订单 */
    pullOrders: boolean
    /** 自动确认订单 */
    autoConfirm: boolean
    /** 同步触发方式：定时/webhook/手动 */
    trigger: 'schedule' | 'webhook' | 'manual'
    /** 定时同步间隔（分钟） */
    intervalMinutes?: number
  }
  /** 最后同步状态 */
  lastSync?: {
    at?: ISODateTime
    inventoryOk?: boolean
    rateOk?: boolean
    ordersOk?: boolean
    errorMessage?: string
  }
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ========== 渠道订单 ==========

/** 渠道原始订单（从 OTA 拉取后未转内部订单前） */
export interface ChannelOrder {
  /** 渠道侧订单号 */
  channelOrderId: string
  channelId: ChannelId
  /** 内部对应订单 ID（已转换后） */
  internalBookingId?: ID
  // 客人
  guestName: string
  guestPhone: string
  guestIdCard?: string
  // 房间
  /** 渠道侧房型 ID */
  channelRoomTypeId: string
  /** 渠道侧房型名 */
  channelRoomTypeName: string
  /** 内部房型映射 */
  internalRoomTypeId?: ID
  // 时间
  checkInDate: DateString
  checkOutDate: DateString
  nights: number
  guests: number
  // 价格
  /** 卖价（客人支付，单位：分） */
  sellingAmount: Money
  /** 底价（应付给酒店，单位：分） */
  baseAmount: Money
  /** 渠道佣金（单位：分） */
  commission: Money
  // 状态
  /** 渠道侧状态 */
  channelStatus: string
  /** 映射后内部状态 */
  internalStatus: BookingStatus
  // 时间戳
  createdAt: ISODateTime
  updatedAt: ISODateTime
  /** 拉取时间 */
  pulledAt: ISODateTime
  /** 是否已转换 */
  converted: boolean
}

// ========== 房型映射 ==========

/** 渠道房型与内部房型映射 */
export interface ChannelRoomTypeMapping {
  id: ID
  channelId: ChannelId
  /** 渠道侧房型 ID */
  channelRoomTypeId: string
  /** 渠道侧房型名（冗余） */
  channelRoomTypeName: string
  /** 内部房型 ID */
  internalRoomTypeId: ID
  /** 内部房型名（冗余） */
  internalRoomTypeName: string
  /** 渠道侧卖价增量（单位：分，可负） */
  priceAdjustment?: number
  /** 是否启用 */
  enabled: boolean
}

// ========== 同步日志 ==========

/** 同步日志类型 */
export type SyncLogType = 'inventory_push' | 'rate_push' | 'order_pull' | 'order_confirm' | 'order_cancel'

/** 同步日志状态 */
export type SyncLogStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial'

/** 同步日志 */
export interface ChannelSyncLog {
  id: ID
  channelId: ChannelId
  type: SyncLogType
  status: SyncLogStatus
  /** 请求 payload（敏感字段脱敏） */
  request?: Record<string, unknown>
  /** 响应结果 */
  response?: Record<string, unknown>
  /** 错误信息 */
  errorMessage?: string
  /** 错误堆栈 */
  errorStack?: string
  /** 耗时（毫秒） */
  durationMs?: number
  /** 触发方式 */
  trigger: 'auto' | 'manual' | 'webhook'
  /** 触发人 */
  operatorId?: ID
  createdAt: ISODateTime
}

/** 同步日志查询参数 */
export interface ChannelSyncLogParams {
  channelId?: ChannelId
  type?: SyncLogType
  status?: SyncLogStatus
  startDate?: DateString
  endDate?: DateString
  page?: number
  pageSize?: number
}

// ========== 渠道聚合统计 ==========

/** 渠道订单统计 */
export interface ChannelStats {
  channelId: ChannelId
  /** 今日订单数 */
  todayOrders: number
  /** 今日营收（卖价） */
  todayRevenue: Money
  /** 今日佣金 */
  todayCommission: Money
  /** 本月订单数 */
  monthOrders: number
  /** 本月营收 */
  monthRevenue: Money
  /** 本月佣金 */
  monthCommission: Money
  /** 入住率（按该渠道订单占比） */
  occupancyShare: number
  /** 好评率 */
  ratingAverage?: number
}