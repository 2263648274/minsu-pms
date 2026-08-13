/**
 * 渠道管理器
 *
 * 集中对外暴露渠道适配能力，业务代码通过 ChannelManager 与各平台交互，
 * 不直接 import 具体适配器类。
 *
 * 使用示例：
 * ```ts
 * import { channelManager } from '@/channels'
 *
 * // 列出已注册的所有平台
 * const channels = channelManager.listChannels()
 *
 * // 推送库存到携程
 * const result = await channelManager.invoke('ctrip', a => a.pushInventory('prop-1', updates))
 *
 * // 健康检查全部平台
 * const health = await channelManager.healthCheckAll()
 * ```
 */
import type { ChannelId, ChannelMeta, ChannelStatus } from '@/types/domain/channel'
import type { ChannelAdapter } from '../types'
import { channelList, getAdapter } from '../adapters/registry'

export class ChannelManager {
  private readonly channels: ChannelMeta[]
  /** 当前各渠道的状态（Phase 2 接入持久化） */
  private readonly statuses = new Map<ChannelId, ChannelStatus>()

  constructor(channels: ChannelMeta[] = channelList) {
    this.channels = channels
    // 初始化默认状态
    channels.forEach(c => this.statuses.set(c.id, 'disconnected'))
  }

  /** 获取所有渠道元信息 */
  listChannels(): ChannelMeta[] {
    return [...this.channels]
  }

  /** 获取指定渠道元信息 */
  getChannel(channelId: ChannelId): ChannelMeta | undefined {
    return this.channels.find(c => c.id === channelId)
  }

  /** 获取适配器实例 */
  getAdapter(channelId: ChannelId): ChannelAdapter {
    return getAdapter(channelId)
  }

  /** 调用适配器的指定方法（带统一异常处理） */
  async invoke<T>(
    channelId: ChannelId,
    fn: (adapter: ChannelAdapter) => Promise<T>
  ): Promise<T> {
    const adapter = this.getAdapter(channelId)
    try {
      return await fn(adapter)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[ChannelManager.${channelId}] ${message}`)
      throw err
    }
  }

  /** 设置渠道状态（Phase 2 接 ChannelConfig 数据） */
  setStatus(channelId: ChannelId, status: ChannelStatus): void {
    this.statuses.set(channelId, status)
  }

  /** 获取渠道状态 */
  getStatus(channelId: ChannelId): ChannelStatus {
    return this.statuses.get(channelId) || 'disconnected'
  }

  /** 健康检查全部渠道 */
  async healthCheckAll(): Promise<Record<ChannelId, { ok: boolean; latencyMs: number; errorMessage?: string }>> {
    const results: any = {}
    await Promise.all(
      this.channels.map(async c => {
        try {
          results[c.id] = await this.getAdapter(c.id).ping()
        } catch (err) {
          results[c.id] = {
            ok: false,
            latencyMs: 0,
            errorMessage: err instanceof Error ? err.message : String(err)
          }
        }
      })
    )
    return results
  }
}

/** 默认渠道管理器实例（单例） */
export const channelManager = new ChannelManager()