/**
 * 淘宝 OTA 适配器（骨架）
 *
 * Phase 1：定义接口契约 + 空壳实现。
 * Phase 4：根据淘宝/飞旅 OpenAPI 文档实现具体业务逻辑。
 *
 * 参考资料（待 Phase 4 整理）：
 * - 淘宝飞旅：阿里飞猪旗下（与飞猪共享部分基础设施，但 OpenAPI 不同）
 * - 鉴权方式：Session Key + App Key
 * - 接口规范：TOP 协议
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

export class TaobaoAdapter implements ChannelAdapter {
  readonly id = 'taobao' as const
  readonly displayName = '淘宝'
  readonly protocol = 'openapi' as const

  async authenticate(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[TaobaoAdapter.authenticate] Phase 4 待实现：淘宝飞旅 OpenAPI 接入'))
  }

  async refreshToken(_credentials: ChannelCredentials): Promise<AuthResult> {
    return Promise.reject(new Error('[TaobaoAdapter.refreshToken] Phase 4 待实现'))
  }

  async pushInventory(_propertyId: string, _updates: InventoryUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[TaobaoAdapter.pushInventory] Phase 4 待实现'))
  }

  async pushRate(_propertyId: string, _updates: RateUpdate[]): Promise<ChannelResult> {
    return Promise.reject(new Error('[TaobaoAdapter.pushRate] Phase 4 待实现'))
  }

  async pullOrders(_since: Date): Promise<ChannelOrder[]> {
    return Promise.reject(new Error('[TaobaoAdapter.pullOrders] Phase 4 待实现'))
  }

  async confirmOrder(_channelOrderId: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[TaobaoAdapter.confirmOrder] Phase 4 待实现'))
  }

  async cancelOrder(_channelOrderId: string, _reason: string): Promise<ChannelResult> {
    return Promise.reject(new Error('[TaobaoAdapter.cancelOrder] Phase 4 待实现'))
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; errorMessage?: string }> {
    return { ok: false, latencyMs: 0, errorMessage: 'Taobao adapter not implemented (Phase 4)' }
  }
}