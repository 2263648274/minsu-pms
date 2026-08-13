/**
 * 订单聚合器（骨架）
 *
 * 职责：
 * 1. 从多个 OTA 渠道拉取订单（增量）
 * 2. 转换为内部订单（统一格式）
 * 3. 防超售检查（同一房型 × 日期是否有冲突订单）
 * 4. 去重（同一渠道订单号不可重复转换）
 *
 * Phase 1 范围：定义聚合器接口。
 * Phase 4 范围：实现防超售算法、增量游标、内部订单写入。
 */
import type { ChannelAdapter, ChannelOrder, OrderConversionContext, OversellCheckResult } from '../types'

export interface AggregatedOrder {
  channelOrder: ChannelOrder
  internalBookingId?: string
  /** 是否已转换为内部订单 */
  converted: boolean
  /** 防超售检查结果 */
  oversellCheck: OversellCheckResult
  /** 转换时间 */
  processedAt: Date
}

export interface PullAllOptions {
  /** 起始时间（增量拉取） */
  since: Date
  /** 单平台并行拉取的最大并发数 */
  concurrency?: number
}

export class OrderAggregator {
  private readonly processedOrderIds = new Set<string>()

  /**
   * 从单个渠道拉取订单并聚合
   */
  async pullFromChannel(
    adapter: ChannelAdapter,
    options: PullAllOptions
  ): Promise<AggregatedOrder[]> {
    const channelOrders = await adapter.pullOrders(options.since)
    return channelOrders
      .filter(o => !this.processedOrderIds.has(this.keyOf(o)))
      .map(o => this.toAggregated(o))
  }

  /**
   * 从多个渠道并发拉取
   */
  async pullFromAll(
    adapters: ChannelAdapter[],
    options: PullAllOptions
  ): Promise<AggregatedOrder[]> {
    const results = await Promise.all(
      adapters.map(a => this.pullFromChannel(a, options))
    )
    return results.flat()
  }

  /** 防超售检查（Phase 4 接入实际库存数据后实现） */
  checkOversell(_channelOrder: ChannelOrder, _context: OrderConversionContext): OversellCheckResult {
    // Phase 1 占位：始终通过
    return {
      acceptable: true,
      conflictingBookingIds: [],
      suggestion: 'accept'
    }
  }

  /** 标记订单已处理（去重） */
  markProcessed(channelOrder: ChannelOrder): void {
    this.processedOrderIds.add(this.keyOf(channelOrder))
  }

  /** 清空去重缓存（测试用） */
  clearProcessedCache(): void {
    this.processedOrderIds.clear()
  }

  // ========== 内部 ==========

  private keyOf(o: ChannelOrder): string {
    return `${o.channelId}:${o.channelOrderId}`
  }

  private toAggregated(channelOrder: ChannelOrder): AggregatedOrder {
    return {
      channelOrder,
      converted: false,
      oversellCheck: this.checkOversell(channelOrder, {} as OrderConversionContext),
      processedAt: new Date()
    }
  }
}

/** 默认聚合器实例（单例） */
export const orderAggregator = new OrderAggregator()