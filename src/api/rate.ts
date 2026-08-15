/**
 * 房价管理 - API 客户端
 *
 * Phase 2.5（本 commit）：
 * - listRoomTypes / queryRateCalendar / upsertDailyRate / deleteDailyRate(恢复基础价) /
 *   batchUpdateRates 已切到真实后端（http://localhost:8090/api/*，由 Vite 代理）
 * - RatePlan 列表与 CRUD 已接真实后端；前端字段通过 adapter 映射到后端模型
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

// 从 localStorage 读 JWT（与 services/request.ts 的 axios 拦截器保持一致；
// 后端 /api/* 全部要求 Bearer token，缺这个头会 401）
function getAuthToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  // 登录页实际写入的是 userStore 使用的 accessToken；兼容旧 token 键。
  return localStorage.getItem('accessToken') || localStorage.getItem('token')
}

// eslint-disable-next-line no-undef
async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined ?? {})
  }
  // 自动注入 Authorization（与 services/request.ts axios 拦截器行为对齐）
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    // 401 与后端 axios 拦截器保持一致：清掉 token + 跳登录
    if (res.status === 401) {
      try { localStorage.removeItem('token') } catch {}
      if (typeof window !== 'undefined') window.location.href = '/admin/login'
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  const body = (await res.json()) as ApiEnvelope<T>
  // Spring Boot Result 使用 code=200 表示成功；兼容旧 mock/API 的 code=0。
  if (body && typeof body === 'object' && 'code' in body && body.code !== 200 && body.code !== 0) {
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

// ========== 后端 RatePlan 字段映射 ==========

interface BackendRatePlan {
  id: number
  propertyId: number
  roomTypeId: number
  name: string
  code: string
  basePrice: number | string
  currency: string
  mealPlan: string
  minNights: number
  maxNights: number
  description: string
  active: number
  createdAt: string
  updatedAt: string
}

/**
 * 将后端 RatePlan 映射为前端 RatePlan。
 * 后端字段（basePrice/active）与前端（price{amount,currency}/status）不统一，
 * 在此做单位转换与字段对齐；后端无 strategy/scope，scope 固定为 { roomTypeIds }。
 */
function toFrontendRatePlan(r: BackendRatePlan): RatePlan {
  const Yuan = Number(r.basePrice)
  return {
    id: r.id,
    propertyId: r.propertyId,
    name: r.name,
    strategy: 'base',               // 后端无此字段，默认基础价
    scope: { roomTypeIds: [r.roomTypeId] }, // 后端无此字段，从 roomTypeId 反推
    pricingUnit: 'per_night',       // 后端无此字段，默认每晚
    price: {
      amount: yuanToCents(Yuan),   // 后端 BigDecimal 元 → 前端 cents
      currency: (r.currency || 'CNY') as RatePlan['price']['currency']
    },
    priority: 0,
    status: r.active === 1 ? 1 : 0, // active(Integer) → status
    description: r.description,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }
}

/**
 * 拿该房型一个 RatePlan id（用于日历 upsert/batch 必填字段）。
 * 从后端拿第一个 plan，若无则自动创建一个默认 plan。
 */
