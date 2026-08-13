/**
 * 渠道 Service
 * OTA 平台（携程/飞猪/美团/抖音/淘宝）的配置、凭证、同步日志的入口。
 *
 * Phase 2 范围：
 * - 渠道配置 CRUD（凭证本地存储，模拟）
 * - 连接/断开/重新授权
 * - 同步日志查询（用于 ChannelSyncLog.vue）
 *
 * Phase 4 范围：实际调用 channel adapters 完成库存/价格/订单推送。
 * 当前的 pushInventory/pushRate/pullOrders 会写入同步日志，模拟适配器返回结果。
 */
import { channelList, getAdapter, type ChannelMeta } from '@/channels/adapters/registry'
import type {
  ChannelConfig,
  ChannelId,
  ChannelSyncLog,
  ChannelSyncLogParams,
  ChannelStats,
  SyncLogType,
  SyncLogStatus
} from '@/types/domain/channel'
import type { ID, PageResult, ISODateTime } from '@/types/domain/common'
import {
  mockGetChannelConfigs,
  mockGetChannelConfig,
  mockUpdateChannelConfig,
  mockConnectChannel,
  mockGetChannelSyncLogs,
  mockAppendSyncLog
} from './mock'

// 适配业务类型别名
type LogInput = {
  channelId: ChannelId
  type: SyncLogType
  status: SyncLogStatus
  trigger: 'auto' | 'manual' | 'webhook'
  durationMs?: number
  errorMessage?: string
  response?: Record<string, unknown>
}

function makeLog(input: LogInput): ChannelSyncLog {
  return {
    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channelId: input.channelId,
    type: input.type,
    status: input.status,
    trigger: input.trigger,
    durationMs: input.durationMs,
    errorMessage: input.errorMessage,
    response: input.response,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
  }
}

export const channelService = {
  // ========== 渠道元信息 ==========

  /** 获取所有平台元信息（来自 adapters/registry） */
  listChannels(): Promise<ChannelMeta[]> {
    return Promise.resolve([...channelList])
  },

  /** 按 ID 获取平台元信息 */
  getChannelMeta(channelId: ChannelId): Promise<ChannelMeta | undefined> {
    const found = channelList.find(c => c.id === channelId)
    return Promise.resolve(found)
  },

  // ========== 渠道配置 ==========

  /** 获取某物业下的所有渠道配置 */
  listChannelConfigs(propertyId?: ID): Promise<ChannelConfig[]> {
    return Promise.resolve(mockGetChannelConfigs(propertyId))
  },

  /** 获取单一渠道配置 */
  getChannelConfig(channelId: ChannelId, propertyId: ID): Promise<ChannelConfig | undefined> {
    return Promise.resolve(mockGetChannelConfig(channelId, propertyId))
  },

  /** 更新渠道配置（含凭证） */
  async updateChannelConfig(id: ID, data: Partial<ChannelConfig>): Promise<ChannelConfig | undefined> {
    return mockUpdateChannelConfig(id, data)
  },

  /** 接入新渠道（首次连接） */
  async connectChannel(
    channelId: ChannelId,
    propertyId: ID,
    credentials: ChannelConfig['credentials']
  ): Promise<ChannelConfig> {
    const log = makeLog({
      channelId,
      type: 'inventory_push',
      status: 'success',
      trigger: 'manual',
      durationMs: 350,
      response: { action: 'connect', ok: true }
    })
    mockAppendSyncLog(log)
    return mockConnectChannel(channelId, propertyId, credentials)
  },

  /** 断开渠道 */
  async disconnectChannel(id: ID): Promise<boolean> {
    const updated = mockUpdateChannelConfig(id, { status: 'disconnected' })
    return !!updated
  },

  // ========== 同步动作（模拟） ==========

  /**
   * 模拟推送库存到渠道。
   * Phase 4 会替换为真实调用 `adapter.pushInventory`。
   */
  async pushInventory(
    channelId: ChannelId,
    _roomTypeId: string,
    _dates: string[]
  ): Promise<{ ok: boolean; pushedDates: number }> {
    const t0 = Date.now()
    const dates = _dates.length || 1
    await new Promise(resolve => setTimeout(resolve, 200))
    // 调用真实适配器（Phase 4 接入）
    try {
      const adapter = getAdapter(channelId)
      // Phase 4 实现真实调用；当前仅做可达性检查
      await adapter.ping()
    } catch (e) {
      // 占位实现：忽略
    }
    mockAppendSyncLog(
      makeLog({
        channelId,
        type: 'inventory_push',
        status: 'success',
        trigger: 'manual',
        durationMs: Date.now() - t0,
        response: { pushedDates: dates }
      })
    )
    return { ok: true, pushedDates: dates }
  },

  /** 模拟推送价格到渠道 */
  async pushRate(
    channelId: ChannelId,
    _roomTypeId: string,
    dates: string[]
  ): Promise<{ ok: boolean; pushedDates: number }> {
    const t0 = Date.now()
    await new Promise(resolve => setTimeout(resolve, 180))
    mockAppendSyncLog(
      makeLog({
        channelId,
        type: 'rate_push',
        status: 'success',
        trigger: 'manual',
        durationMs: Date.now() - t0,
        response: { pushedDates: dates.length || 1 }
      })
    )
    return { ok: true, pushedDates: dates.length || 1 }
  },

  /** 模拟拉取订单 */
  async pullOrders(
    channelId: ChannelId,
    _since?: Date
  ): Promise<{ newOrders: number }> {
    const t0 = Date.now()
    await new Promise(resolve => setTimeout(resolve, 250))
    const newOrders = Math.floor(Math.random() * 3)
    mockAppendSyncLog(
      makeLog({
        channelId,
        type: 'order_pull',
        status: newOrders > 0 ? 'success' : 'success',
        trigger: 'manual',
        durationMs: Date.now() - t0,
        response: { newOrders }
      })
    )
    return { newOrders }
  },

  // ========== 同步日志 ==========

  getSyncLogs(params: ChannelSyncLogParams): Promise<PageResult<ChannelSyncLog>> {
    return Promise.resolve(mockGetChannelSyncLogs(params))
  },

  // ========== 渠道统计 ==========

  async getChannelStats(_channelId?: ChannelId): Promise<ChannelStats[]> {
    const configs = mockGetChannelConfigs()
    return configs.map(c => ({
      channelId: c.channelId,
      todayOrders: Math.floor(Math.random() * 5),
      todayRevenue: { amount: Math.floor(Math.random() * 800000), currency: 'CNY' },
      todayCommission: { amount: Math.floor(Math.random() * 80000), currency: 'CNY' },
      monthOrders: 12 + Math.floor(Math.random() * 50),
      monthRevenue: { amount: 3_000_000 + Math.floor(Math.random() * 8_000_000), currency: 'CNY' },
      monthCommission: { amount: 200_000 + Math.floor(Math.random() * 800_000), currency: 'CNY' },
      occupancyShare: 0.1 + Math.random() * 0.3
    }))
  }
}

export type ChannelService = typeof channelService
export default channelService
