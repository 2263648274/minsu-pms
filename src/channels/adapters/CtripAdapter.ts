/**
 * 携程 OTA 适配器（骨架）
 *
 * Phase 1：定义接口契约 + 空壳实现。
 * Phase 4：根据携程 PMS API 文档实现具体业务逻辑。
 *
 * 参考资料（待 Phase 4 整理）：
 * - 携程 PMS API 文档：https://pmsopen.ctrip.com/
 * - 鉴权方式：OAuth 2.0
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
} from '../types'

export class CtripAdapter implements ChannelAdapter {
  readonly id = 'ctrip' as const
  readonly displayName = '携程'
  readonly protocol = 'pms-api' as const

  // Phase 1 占位
  async authenticate(_credentials: ChannelCredentials): Promise<AuthResult> {
    return this.notImplemented('authenticate')
  }

  async refreshToken(_credentials: ChannelCredentials): Promise<AuthResult> {
    return this.notImplemented('refreshToken')
  }

  async pushInventory(_propertyId: string, _updates: InventoryUpdate[]): Promise<ChannelResult> {
    return this.notImplemented('pushInventory')
  }

  async pushRate(_propertyId: string, _updates: RateUpdate[]): Promise<ChannelResult> {
    return this.notImplemented('pushRate')
  }

  async pullOrders(_since: Date): Promise<ChannelOrder[]> {
    return this.notImplemented('pullOrders')
  }

  async confirmOrder(_channelOrderId: string): Promise<ChannelResult> {
    return this.notImplemented('confirmOrder')
  }

  async cancelOrder(_channelOrderId: string, _reason: string): Promise<ChannelResult> {
    return this.notImplemented('cancelOrder')
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; errorMessage?: string }> {
    return { ok: false, latencyMs: 0, errorMessage: 'Ctrip adapter not implemented (Phase 4)' }
  }

  private notImplemented(method: string): any {
    return Promise.reject(
      new Error(`[CtripAdapter.${method}] Phase 4 待实现：携程 PMS API 接入`)
    )
  }
}