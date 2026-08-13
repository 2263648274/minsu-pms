/**
 * OTA 适配器注册表
 *
 * 集中管理 5 个平台适配器：
 * - 提供平台元信息（展示用）
 * - 提供懒加载的适配器实例（避免一次性初始化所有平台）
 * - 提供状态映射辅助函数
 *
 * 使用方式：
 * ```ts
 * import { channelList, getAdapter, statusLabel } from '@/channels/adapters/registry'
 *
 * // 列出所有平台
 * channelList.forEach(c => console.log(c.displayName))
 *
 * // 获取某个平台的适配器实例（懒加载）
 * const adapter = await getAdapter('ctrip')
 * const result = await adapter.pushInventory(...)
 * ```
 */
import type { ChannelMeta, ChannelId, ChannelStatus } from '@/types/domain/channel'
import type { ChannelAdapter } from '../types'
import { CtripAdapter } from './CtripAdapter'
import { FliggyAdapter } from './fliggy'
import { MeituanAdapter } from './meituan'
import { DouyinAdapter } from './douyin'
import { TaobaoAdapter } from './taobao'

// 重新导出领域类型，方便调用方一次 import
export type { ChannelMeta, ChannelId, ChannelStatus }

// ========== 平台元信息 ==========

export const channelList: ChannelMeta[] = [
  {
    id: 'ctrip',
    displayName: '携程',
    short: '携',
    color: '#2577e3',
    protocol: 'pms-api',
    protocolLabel: 'PMS API',
    portalUrl: 'https://pmsopen.ctrip.com/'
  },
  {
    id: 'fliggy',
    displayName: '飞猪',
    short: '飞',
    color: '#ff6a00',
    protocol: 'openapi',
    protocolLabel: 'OpenAPI (TOP)',
    portalUrl: 'https://open.alitrip.com/'
  },
  {
    id: 'meituan',
    displayName: '美团',
    short: '美',
    color: '#ffc300',
    protocol: 'pms',
    protocolLabel: 'PMS',
    portalUrl: 'https://www.meituan.com/'
  },
  {
    id: 'douyin',
    displayName: '抖音',
    short: '抖',
    color: '#161823',
    protocol: 'openapi',
    protocolLabel: 'OpenAPI',
    portalUrl: 'https://life.douyin.com/'
  },
  {
    id: 'taobao',
    displayName: '淘宝',
    short: '淘',
    color: '#ff4400',
    protocol: 'openapi',
    protocolLabel: 'OpenAPI (TOP)',
    portalUrl: 'https://www.taobao.com/'
  }
]

// ========== 适配器实例缓存 ==========

const adapterCache = new Map<ChannelId, ChannelAdapter>()

/**
 * 获取某个平台的适配器实例（懒加载 + 单例）
 */
export function getAdapter(channelId: ChannelId): ChannelAdapter {
  if (adapterCache.has(channelId)) {
    return adapterCache.get(channelId)!
  }
  let adapter: ChannelAdapter
  switch (channelId) {
    case 'ctrip':
      adapter = new CtripAdapter()
      break
    case 'fliggy':
      adapter = new FliggyAdapter()
      break
    case 'meituan':
      adapter = new MeituanAdapter()
      break
    case 'douyin':
      adapter = new DouyinAdapter()
      break
    case 'taobao':
      adapter = new TaobaoAdapter()
      break
  }
  adapterCache.set(channelId, adapter)
  return adapter
}

/** 清空适配器缓存（用于测试或多租户切换） */
export function clearAdapterCache(): void {
  adapterCache.clear()
}

// ========== 辅助函数 ==========

/** 渠道状态 → 中文标签 */
export function statusLabel(status: ChannelStatus): string {
  const map: Record<ChannelStatus, string> = {
    disconnected: '未连接',
    pending: '连接中',
    connected: '已连接',
    suspended: '已暂停',
    error: '连接异常'
  }
  return map[status] || status
}

/** 渠道状态 → Element Plus Tag 类型 */
export function statusTagType(status: ChannelStatus): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<ChannelStatus, 'success' | 'warning' | 'info' | 'danger'> = {
    disconnected: 'info',
    pending: 'warning',
    connected: 'success',
    suspended: 'info',
    error: 'danger'
  }
  return map[status] || 'info'
}