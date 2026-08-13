/**
 * 抖音 OTA 适配器（骨架）
 *
 * Phase 1：定义接口契约 + 空壳实现。
 * Phase 4：根据抖音民宿 OpenAPI 文档实现具体业务逻辑。
 *
 * 参考资料（待 Phase 4 整理）：
 * - 抖音民宿：https://life.douyin.com/
 * - 鉴权方式：OAuth 2.0
 * - 接口规范：REST + JSON，签名机制
 */
import type {
  ChannelAdapter,
  ChannelCredentials,
  AuthResult,
  ChannelResult,
  ChannelOrder,
  InventoryUpdate,
  RateUpdate
} from '../../types'

export class DouyinAdapter implements ChannelAdapter {
  readonly id = 'douyin' as const
  readonly displayName = '抖音'
  readonly protocol = 'openapi' as const

  async authenticate(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[DouyinAdapter.authenticate] Phase 4 待实现：抖音民宿 OpenAPI 接入'))
  }

  async refreshToken(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[DouyinAdapter.refreshToken] Phase 4 待实现'))
  }

  async pushInventory(_propertyId: string, _updates: InventoryUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[DouyinAdapter.pushInventory] Phase 4 待实现'))
  }

  async pushRate(_propertyId: string, _updates: RateUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[DouyinAdapter.pushRate] Phase 4 待实现'))
  }

  async pullOrders(_since: Date): Promise<ChannelOrder[]> {
    return Promise.reject(new Error('[DouyinAdapter.pullOrders] Phase 4 待实现'))
  }

  async confirmOrder(_channelOrderId: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[DouyinAdapter.confirmOrder] Phase 4 待实现'))
  }

  async cancelOrder(_channelOrderId: string, _reason: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[DouyinAdapter.cancelOrder] Phase 4 待实现'))
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; errorMessage?: string }> {
    return { ok: false, latencyMs: 0, errorMessage: 'Douyin adapter not implemented (Phase 4)' }
  }
}