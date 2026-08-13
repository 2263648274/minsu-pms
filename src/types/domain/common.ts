/**
 * 通用类型定义
 * 适用于 PMS 各业务模块的响应、分页、ID、金额、日期范围等基础类型。
 */

// ========== 响应结构 ==========

/** 后端通用响应包装 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// ========== 分页 ==========

/** 列表查询参数 */
export interface PageParams {
  page?: number
  pageSize?: number
  keyword?: string
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ========== 标识符 ==========

/** 通用 ID 类型（前台字符串、后台数字都支持） */
export type ID = string | number

/** 时间戳（ISO 字符串） */
export type ISODateTime = string

/** 日期（YYYY-MM-DD） */
export type DateString = string

// ========== 金额 ==========

/** 金额（单位：分） */
export interface Money {
  /** 金额数值（单位：分） */
  amount: number
  /** 货币代码：CNY/USD 等 */
  currency: 'CNY' | 'USD' | 'EUR' | 'HKD' | 'JPY'
}

// ========== 日期范围 ==========

/** 日期范围 */
export interface DateRange {
  startDate: DateString
  endDate: DateString
}

// ========== 审计字段 ==========

/** 创建/更新时间戳混入 */
export interface AuditTimestamps {
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

/** 创建人/更新人混入 */
export interface AuditUsers {
  createdBy?: ID
  updatedBy?: ID
}

// ========== 通用字典 ==========

/** 通用字典项 */
export interface DictItem<V = string> {
  label: string
  value: V
  /** 业务色 */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 是否禁用 */
  disabled?: boolean
}