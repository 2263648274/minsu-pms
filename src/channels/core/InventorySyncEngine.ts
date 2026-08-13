/**
 * 库存同步引擎（骨架）
 *
 * 职责：
 * 1. 接收 PMS 内部房态变更事件
 * 2. 按渠道分组、批量推送到对应平台
 * 3. 记录同步结果（成功/失败/重试）
 *
 * Phase 1 范围：定义引擎接口和任务封装。
 * Phase 2/4 范围：实现调度、批量切片、失败重试、并发控制。
 */
import type { ChannelId } from '@/types/domain/channel'
import type { ChannelAdapter, ChannelResult, InventoryUpdate } from '../types'
import type { SyncTask, SyncTaskType, SyncTaskStatus } from '../types'

export interface InventorySyncOptions {
  /** 是否强制推送（忽略本地变更时间戳） */
  force?: boolean
  /** 批量大小（每批推送多少条房态） */
  batchSize?: number
}

export class InventorySyncEngine {
  private readonly tasks: SyncTask[] = []

  /**
   * 推送库存到指定渠道
   * @param adapter 渠道适配器
   * @param propertyId 物业 ID
   * @param updates 库存更新列表
   * @param options 同步选项
   */
  async push(
    adapter: ChannelAdapter,
    propertyId: string,
    updates: InventoryUpdate[],
    options: InventorySyncOptions = {}
  ): Promise<SyncTask> {
    const task = this.createTask(adapter.id, 'inventory_push', updates.length)
    this.tasks.push(task)
    return this.runSync(task, () => adapter.pushInventory(propertyId, updates), options)
  }

  /** 查询同步历史 */
  getHistory(filter?: { channelId?: ChannelId; status?: SyncTaskStatus }): SyncTask[] {
    return this.tasks.filter(t => {
      if (filter?.channelId && t.channelId !== filter.channelId) return false
      if (filter?.status && t.status !== filter.status) return false
      return true
    })
  }

  // ========== 内部辅助 ==========

  private createTask(channelId: ChannelId, type: SyncTaskType, itemCount: number): SyncTask {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channelId,
      type,
      status: 'pending',
      itemCount,
      successCount: 0,
      failureCount: 0,
      trigger: 'manual',
      createdAt: new Date()
    }
  }

  private async runSync(
    task: SyncTask,
    fn: () => Promise<ChannelResult>,
    _options: InventorySyncOptions
  ): Promise<SyncTask> {
    task.status = 'running'
    task.startedAt = new Date()
    try {
      const result = await fn()
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
}

/** 默认引擎实例（单例） */
export const inventorySyncEngine = new InventorySyncEngine()