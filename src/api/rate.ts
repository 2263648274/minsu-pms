/**
 * 房价管理 - Mock Service
 *
 * 设计目的：
 * - Phase 2 房价管理 MVP 不接真实后端，纯前端演示用。
 * - 数据全部落到 localStorage（key: pms_rate_v1），刷新页面后保留。
 * - 类型与 @/types/domain/rate.ts 对齐（ZOOM 已 commit 的 HEAD 版本）。
 *
 * 金额单位：分（cents）；UI 显示时除以 100，提交时乘以 100。
 */

import type {
  RatePlan,
  DailyRate,
  DailyRateUpdate,
  DailyRateBatchUpdate,
  RateCalendar,
  RateCalendarQuery
} from '@/types/domain/rate'
import type { ID, DateString } from '@/types/domain/common'

// ========== localStorage 键 ==========
const STORAGE_KEY = 'pms_rate_v1'

// ========== 房型 mock（前端最小子集，不依赖后端 / api.ts） ==========

export interface RoomTypeBrief {
  id: ID
  propertyId: ID
  name: string
  /** 房型基础价（元） */
  basePrice: number
  /** 最大入住人数 */
  maxOccupancy: number
}

const MOCK_ROOM_TYPES: RoomTypeBrief[] = [
  { id: 1, propertyId: 1, name: '海景大床房', basePrice: 888, maxOccupancy: 2 },
  { id: 2, propertyId: 1, name: '山景双床房', basePrice: 688, maxOccupancy: 2 },
  { id: 3, propertyId: 1, name: '家庭亲子套房', basePrice: 1288, maxOccupancy: 4 }
]

// ========== 持久化形状 ==========

interface PersistShape {
  ratePlans: RatePlan[]
  dailyRates: DailyRate[]
  nextRatePlanId: number
  nextDailyRateId: number
}

function defaultShape(): PersistShape {
  return { ratePlans: [], dailyRates: [], nextRatePlanId: 1, nextDailyRateId: 1 }
}

function loadShape(): PersistShape {
  if (typeof window === 'undefined' || !window.localStorage) return defaultShape()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultShape()
    const parsed = JSON.parse(raw) as PersistShape
    return {
      ratePlans: parsed.ratePlans ?? [],
      dailyRates: parsed.dailyRates ?? [],
      nextRatePlanId: parsed.nextRatePlanId ?? 1,
      nextDailyRateId: parsed.nextDailyRateId ?? 1
    }
  } catch {
    return defaultShape()
  }
}

function saveShape(s: PersistShape): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

function mockDelay<T>(value: T, ms = 120): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

// ========== 房型 mock ==========

export async function listRoomTypes(): Promise<RoomTypeBrief[]> {
  return mockDelay([...MOCK_ROOM_TYPES])
}

// ========== RatePlan CRUD ==========

export async function listRatePlans(params?: {
  propertyId?: ID
  roomTypeId?: ID
  strategy?: RatePlan['strategy']
  status?: 0 | 1
  keyword?: string
}): Promise<RatePlan[]> {
  const s = loadShape()
  let list = [...s.ratePlans]
  if (params?.propertyId !== undefined) {
    list = list.filter(r => String(r.propertyId) === String(params.propertyId))
  }
  if (params?.roomTypeId !== undefined) {
    list = list.filter(r => {
      const scope = r.scope
      if (scope === 'all') return true
      if ('roomTypeIds' in scope) return scope.roomTypeIds.some(id => String(id) === String(params.roomTypeId))
      return false
    })
  }
  if (params?.strategy) list = list.filter(r => r.strategy === params.strategy)
  if (params?.status !== undefined) list = list.filter(r => r.status === params.status)
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(kw))
  }
  return mockDelay(list.sort((a, b) => Number(b.id) - Number(a.id)))
}

export async function listRatePlansByRoomType(roomTypeId: ID): Promise<RatePlan[]> {
  return listRatePlans({ roomTypeId })
}

export async function getRatePlan(id: ID): Promise<RatePlan | undefined> {
  const s = loadShape()
  const found = s.ratePlans.find(r => String(r.id) === String(id))
  return mockDelay(found)
}

export async function createRatePlan(payload: Partial<RatePlan>): Promise<RatePlan> {
  const s = loadShape()
  const now = new Date().toISOString()
  const plan: RatePlan = {
    id: s.nextRatePlanId,
    propertyId: payload.propertyId ?? 1,
    name: payload.name ?? '新建房价计划',
    strategy: payload.strategy ?? 'base',
    scope: payload.scope ?? { roomTypeIds: [] },
    pricingUnit: payload.pricingUnit ?? 'per_night',
    price: payload.price ?? { amount: 88800, currency: 'CNY' },
    priority: payload.priority ?? 0,
    status: payload.status ?? 1,
    description: payload.description,
    startDate: payload.startDate,
    endDate: payload.endDate,
    weekdays: payload.weekdays,
    minNights: payload.minNights,
    minAdvanceDays: payload.minAdvanceDays,
    channelId: payload.channelId,
    memberLevel: payload.memberLevel,
    createdAt: now,
    updatedAt: now
  }
  s.ratePlans.push(plan)
  s.nextRatePlanId += 1
  saveShape(s)
  return mockDelay(plan)
}

