/**
 * 客人 领域类型
 * 民宿 PMS 的客户档案，包含消费记录、偏好、来源渠道。
 */
import type { ID, ISODateTime, DateString, PageParams, Money } from './common'
import type { BookingSource } from './booking'

// ========== VIP 等级 ==========

/** VIP 等级：0 普通 1 银卡 2 金卡 3 钻石 */
export type VipLevel = 0 | 1 | 2 | 3

// ========== 客人主实体 ==========

/** 性别 */
export type Gender = 'male' | 'female' | 'other'

/** 客人 */
export interface Guest {
  id: ID
  /** 姓名 */
  name: string
  /** 手机号 */
  phone: string
  /** 身份证号 */
  idCard?: string
  gender?: Gender
  birthday?: DateString
  /** 国籍 */
  nationality?: string
  /** 邮箱 */
  email?: string
  /** 微信 */
  wechat?: string
  /** 所在城市 */
  city?: string
  address?: string
  // VIP
  vipLevel: VipLevel
  /** VIP 升级时间 */
  vipUpgradeAt?: ISODateTime
  // 统计
  /** 历史订单数 */
  totalBookings: number
  /** 累计消费（单位：分） */
  totalSpend: Money
  /** 平均客单价（单位：分） */
  averageSpend?: Money
  /** 首次入住时间 */
  firstStayAt?: ISODateTime
  /** 最近一次入住时间 */
  lastStayAt?: ISODateTime
  /** 首次来源渠道 */
  firstSource?: BookingSource
  /** 最近来源渠道 */
  lastSource?: BookingSource
  // 偏好
  preferences?: {
    /** 偏好房型 ID */
    preferredRoomTypeIds?: ID[]
    /** 偏好楼层 */
    preferredFloor?: 'high' | 'low' | 'any'
    /** 早餐偏好 */
    breakfast?: boolean
    /** 吸烟偏好 */
    smoking?: boolean
    /** 备注 */
    notes?: string[]
  }
  /** 客户标签 */
  tags?: string[]
  /** 是否黑名单 */
  blacklisted: boolean
  /** 黑名单原因 */
  blacklistReason?: string
  /** 内部备注 */
  remark?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ========== 列表查询 ==========

/** 客人列表查询参数 */
export interface GuestListParams extends PageParams {
  name?: string
  phone?: string
  idCard?: string
  vipLevel?: VipLevel | VipLevel[]
  source?: BookingSource
  blacklisted?: boolean
  /** 最近 N 天入住过 */
  stayedInLastDays?: number
  /** 累计消费下限（分） */
  minTotalSpend?: number
  /** 累计消费上限（分） */
  maxTotalSpend?: number
}

// ========== 客人消费记录 ==========

/** 客人消费记录（聚合展示用） */
export interface GuestSpendHistory {
  guestId: ID
  /** 订单列表 */
  bookings: Array<{
    bookingId: ID
    orderNo: string
    checkInDate: DateString
    checkOutDate: DateString
    nights: number
    amount: Money
    source: BookingSource
  }>
  /** 累计消费 */
  totalSpend: Money
  /** 平均入住时长（夜） */
  averageNights: number
}

// ========== VIP 规则 ==========

/** VIP 等级阈值定义 */
export interface VipRule {
  level: VipLevel
  /** 等级名 */
  name: string
  /** 累计消费门槛（单位：分） */
  minSpend: Money
  /** 折扣率（0.95 = 95 折） */
  discount: number
  /** 等级权益 */
  benefits: string[]
}