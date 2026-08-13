/**
 * 价格同步引擎（骨架）
 *
 * 职责：
 * 1. 接收 PMS 内部价格变更（基础价/节假日价/渠道价）
 * 2. 按渠道推送卖价（sellingPrice）和底价（basePrice）
 * 3. 与库存同步协同（关房日不需要推价格）
 *
 * Phase 1 范围：定义引擎接口和任务封装。
 * Phase 2/4 范围：实现价格日历计算、渠道价增量、批量推送。
 */
import type { ChannelAdapter, ChannelResult, RateUpdate } from '../types'
import type { SyncTask } from '../types'
import { InventorySyncEngine } from './InventorySyncEngine'

export interface RateSyncOptions {
  /** 是否覆盖已被人工改价的日期 */
  skipOverridden?: boolean
  /** 批量大小 */
  batchSize?: number
}

export class RateSyncEngine {
  /** 价格任务列表 */
  private readonly tasks: SyncTask[] = []

  /**
   * 推送价格到指定渠道
   * @param adapter 渠道适配器
   * @param propertyId 物业 ID
   * @param updates 价格更新列表
   */
  async push(
    adapter: ChannelAdapter,
    propertyId: string,
    updates: RateUpdate[],
    _options: RateSyncOptions = {}
  ): Promise<SyncTask> {
    const task: SyncTask = {
      id: `rate-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channelId: adapter.id,
      type: 'rate_push',
      status: 'pending',
      itemCount: updates.length,
      successCount: 0,
      failureCount: 0,
      trigger: 'manual',
      createdAt: new Date()
    }
    this.tasks.push(task)
    task.status = 'running'
    task.startedAt = new Date()
    try {
      const result: ChannelResult = await adapter.pushRate(propertyId, updates)
      if (result.success) {
        task.status = 'success'
        task.successCount = task.itemCount
      } else {
        task.status = 'failed'
        task.failureCount = task.itemCount
        task.errorMessage = result.errorMessage
      }
    } catch (err) {
      task.status = 'failed'
      task.failureCount = task.itemCount
      task.errorMessage = err instanceof Error ? err.message : String(err)
    } finally {
      task.finishedAt = new Date()
    }
    return task
  }

  /** 查询历史 */
  getHistory(): SyncTask[] {
    return [...this.tasks]
  }
}

/** 默认引擎实例（单例） */
export const rateSyncEngine = new RateSyncEngine()

// 避免导入顺序告警：显式引用 InventorySyncEngine 类型
export type { InventorySyncEngine }