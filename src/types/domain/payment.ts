/**
 * 支付 / 退款 / 发票 / 佣金 领域类型
 * 民宿 PMS 的财务相关模型。
 */
import type { ID, ISODateTime, DateString, Money } from './common'
import type { ChannelId } from './channel'

// ========== 支付方式 ==========

/** 支付方式 */
export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'card' | 'transfer' | 'other'

/** 支付方式选项 */
export const PAYMENT_METHOD_OPTIONS = [
  { label: '现金', value: 'cash' },
  { label: '微信', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '银行卡', value: 'card' },
  { label: '对公转账', value: 'transfer' },
  { label: '其他', value: 'other' }
] as const

// ========== 支付状态 ==========

/** 支付状态 */
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed'

// ========== 支付记录 ==========

/** 支付记录 */
export interface Payment {
  id: ID
  /** 支付单号 */
  paymentNo: string
  /** 关联订单 ID */
  bookingId: ID
  /** 订单号（冗余） */
  orderNo: string
  /** 支付金额（单位：分） */
  amount: Money
  /** 支付方式 */
  method: PaymentMethod
  /** 支付渠道（OTA 来源时记录） */
  channelId?: ChannelId
  /** 渠道支付流水号 */
  channelTransactionId?: string
  /** 状态 */
  status: PaymentStatus
  /** 支付时间 */
  paidAt?: ISODateTime
  /** 经办人 */
  operatorId: ID
  /** 备注 */
  remark?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ========== 退款 ==========

/** 退款状态 */
export type RefundStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected'

/** 退款记录 */
export interface Refund {
  id: ID
  /** 退款单号 */
  refundNo: string
  /** 关联订单 ID */
  bookingId: ID
  /** 关联支付 ID */
  paymentId: ID
  /** 退款金额（单位：分） */
  amount: Money
  /** 退款方式（默认原路退回） */
  method: PaymentMethod
  /** 状态 */
  status: RefundStatus
  /** 退款原因 */
  reason: string
  /** 申请时间 */
  requestedAt: ISODateTime
  /** 审批时间 */
  approvedAt?: ISODateTime
  /** 审批人 */
  approvedBy?: ID
  /** 完成时间 */
  completedAt?: ISODateTime
  /** 渠道退款流水号 */
  channelRefundId?: string
  remark?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ========== 发票 ==========

/** 发票类型 */
export type InvoiceType = 'vat_general' | 'vat_special' | 'electronic_general' | 'electronic_special'

/** 发票状态 */
export type InvoiceStatus = 'pending' | 'issued' | 'sent' | 'cancelled'

/** 发票 */
export interface Invoice {
  id: ID
  /** 发票号 */
  invoiceNo: string
  /** 关联订单 ID */
  bookingId: ID
  /** 订单号（冗余） */
  orderNo: string
  /** 发票类型 */
  type: InvoiceType
  /** 抬头 */
  title: string
  /** 税号 */
  taxNumber: string
  /** 开票金额（单位：分） */
  amount: Money
  /** 邮箱（电子发票发送目标） */
  email?: string
  /** 状态 */
  status: InvoiceStatus
  /** 开票时间 */
  issuedAt?: ISODateTime
  /** 经办人 */
  operatorId: ID
  remark?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ========== 佣金结算 ==========

/** 佣金结算状态 */
export type SettlementStatus = 'pending' | 'confirmed' | 'paid' | 'disputed'

/** 渠道佣金结算单 */
export interface ChannelSettlement {
  id: ID
  channelId: ChannelId
  /** 结算周期起 */
  periodStart: DateString
  /** 结算周期止 */
  periodEnd: DateString
  /** 结算金额（单位：分） */
  amount: Money
  /** 订单数 */
  orderCount: number
  /** 状态 */
  status: SettlementStatus
  /** 对账差异（单位：分，可正可负） */
  discrepancy?: Money
  /** 差异原因 */
  discrepancyReason?: string
  /** 到账时间 */
  receivedAt?: ISODateTime
  /** 结算单 PDF URL */
  statementUrl?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}