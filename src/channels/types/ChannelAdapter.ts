/**
 * OTA 渠道适配器接口契约
 *
 * 5 个 OTA 平台（携程/飞猪/美团/抖音/淘宝）各自有完全不同的 API 协议，
 * 适配器层对外暴露统一的接口，让上层业务代码不感知差异。
 *
 * Phase 1 范围：定义接口契约 + 5 个平台空壳实现。
 * Phase 4 范围：按真实平台 API 文档实现具体业务逻辑。
 */

import type { ChannelId } from '@/types/domain/channel'
import type { DateString, Money, ID } from '@/types/domain/common'

// ========== 通用结果 ==========

/** 渠道操作结果 */
export interface ChannelResult {
  /** 是否成功 */
  success: boolean
  /** 错误码 */
  errorCode?: string
  /** 错误信息 */
  errorMessage?: string
  /** 渠道侧返回的请求 ID（用于排查） */
  requestId?: string
  /** 额外数据（如订单 ID、价格 ID 等） */
  data?: Record<string, unknown>
}

// ========== 鉴权 ==========

/** 鉴权凭证（每个平台差异较大） */
export interface ChannelCredentials {
  appKey?: string
  secret?: string
  accessToken?: string
  refreshToken?: string
  sellerId?: string
  hotelId?: string
  extras?: Record<string, string>
}

/** 鉴权结果 */
export interface AuthResult {
  ok: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  errorMessage?: string
}

// ========== 库存推送 ==========

/** 单个房型库存更新 */
export interface InventoryUpdate {
  roomTypeId: string
  /** 渠道侧房型 ID（外部平台房型映射） */
  channelRoomTypeId: string
  /** 日期 */
  date: DateString
  /** 可售房数（-1 表示关房，0 表示售罄，>0 表示剩余房数） */
  available: number
  /** 关房原因（可选） */
  closeReason?: string
}

// ========== 价格推送 ==========

/** 单个房型价格更新 */
export interface RateUpdate {
  roomTypeId: string
  channelRoomTypeId: string
  date: DateString
  /** 卖价（单位：分，平台对客人展示价） */
  sellingPrice: Money
  /** 底价（单位：分，平台结算价，低于此值不可售） */
  basePrice: Money
  /** 币种（默认 CNY） */
  currency?: 'CNY'
}

// ========== 订单拉取 ==========

/** 渠道侧订单（未转换前） */
export interface ChannelOrder {
  /** 渠道订单号 */
  channelOrderId: string
  channelId: ChannelId
  // 客人
  guestName: string
  guestPhone: string
  guestIdCard?: string
  guestEmail?: string
  // 房间
  channelRoomTypeId: string
  channelRoomTypeName: string
  // 时间
  checkInDate: DateString
  checkOutDate: DateString
  nights: number
  guests: number
  // 价格
  sellingAmount: Money
  baseAmount: Money
  commission: Money
  // 状态
  channelStatus: string
  // 时间戳
  createdAt: Date
  updatedAt: Date
  /** 备注 */
  remark?: string
  /** 特殊要求 */
  specialRequests?: string[]
}

// ========== 平台适配器接口 ==========

/**
 * OTA 平台适配器接口契约。
 * 每个平台（携程/飞猪/美团/抖音/淘宝）实现本接口，
 * 上层业务代码通过 `ChannelManager` 调用，**不感知平台差异**。
 */
export interface ChannelAdapter {
  /** 平台唯一 ID */
  readonly id: ChannelId

  /** 平台显示名（中文） */
  readonly displayName: string

  /** API 协议类型（用于文档/UI 提示） */
  readonly protocol: 'pms-api' | 'openapi' | 'pms' | 'webhook'

  // ========== 鉴权 ==========

  /**
   * 鉴权（首次或凭证失效时）
   * @param credentials 渠道凭证
   */
  authenticate(credentials: ChannelCredentials): Promise<AuthResult>

  /**
   * 刷新 token（accessToken 即将过期时）
   */
  refreshToken(credentials: ChannelCredentials): Promise<AuthResult>

  // ========== 库存 ==========

  /**
   * 推送库存到渠道（批量更新房态）
   * @param propertyId 物业 ID
   * @param updates 库存更新列表
   */
  pushInventory(propertyId: string, updates: InventoryUpdate[]): Promise<ChannelResult>

  // ========== 价格 ==========

  /**
   * 推送价格到渠道
   * @param propertyId 物业 ID
   * @param updates 价格更新列表
   */
  pushRate(propertyId: string, updates: RateUpdate[]): Promise<ChannelResult>

  // ========== 订单 ==========

  /**
   * 拉取渠道订单（增量）
   * @param since 起始时间
   */
  pullOrders(since: Date): Promise<ChannelOrder[]>

  /** 确认订单（客人已入住或预付完成后通知渠道） */
  confirmOrder(channelOrderId: string): Promise<ChannelResult>

  /** 取消订单（同步取消到渠道） */
  cancelOrder(channelOrderId: string, reason: string): Promise<ChannelResult>

  // ========== 健康检查 ==========

  /** 心跳探测（用于监控渠道连通性） */
  ping(): Promise<{ ok: boolean; latencyMs: number; errorMessage?: string }>
}

// ========== 适配器工厂类型 ==========

/** 适配器工厂（懒加载 + 单例） */
export type ChannelAdapterFactory = () => ChannelAdapter | Promise<ChannelAdapter>

// ========== 内部订单转换上下文 ==========

/** 渠道订单 → 内部订单转换上下文 */
export interface OrderConversionContext {
  propertyId: ID
  /** 房型映射表（channelRoomTypeId → internalRoomTypeId） */
  roomTypeMapping: Map<string, ID>
  /** 内部默认管理员 ID（订单 createdBy） */
  defaultOperatorId: ID
}