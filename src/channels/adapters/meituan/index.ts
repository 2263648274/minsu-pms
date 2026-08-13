/**
 * 美团 OTA 适配器（骨架）
 *
 * Phase 1：定义接口契约 + 空壳实现。
 * Phase 4：根据美团 PMS 文档实现具体业务逻辑。
 *
 * 参考资料（待 Phase 4 整理）：
 * - 美团 PMS：商家后台 → API 接入
 * - 鉴权方式：App Key + App Secret + Token
 * - 接口规范：REST + JSON
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

export class MeituanAdapter implements ChannelAdapter {
  readonly id = 'meituan' as const
  readonly displayName = '美团'
  readonly protocol = 'pms' as const

  async authenticate(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[MeituanAdapter.authenticate] Phase 4 待实现：美团 PMS 接入'))
  }

  async refreshToken(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[MeituanAdapter.refreshToken] Phase 4 待实现'))
  }

  async pushInventory(_propertyId: string, _updates: InventoryUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[MeituanAdapter.pushInventory] Phase 4 待实现'))
  }

  async pushRate(_propertyId: string, _updates: RateUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[MeituanAdapter.pushRate] Phase 4 待实现'))
  }

  async pullOrders(_since: Date): Promise<ChannelOrder[]> {
    return Promise.reject(new Error('[MeituanAdapter.pullOrders] Phase 4 待实现'))
  }

  async confirmOrder(_channelOrderId: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[MeituanAdapter.confirmOrder] Phase 4 待实现'))
  }

  async cancelOrder(_channelOrderId: string, _reason: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[MeituanAdapter.cancelOrder] Phase 4 待实现'))
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; errorMessage?: string }> {
    return { ok: false, latencyMs: 0, errorMessage: 'Meituan adapter not implemented (Phase 4)' }
  }
}