async function ensureDefaultPlanId(roomTypeId: ID, propertyId: ID): Promise<ID> {
  try {
    const list = await http<BackendRatePlan[]>(`/rate-plans/by-room-type/${roomTypeId}`)
    if (list.length > 0) return list[0].id
  } catch {
    // 后端无数据时走下面创建逻辑
  }
  // 后端没有则创建一个默认基础价 plan
  const Yuan = 888
  const payload = {
    propertyId: Number(propertyId),
    roomTypeId: Number(roomTypeId),
    name: '默认基础价',
    code: `BASE_${roomTypeId}`,
    basePrice: Yuan,
    currency: 'CNY',
    mealPlan: '',
    minNights: 1,
    maxNights: 99,
    description: '系统自动创建',
    active: 1
  }
  const created = await http<BackendRatePlan>('/rate-plans', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return created.id
}

// ========== RatePlan CRUD（已切真后端） ==========

export async function listRatePlans(params?: {
  propertyId?: ID
  roomTypeId?: ID
  strategy?: RatePlan['strategy']
  status?: 0 | 1
  keyword?: string
}): Promise<RatePlan[]> {
  // 后端不支持 strategy/status/keyword 过滤，前端仅用 roomTypeId 精确筛选
  if (params?.roomTypeId !== undefined) {
    const page = await http<{ records: BackendRatePlan[] }>(
      `/rate-plans?current=1&size=200&roomTypeId=${params.roomTypeId}`
    )
    return (page.records ?? []).map(toFrontendRatePlan)
  }
  if (params?.propertyId !== undefined) {
    // 后端无按 propertyId 查列表的分页口，先用分页接口拉全量再过滤 roomTypeId（临时方案）
    const page = await http<{ records: BackendRatePlan[] }>(`/rate-plans?current=1&size=200&propertyId=${params.propertyId}`)
    return page.records
      .filter(r => params.status === undefined || (r.active === 1) === (params.status === 1))
      .map(toFrontendRatePlan)
  }
  const page = await http<{ records: BackendRatePlan[] }>('/rate-plans?current=1&size=200')
  return page.records.map(toFrontendRatePlan)
}

export async function listRatePlansByRoomType(roomTypeId: ID): Promise<RatePlan[]> {
  // 不用 /by-room-type：该后端快捷接口额外过滤 active=1，Navicat 中 active 为 0/NULL 的记录会被吞掉。
  // 分页接口按 roomTypeId 查全量，确保数据库已有计划都能展示，并保留 active 状态。
  const page = await http<{ records: BackendRatePlan[] }>(
    `/rate-plans?current=1&size=200&roomTypeId=${roomTypeId}`
  )
  return (page.records ?? []).map(toFrontendRatePlan)
}

export async function getRatePlan(id: ID): Promise<RatePlan | undefined> {
  try {
    const r = await http<BackendRatePlan>(`/rate-plans/${id}`)
    return toFrontendRatePlan(r)
  } catch {
    return undefined
  }
}

export async function createRatePlan(payload: Partial<RatePlan>): Promise<RatePlan> {
  const scope = payload.scope
  const roomTypeId = (Array.isArray(scope) && 'roomTypeIds' in scope)
    ? scope.roomTypeIds[0]
    : (payload as any).roomTypeId ?? 1
  const Yuan = payload.price ? Number(payload.price.amount) / 100 : 888
  const body = {
    propertyId: Number(payload.propertyId ?? 1),
    roomTypeId: Number(roomTypeId),
    name: payload.name ?? '新建房价计划',
    code: `PLAN_${Date.now()}`,
    basePrice: Yuan,
    currency: payload.price?.currency ?? 'CNY',
    mealPlan: '',
    minNights: payload.minNights ?? 1,
    maxNights: payload.maxNights ?? 99,
    description: payload.description ?? '',
    active: payload.status === 0 ? 0 : 1
  }
  const created = await http<BackendRatePlan>('/rate-plans', {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return toFrontendRatePlan(created)
}

export async function updateRatePlan(id: ID, payload: Partial<RatePlan>): Promise<RatePlan | undefined> {
  const scope = payload.scope
  const roomTypeId = (Array.isArray(scope) && 'roomTypeIds' in scope)
    ? scope.roomTypeIds[0]
    : (payload as any).roomTypeId
  const Yuan = payload.price ? Number(payload.price.amount) / 100 : undefined
  const body: Record<string, unknown> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (Yuan !== undefined) body.basePrice = Yuan
  if (payload.price?.currency !== undefined) body.currency = payload.price.currency
  if (payload.description !== undefined) body.description = payload.description
  if (payload.status !== undefined) body.active = payload.status === 1 ? 1 : 0
  if (payload.minNights !== undefined) body.minNights = payload.minNights
  if (payload.maxNights !== undefined) body.maxNights = payload.maxNights
  if (roomTypeId !== undefined) body.roomTypeId = Number(roomTypeId)
  try {
    const updated = await http<BackendRatePlan>(`/rate-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
    return toFrontendRatePlan(updated)
  } catch {
    return undefined
  }
}

export async function deleteRatePlan(id: ID): Promise<boolean> {
  try {
    await http<void>(`/rate-plans/${id}`, { method: 'DELETE' })
    return true
  } catch {
    return false
  }
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

// _resetRateMock 已移除（RatePlan 不再走 localStorage）
