/**
 * 房价管理 - API 客户端
 *
 * Phase 2.5（本 commit）：
 * - listRoomTypes / queryRateCalendar / upsertDailyRate / deleteDailyRate(恢复基础价) /
 *   batchUpdateRates 已切到真实后端（http://localhost:8090/api/*，由 Vite 代理）
 * - listRatePlansByRoomType / createRatePlan / updateRatePlan / deleteRatePlan 仍为
 *   前端 localStorage 持久化（Phase 2 收尾保留；前端 9 种 strategy 字段与后端
 *   RatePlan 实体未对齐，留待 Phase 3+ OTA 接入时一并解决）
 *
 * 金额单位：前端 types 存 cents（amount=88800=888.00元）；后端 rate_calendar.price
 * 为 BigDecimal 元。adapter 层统一 cents↔元 转换。
 *
 * 后端基础（参考 RateCalendarController / RoomTypeController）：
 * - GET  /api/room-types/by-property/{propertyId} → RoomType[]
 * - GET  /api/rate-calendar?roomTypeId&from&to[&ratePlanId] → RateCalendar[]
 * - POST /api/rate-calendar body=RateCalendarUpsertRequest → RateCalendar
 * - POST /api/rate-calendar/batch body=RateCalendarBatchRequest → Integer
 *
 * 缺数据日期兜底：后端 query 不做兜底，前端保留 mock 兜底逻辑（用房型基础价填充缺日期）。
 * 单日"清除"语义：后端无 DELETE 端点，前端用 upsert 把价格回填基础价来模拟。
 */

import type {
  RatePlan,
  DailyRate,
  DailyRateUpdate,
  DailyRateBatchUpdate,
  RateCalendar,
  RateCalendarQuery
} from '@/types/domain/rate'
import type { ID, DateString, Money } from '@/types/domain/common'

// 重新导出 DailyRate，保持向后兼容（RatePlanManage.vue 从 '@/api/rate' import）
export type { DailyRate }

// ========== HTTP 工具 ==========

const API_BASE = '/api'

interface ApiEnvelope<T> {
  code: number
  message?: string
  data: T
}

// eslint-disable-next-line no-undef
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  const body = (await res.json()) as ApiEnvelope<T>
  if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
    throw new Error(body.message ?? `API error code=${body.code}`)
  }
  return body.data
}

// ========== 金额单位转换 ==========

function yuanToCents(yuan: number | string): number {
  return Math.round(Number(yuan) * 100)
}

function centsToYuan(cents: number | string): number {
  return Number(cents) / 100
}

// ========== RoomType ==========

export interface RoomTypeBrief {
  id: ID
  propertyId: ID
  name: string
  /** 房型基础价（元） */
  basePrice: number
  /** 最大入住人数 */
  maxOccupancy: number
}

interface BackendRoomType {
  id: number
  propertyId: number
  name: string
  /** 后端 BigDecimal JSON 序列化为 number；保留 string 兼容 */
  basePrice: number | string
  maxOccupancy: number
}

function toRoomTypeBrief(rt: BackendRoomType): RoomTypeBrief {
  return {
    id: rt.id,
    propertyId: rt.propertyId,
    name: rt.name,
    basePrice: Number(rt.basePrice),
    maxOccupancy: rt.maxOccupancy
  }
}

/** 列出某物业下的房型（前端默认 propertyId=1）。 */
export async function listRoomTypes(propertyId: ID = 1): Promise<RoomTypeBrief[]> {
  const list = await http<BackendRoomType[]>(`/room-types/by-property/${propertyId}`)
  return list.map(toRoomTypeBrief)
}

// ========== RateCalendar 转换 ==========

interface BackendRateCalendar {
  id: number
  ratePlanId: number
  roomTypeId: number
  stayDate: string
  price: number | string
  currency: string
  available: number
  minNights: number | null
  remarks: string | null
  createdAt: string
  updatedAt: string
}

function calendarToDaily(c: BackendRateCalendar): DailyRate {
  return {
    date: c.stayDate,
    roomTypeId: c.roomTypeId,
    ratePlanId: c.ratePlanId,
    price: { amount: yuanToCents(c.price), currency: (c.currency || 'CNY') as Money['currency'] },
    overridden: true,
    overrideReason: c.remarks ?? undefined
  }
}

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

// ========== RatePlan 本地持久化（仅用于保留前端 9 种 strategy 字段） ==========

const RATE_PLAN_STORAGE_KEY = 'pms_rate_v1'

interface PersistShape {
  ratePlans: RatePlan[]
  nextRatePlanId: number
}

function defaultShape(): PersistShape {
  return { ratePlans: [], nextRatePlanId: 1 }
}

function loadShape(): PersistShape {
  if (typeof window === 'undefined' || !window.localStorage) return defaultShape()
  try {
    const raw = localStorage.getItem(RATE_PLAN_STORAGE_KEY)
    if (!raw) return defaultShape()
    const parsed = JSON.parse(raw) as PersistShape
    return {
      ratePlans: parsed.ratePlans ?? [],
      nextRatePlanId: parsed.nextRatePlanId ?? 1
    }
  } catch {
    return defaultShape()
  }
}

