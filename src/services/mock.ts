// mock.ts - STUB FILE (Phase 2 switched to real backend)
// This file replaces the corrupted GBK mock data with empty stubs.
// Most functions return empty/placeholder values; real data comes from backend API.
// Phase 2: VITE_APP_MOCK_ENABLED=false in .env means most of these are never called at runtime.
// EXCEPTION: mockGetChannelSyncLogs / mockAppendSyncLog have real localStorage-backed implementations
//            because backend has no ChannelSyncController in Phase 2 — see ChannelSyncLog.vue.

import type {
  ChannelSyncLog,
  ChannelSyncLogParams
} from '@/types/domain/channel'
import type { PageResult, ISODateTime } from '@/types/domain/common'

const SYNC_LOG_STORAGE_KEY = 'pms_channel_sync_logs_v1'

function loadSyncLogs(): ChannelSyncLog[] {
  try {
    const raw = localStorage.getItem(SYNC_LOG_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChannelSyncLog[]
  } catch {
    return []
  }
}

function saveSyncLogs(logs: ChannelSyncLog[]): void {
  try {
    localStorage.setItem(SYNC_LOG_STORAGE_KEY, JSON.stringify(logs))
  } catch (e) {
    console.warn('mockAppendSyncLog: localStorage 写入失败', e)
  }
}

export const mockLogin = (..._args: any[]): any => ({})
export const mockGetUserList = (..._args: any[]): any => ({})
export const mockGetRoleList = (..._args: any[]): any => ({})
export const mockCreateRole = (..._args: any[]): any => ({})
export const mockUpdateRole = (..._args: any[]): any => ({})
export const mockDeleteRole = (..._args: any[]): any => ({})
export const mockGetHeroCards = (..._args: any[]): any => ({})
export const mockGetContentCards = (..._args: any[]): any => ({})
export const mockGetRoomList = (..._args: any[]): any => ({})
export const mockGetAllRooms = (..._args: any[]): any => ({})
export const mockCreateRoom = (..._args: any[]): any => ({})
export const mockUpdateRoom = (..._args: any[]): any => ({})
export const mockDeleteRoom = (..._args: any[]): any => ({})
export const mockGetOrderList = (..._args: any[]): any => ({})
export const mockGetAllOrders = (..._args: any[]): any => ({})
export const mockCreateOrder = (..._args: any[]): any => ({})
export const mockUpdateOrder = (..._args: any[]): any => ({})
export const mockDeleteOrder = (..._args: any[]): any => ({})
export const mockCheckIn = (..._args: any[]): any => ({})
export const mockCheckOut = (..._args: any[]): any => ({})
export const mockGetCustomerList = (..._args: any[]): any => ({})
export const mockGetAllCustomers = (..._args: any[]): any => ({})
export const mockCreateCustomer = (..._args: any[]): any => ({})
export const mockUpdateCustomer = (..._args: any[]): any => ({})
export const mockDeleteCustomer = (..._args: any[]): any => ({})
export const mockGetDashboardStats = (..._args: any[]): any => ({})
export const mockCancelBooking = (..._args: any[]): any => ({})
export const mockGetChannelConfigs = (..._args: any[]): any => ({})
export const mockGetChannelConfig = (..._args: any[]): any => ({})
export const mockUpdateChannelConfig = (..._args: any[]): any => ({})
export const mockConnectChannel = (..._args: any[]): any => ({})
export const mockGetGuestSpendHistory = (..._args: any[]): any => ({})
export const mockToggleBlacklist = (..._args: any[]): any => ({})
export const mockGetProperties = (..._args: any[]): any => ({})
export const mockGetProperty = (..._args: any[]): any => ({})
export const mockGetRoomTypes = (..._args: any[]): any => ({})
export const mockGetRooms = (..._args: any[]): any => ({})
export const mockUpdateRoomStatus = (..._args: any[]): any => ({})
export const mockGetRatePlans = (..._args: any[]): any => ({})
export const mockGetRateCalendar = (..._args: any[]): any => ({})
export const mockGetInventoryCalendar = (..._args: any[]): any => ({})

// ========== 同步日志 — localStorage 持久化（Phase 2 后端无 ChannelSyncController） ==========

/**
 * 查询同步日志（mock）
 * 字段过滤：channelId / type / status / startDate / endDate
 * 排序：按 createdAt 倒序
 * 分页：page / pageSize
 */
export const mockGetChannelSyncLogs = (
  params: ChannelSyncLogParams = {}
): PageResult<ChannelSyncLog> => {
  const all = loadSyncLogs().sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  )
  let filtered = all
  if (params.channelId) filtered = filtered.filter(l => l.channelId === params.channelId)
  if (params.type) filtered = filtered.filter(l => l.type === params.type)
  if (params.status) filtered = filtered.filter(l => l.status === params.status)
  if (params.startDate) {
    filtered = filtered.filter(l => (l.createdAt || '').slice(0, 10) >= params.startDate!)
  }
  if (params.endDate) {
    filtered = filtered.filter(l => (l.createdAt || '').slice(0, 10) <= params.endDate!)
  }
  const total = filtered.length
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 20)
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)
  return { list, total, page, pageSize }
}

/**
 * 追加一条同步日志（mock）
 * 自动写入 localStorage，最多保留 500 条
 */
export const mockAppendSyncLog = (log: ChannelSyncLog): void => {
  if (!log.createdAt) {
    log.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
  }
  const all = loadSyncLogs()
  all.unshift(log)
  // 上限 500 条，避免 localStorage 膨胀
  if (all.length > 500) all.length = 500
  saveSyncLogs(all)
}
