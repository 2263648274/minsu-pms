/**
 * 订单 / 预订 领域类型
 * 民宿 PMS 的核心业务实体。一次入住 = 一个订单。
 * 订单可来源于直订、OTA 渠道、电话、walk-in 等。
 */
import type { ID, ISODateTime, DateString, PageParams, Money } from './common'

// ========== 订单来源 ==========

/** 订单来源渠道码 */
export type BookingSource =
  | 'direct'        // 直订（自有渠道：电话/微信/官网）
  | 'walk_in'       // 散客到店
  | 'ctrip'         // 携程
  | 'fliggy'        // 飞猪
  | 'meituan'       // 美团
  | 'douyin'        // 抖音
  | 'taobao'        // 淘宝
  | 'other'

// ========== 订单状态机 ==========

/**
 * 订单状态机（统一）：
 * pending → confirmed → checked_in → checked_out → completed
 *                ↓
 *            cancelled / refunded
 *
 * - pending 待支付/待确认
 * - confirmed 已确认（待入住）
 * - checked_in 已入住
 * - checked_out 已退房
 * - completed 已完成（财务归档）
 * - cancelled 已取消
 * - refunded 已退款
 * - no_show 未到店
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'no_show'

/** 订单状态选项（用于下拉框） */
export const BOOKING_STATUS_OPTIONS = [
  { label: '待支付', value: 'pending', color: 'warning' },
  { label: '已确认', value: 'confirmed', color: 'primary' },
  { label: '已入住', value: 'checked_in', color: 'success' },
  { label: '已退房', value: 'checked_out', color: 'info' },
  { label: '已完成', value: 'completed', color: 'info' },
  { label: '已取消', value: 'cancelled', color: 'danger' },
  { label: '已退款', value: 'refunded', color: 'danger' },
  { label: '未到店', value: 'no_show', color: 'danger' }
] as const

// ========== 入住记录 ==========

/** 入住人信息（同房间多人时数组） */
export interface CheckInGuest {
  /** 入住人姓名 */
  name: string
  /** 身份证号 */
  idCard?: string
  /** 性别 */
  gender?: 'male' | 'female'
  /** 国籍 */
  nationality?: string
  /** 是否主入住人 */
  isMain: boolean
}

/** 入住记录 */
export interface CheckInRecord {
  id: ID
  bookingId: ID
  /** 实际入住时间 */
  checkInAt: ISODateTime
  /** 实际退房时间 */
  checkOutAt?: ISODateTime
  /** 入住人列表 */
  guests: CheckInGuest[]
  /** 押金（单位：分） */
  deposit: Money
  /** 押金支付方式 */
  depositPayment?: 'cash' | 'card' | 'wechat' | 'alipay' | 'other'
  /** 押金退还方式 */
  depositRefundPayment?: 'cash' | 'card' | 'wechat' | 'alipay' | 'other'
  /** 房间钥匙/房卡编号 */
  roomKeyNo?: string
  /** 入住备注 */
  remark?: string
  /** 经办人 */
  operatorId: ID
}

// ========== 订单主实体 ==========

/** 订单 */
export interface Booking {
  id: ID
  /** 订单号（业务唯一） */
  orderNo: string
  // 物业/房间
  propertyId: ID
  propertyName: string
  roomTypeId: ID
  roomTypeName: string
  roomId?: ID
  roomNo?: string
  // 客人
  guestId?: ID
  guestName: string
  guestPhone: string
  guestIdCard?: string
  // 时间
  checkInDate: DateString
  checkOutDate: DateString
  nights: number
  guests: number
  // 价格
  /** 房费（单位：分） */
  roomAmount: Money
  /** 其他费用（单位：分） */
  otherAmount?: Money
  /** 总金额（单位：分） */
  totalAmount: Money
  /** 已付金额（单位：分） */
  paidAmount: Money
  // 渠道
  source: BookingSource
  /** 渠道订单号（OTA 来源时） */
  channelOrderNo?: string
  /** 渠道 ID */
  channelId?: ID
  /** 渠道佣金（单位：分） */
  channelCommission?: Money
  // 状态
  status: BookingStatus
  /** 状态历史（便于审计） */
  statusHistory?: Array<{
    status: BookingStatus
    at: ISODateTime
    operatorId?: ID
    note?: string
  }>
  // 备注
  remark?: string
  /** 特殊要求 */
  specialRequests?: string[]
  /** 取消原因 */
  cancelReason?: string
  // 审计
  createdAt: ISODateTime
  updatedAt: ISODateTime
  createdBy?: ID
}

// ========== 列表查询 ==========

/** 订单列表查询参数 */
export interface BookingListParams extends PageParams {
  orderNo?: string
  guestName?: string
  guestPhone?: string
  roomNo?: string
  status?: BookingStatus | BookingStatus[]
  source?: BookingSource | BookingSource[]
  propertyId?: ID
  roomTypeId?: ID
  channelId?: ID
  checkInDateFrom?: DateString
  checkInDateTo?: DateString
  createdFrom?: ISODateTime
  createdTo?: ISODateTime
}

// ========== 操作请求 ==========

/** 创建订单请求 */
export interface CreateBookingRequest {
  propertyId: ID
  roomTypeId: ID
  roomId?: ID
  guestName: string
  guestPhone: string
  guestIdCard?: string
  checkInDate: DateString
  checkOutDate: DateString
  guests: number
  source?: BookingSource
  remark?: string
  specialRequests?: string[]
  /** 是否自动确认（直订可自动，OTA 由渠道确认） */
  autoConfirm?: boolean
}

/** 入住请求 */
export interface CheckInRequest {
  bookingId: ID
  guests: CheckInGuest[]
  deposit: Money
  depositPayment: CheckInRecord['depositPayment']
  roomKeyNo?: string
  remark?: string
  /** 实际分配的房型 ID（可选，默认订单原房型） */
  assignedRoomTypeId?: ID
  /** 实际分配的房间 ID（可选） */
  assignedRoomId?: ID
}

/** 退房请求 */
export interface CheckOutRequest {
  bookingId: ID
  /** 实际退房日期（可选，默认原计划） */
  checkOutDate?: DateString
  /** 额外费用（单位：分，可选） */
  additionalAmount?: Money
  /** 额外费用说明 */
  additionalNote?: string
}

/** 取消请求 */
export interface CancelBookingRequest {
  bookingId: ID
  reason: string
  /** 是否退款 */
  refund: boolean
}