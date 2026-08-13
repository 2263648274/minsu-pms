/**
 * 飞猪 OTA 适配器（骨架）
 *
 * Phase 1：定义接口契约 + 空壳实现。
 * Phase 4：根据飞猪 OpenAPI 文档实现具体业务逻辑。
 *
 * 参考资料（待 Phase 4 整理）：
 * - 飞猪开放平台：https://open.alitrip.com/
 * - 鉴权方式：App Key + App Secret + 签名
 * - 接口规范：TOP 协议（基于 HTTP/HTTPS）
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

export class FliggyAdapter implements ChannelAdapter {
  readonly id = 'fliggy' as const
  readonly displayName = '飞猪'
  readonly protocol = 'openapi' as const

  async authenticate(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[FliggyAdapter.authenticate] Phase 4 待实现：飞猪 OpenAPI 接入'))
  }

  async refreshToken(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[FliggyAdapter.refreshToken] Phase 4 待实现'))
  }

  async pushInventory(_propertyId: string, _updates: InventoryUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[FliggyAdapter.pushInventory] Phase 4 待实现'))
  }

  async pushRate(_propertyId: string, _updates: RateUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[FliggyAdapter.pushRate] Phase 4 待实现'))
  }

  async pullOrders(_since: Date): Promise<ChannelOrder[]> {
    return Promise.reject(new Error('[FliggyAdapter.pullOrders] Phase 4 待实现'))
  }

  async confirmOrder(_channelOrderId: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[FliggyAdapter.confirmOrder] Phase 4 待实现'))
  }

  async cancelOrder(_channelOrderId: string, _reason: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[FliggyAdapter.cancelOrder] Phase 4 待实现'))
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; errorMessage?: string }> {
    return { ok: false, latencyMs: 0, errorMessage: 'Fliggy adapter not implemented (Phase 4)' }
  }
}