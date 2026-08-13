/**
 * OTA 渠道运行时类型
 * 用于在适配器之间传递数据的非领域类型。
 */

import type { ChannelId } from '@/types/domain/channel'

/** 同步任务状态 */
export type SyncTaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'partial' | 'cancelled'

/** 同步任务类型 */
export type SyncTaskType = 'inventory_push' | 'rate_push' | 'order_pull' | 'order_confirm' | 'order_cancel'

/** 同步任务 */
export interface SyncTask {
  id: string
  channelId: ChannelId
  type: SyncTaskType
  status: SyncTaskStatus
  /** 待同步的数据条目数 */
  itemCount: number
  /** 成功条目数 */
  successCount: number
  /** 失败条目数 */
  failureCount: number
  /** 错误信息（汇总） */
  errorMessage?: string
  /** 触发方式 */
  trigger: 'auto' | 'manual' | 'webhook'
  /** 操作人 */
  operatorId?: string
  createdAt: Date
  startedAt?: Date
  finishedAt?: Date
}

/** 防超售判定结果 */
export interface OversellCheckResult {
  /** 是否可接受该订单 */
  acceptable: boolean
  /** 冲突订单 ID（acceptable=false 时） */
  conflictingBookingIds: string[]
  /** 建议操作 */
  suggestion: 'accept' | 'reject' | 'waitlist'
  /** 冲突详情 */
  detail?: string
}

/** 适配器运行时配置 */
export interface AdapterRuntimeConfig {
  /** HTTP 请求超时（毫秒） */
  timeoutMs: number
  /** 重试次数 */
  retryCount: number
  /** 重试间隔（毫秒） */
  retryIntervalMs: number
  /** 是否启用请求签名（部分平台需要） */
  signRequest: boolean
}