export async function updateRatePlan(id: ID, payload: Partial<RatePlan>): Promise<RatePlan | undefined> {
  const s = loadShape()
  const idx = s.ratePlans.findIndex(r => String(r.id) === String(id))
  if (idx < 0) return mockDelay(undefined)
  const cur = s.ratePlans[idx]
  const next: RatePlan = {
    ...cur,
    ...payload,
    id: cur.id,
    updatedAt: new Date().toISOString()
  }
  s.ratePlans[idx] = next
  saveShape(s)
  return mockDelay(next)
}

export async function deleteRatePlan(id: ID): Promise<boolean> {
  const s = loadShape()
  const before = s.ratePlans.length
  s.ratePlans = s.ratePlans.filter(r => String(r.id) !== String(id))
  saveShape(s)
  return mockDelay(s.ratePlans.length < before)
}

// ========== 价格日历（DailyRate） ==========

/** 返回 RateCalendar（含 rates[]，缺数据日期用房型基础价兜底） */
export async function queryRateCalendar(q: RateCalendarQuery): Promise<RateCalendar> {
  const s = loadShape()
  const roomTypes = await listRoomTypes()
  const rt = roomTypes.find(t => String(t.id) === String(q.roomTypeId))
  const baseCents = rt ? Math.round(rt.basePrice * 100) : 0

  const filtered = s.dailyRates.filter(d =>
    String(d.roomTypeId) === String(q.roomTypeId) &&
    d.date >= q.startDate &&
    d.date <= q.endDate
  )

  const existSet = new Set(filtered.map(d => d.date))
  const out: DailyRate[] = [...filtered]
  const days = enumerateDates(q.startDate, q.endDate)
  for (const date of days) {
    if (!existSet.has(date)) {
      out.push({
        date,
        roomTypeId: q.roomTypeId,
        price: { amount: baseCents, currency: 'CNY' },
        overridden: false
      })
    }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1))

  return mockDelay({
    propertyId: q.propertyId,
    roomTypeId: q.roomTypeId as ID,
    rates: out
  })
}

/** 单日 upsert：按 (roomTypeId, date) 唯一 */
export async function upsertDailyRate(payload: DailyRateUpdate): Promise<DailyRate> {
  const s = loadShape()
  const idx = s.dailyRates.findIndex(d =>
    String(d.roomTypeId) === String(payload.roomTypeId) && d.date === payload.date
  )
  if (idx >= 0) {
    const cur = s.dailyRates[idx]
    const next: DailyRate = {
      ...cur,
      price: payload.price,
      overridden: true,
      overrideReason: payload.overrideReason ?? cur.overrideReason
    }
    s.dailyRates[idx] = next
    saveShape(s)
    return mockDelay(next)
  }
  const dr: DailyRate = {
    date: payload.date,
    roomTypeId: payload.roomTypeId,
    price: payload.price,
    overridden: true,
    overrideReason: payload.overrideReason
  }
  s.dailyRates.push(dr)
  s.nextDailyRateId += 1
  saveShape(s)
  return mockDelay(dr)
}

/** 单日清除（删除覆盖价） */
export async function deleteDailyRate(roomTypeId: ID, date: DateString): Promise<boolean> {
  const s = loadShape()
  const before = s.dailyRates.length
  s.dailyRates = s.dailyRates.filter(d =>
    !(String(d.roomTypeId) === String(roomTypeId) && d.date === date)
  )
  saveShape(s)
  return mockDelay(s.dailyRates.length < before)
}

/**
 * 批量调价：覆盖范围内的所有日期为目标价格。
 * 如 skipOverridden=true，则跳过人工已覆盖的日期。
 */
export async function batchUpdateRates(payload: DailyRateBatchUpdate): Promise<number> {
  const s = loadShape()
  const dates = enumerateDates(payload.startDate, payload.endDate)
  let count = 0
  for (const date of dates) {
    const idx = s.dailyRates.findIndex(d =>
      String(d.roomTypeId) === String(payload.roomTypeId) && d.date === date
    )
    if (idx >= 0) {
      if (payload.skipOverridden && s.dailyRates[idx].overridden) continue
      s.dailyRates[idx] = {
        ...s.dailyRates[idx],
        price: payload.price
      }
      count += 1
    } else {
      s.dailyRates.push({
        date,
        roomTypeId: payload.roomTypeId,
        price: payload.price,
        overridden: false
      })
      count += 1
    }
  }
  s.nextDailyRateId += count
  saveShape(s)
  return mockDelay(count)
}

// ========== 工具 ==========

function enumerateDates(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out
  const cur = new Date(start)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** 清空本地数据（开发自测用） */
export function _resetRateMock(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.removeItem(STORAGE_KEY)
}