function saveShape(s: PersistShape): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.setItem(RATE_PLAN_STORAGE_KEY, JSON.stringify(s))
}

function mockDelay<T>(value: T, ms = 80): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

/**
 * 拿该房型一个 RatePlan id（用于日历 upsert/batch 必填字段）。
 * 本地 mock 库若没有匹配 plan，自动建一个默认 plan。
 */
async function ensureDefaultPlanId(roomTypeId: ID, propertyId: ID): Promise<ID> {
  const s = loadShape()
  let plan = s.ratePlans.find(r => {
    const scope = r.scope
    if (scope === 'all') return true
    if ('roomTypeIds' in scope) return scope.roomTypeIds.some(id => String(id) === String(roomTypeId))
    return false
  })
  if (!plan) {
    plan = {
      id: s.nextRatePlanId,
      propertyId,
      name: '默认基础价',
      strategy: 'base',
      scope: { roomTypeIds: [roomTypeId] },
      pricingUnit: 'per_night',
      price: { amount: 88800, currency: 'CNY' },
      priority: 0,
      status: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    s.ratePlans.push(plan)
    s.nextRatePlanId += 1
    saveShape(s)
  }
  return plan.id
}

// ========== RatePlan CRUD（仍 mock） ==========

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

// ========== 日历 API（已切真后端） ==========

/**
 * 查询某房型某段时间的房价。
 * 后端不带"缺数据日期兜底"，前端保留 mock 兜底（用房型基础价填充缺日期）。
 */
export async function queryRateCalendar(q: RateCalendarQuery): Promise<RateCalendar> {
  const params = new URLSearchParams({
    roomTypeId: String(q.roomTypeId ?? ''),
    from: q.startDate,
    to: q.endDate
  })
  const list = await http<BackendRateCalendar[]>(`/rate-calendar?${params}`)
  const roomTypes = await listRoomTypes(q.propertyId)
  const rt = roomTypes.find(t => String(t.id) === String(q.roomTypeId))
  const baseCents = rt ? yuanToCents(rt.basePrice) : 0

  const filtered = list.map(calendarToDaily)
  const existSet = new Set(filtered.map(d => d.date))
  const out: DailyRate[] = [...filtered]
  const days = enumerateDates(q.startDate, q.endDate)
  for (const date of days) {
    if (!existSet.has(date)) {
      out.push({
        date,
        roomTypeId: q.roomTypeId as ID,
        price: { amount: baseCents, currency: 'CNY' },
        overridden: false
      })
    }
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1))
  return {
    propertyId: q.propertyId,
    roomTypeId: q.roomTypeId as ID,
    rates: out
  }
}

/** 单日 upsert：自动保证有 ratePlanId。 */
export async function upsertDailyRate(payload: DailyRateUpdate): Promise<DailyRate> {
  const ratePlanId = await ensureDefaultPlanId(payload.roomTypeId, 1)
  const body = {
    ratePlanId,
    roomTypeId: payload.roomTypeId,
    stayDate: payload.date,
    price: centsToYuan(payload.price.amount),
    currency: payload.price.currency || 'CNY',
    available: 1,
    remarks: payload.overrideReason ?? null
  }
  const saved = await http<BackendRateCalendar>('/rate-calendar', {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return calendarToDaily(saved)
}

/**
 * 单日"清除"：后端无 DELETE 端点，模拟语义为"恢复基础价"。
 * 视觉上等价于原 mock —— 日历格看到基础价，备注标记"已清除"。
 */
export async function deleteDailyRate(roomTypeId: ID, date: DateString): Promise<boolean> {
  const roomTypes = await listRoomTypes(1)
  const rt = roomTypes.find(t => String(t.id) === String(roomTypeId))
  const baseCents = rt ? yuanToCents(rt.basePrice) : 0
  await upsertDailyRate({
    date,
    roomTypeId,
    price: { amount: baseCents, currency: 'CNY' },
    overrideReason: '已清除'
  })
  return true
}

/**
 * 批量调价：后端 FIXED 模式，前端 skipOverridden 仅作为备注标记
 * （后端 FIXED 模式会覆盖所有日期，包括人工已覆盖的；如需真正跳过，
 * 需要后端补 SKIP_OVERRIDDEN 模式 —— 留给 Phase 3+）。
 */
export async function batchUpdateRates(payload: DailyRateBatchUpdate): Promise<number> {
  const ratePlanId = await ensureDefaultPlanId(payload.roomTypeId, 1)
  const body = {
    ratePlanId,
    roomTypeId: payload.roomTypeId,
    fromDate: payload.startDate,
    toDate: payload.endDate,
    mode: 'FIXED',
    value: centsToYuan(payload.price.amount),
    closeRoom: false,
    remarks: payload.skipOverridden ? 'frontend:跳过已覆盖' : 'frontend:批量覆盖'
  }
  return await http<number>('/rate-calendar/batch', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/** 清空本地 RatePlan 数据（开发自测用）。 */
export function _resetRateMock(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  localStorage.removeItem(RATE_PLAN_STORAGE_KEY)
}
