/**
 * OTA 适配层统一导出
 *
 * 业务代码应该只从这里 import，**不要直接引用 adapters/* 子模块**。
 *
 * 推荐使用方式：
 * ```ts
 * import { channelManager, channelList, inventorySyncEngine } from '@/channels'
 *
 * // 列出所有平台（用于 UI 展示）
 * channelList.forEach(c => console.log(c.displayName))
 *
 * // 推送库存（实际推哪个平台由 channelManager 路由）
 * const task = await inventorySyncEngine.push(
 *   channelManager.getAdapter('ctrip'),
 *   propertyId,
 *   updates
 * )
 * ```
 */

// ========== 类型契约 ==========
export type {
  ChannelAdapter,
  ChannelAdapterFactory,
  ChannelCredentials,
  AuthResult,
  ChannelResult,
  ChannelOrder,
  InventoryUpdate,
  RateUpdate,
  OrderConversionContext,
  SyncTask,
  SyncTaskStatus,
  SyncTaskType,
  OversellCheckResult,
  AdapterRuntimeConfig
} from './types'

// ========== 适配器注册表 ==========
export {
  channelList,
  getAdapter,
  clearAdapterCache,
  statusLabel,
  statusTagType
} from './adapters/registry'

// ========== 核心引擎 ==========
export { ChannelManager, channelManager } from './core/ChannelManager'
export { InventorySyncEngine, inventorySyncEngine } from './core/InventorySyncEngine'
export type { InventorySyncOptions } from './core/InventorySyncEngine'
export { RateSyncEngine, rateSyncEngine } from './core/RateSyncEngine'
export type { RateSyncOptions } from './core/RateSyncEngine'
export { OrderAggregator, orderAggregator } from './core/OrderAggregator'
export type { AggregatedOrder, PullAllOptions } from './core/OrderAggregator'

// ========== 具体适配器（不推荐业务代码直接引用） ==========
export { CtripAdapter } from './adapters/CtripAdapter'
export { FliggyAdapter } from './adapters/fliggy'
export { MeituanAdapter } from './adapters/meituan'
export { DouyinAdapter } from './adapters/douyin'
export { TaobaoAdapter } from './adapters/taobao'