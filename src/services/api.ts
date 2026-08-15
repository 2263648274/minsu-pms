/**
 * Phase 2 API 层 —— 对接 SpringBoot 后端（http://localhost:8080/api）
 *
 * 后端统一响应：{ code, message, data }
 * request.ts 拦截器已自动解包 → 调用方拿到的就是 data
 *
 * 后端分页（MyBatis-Plus Page）→ 前端 PageResult 适配：
 *   后端: { records, total, current, size, pages }
 *   前端: { list, total, page, pageSize }
 */
import request from './request'
import type {
  LoginRequest,
  LoginResponse,
  UserListParams,
  PageResult,
  UserInfo,
  RoleListParams,
  RoleInfo,
  HeroCard,
  ContentCard,
  RoomInfo,
  RoomListParams,
  OrderInfo,
  OrderListParams,
  CustomerInfo,
  CustomerListParams,
  DashboardStats
} from '@/types'
import type { ID } from '@/types/domain/common'
import type {
  ChannelId,
  SyncLogType,
  SyncLogStatus,
  ChannelSyncLog,
  ChannelSyncLogParams
} from '@/types/domain/channel'

// 后端 MyBatis-Plus 分页结构
interface BackendPage<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages?: number
}

// 将后端分页适配为前端 PageResult
function adaptPage<T>(p: BackendPage<T>, mapper?: (item: any) => T): PageResult<T> {
  return {
    list: mapper ? (p.records || []).map(mapper) : (p.records || []) as unknown as T[],
    total: p.total ?? 0,
    page: p.current ?? 1,
    pageSize: p.size ?? 20
  }
}

// ========== 登录 / 用户 ==========

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const res = await request<any>({
    url: '/auth/login',
    method: 'post',
    data
  })
  // 后端返回扁平结构 { token, userId, username, realName, role }
  // 前端期望 { token, userInfo: {...} }
  return {
    token: res.token,
    userInfo: {
      id: res.userId,
      username: res.username,
      nickname: res.realName || res.username,
      realName: res.realName,
      role: (res.role || 'user').toLowerCase(),
      status: 1
    }
  }
}

export const getUserInfo = async (): Promise<UserInfo> => {
  const res = await request<any>({
    url: '/auth/me',
    method: 'get'
  })
  return {
    id: res.id,
    username: res.username,
    nickname: res.realName || res.username,
    realName: res.realName,
    email: res.email,
    role: (res.role || 'user').toLowerCase(),
    status: 1
  }
}

export const getUserList = async (params: UserListParams): Promise<PageResult<UserInfo>> => {
  // 后端暂无 user 列表接口，返回空分页
  return { list: [], total: 0, page: params.page || 1, pageSize: params.pageSize || 20 }
}

export const register = async (data: {
  username: string
  password: string
  nickname: string
  email?: string
  phone?: string
}): Promise<{ token: string; userInfo: UserInfo }> => {
  // 后端暂无注册接口，走登录逻辑占位
  const res = await login({ username: data.username, password: data.password })
  return res
}

// ========== 角色 ==========

export const getRoleList = async (params: RoleListParams): Promise<PageResult<RoleInfo>> => {
  void params
  return { list: [], total: 0, page: 1, pageSize: 20 }
}

export const createRole = async (data: Partial<RoleInfo>): Promise<{ id: number }> => {
  void data
  return { id: Date.now() }
}

export const updateRole = async (_id: number, _data: Partial<RoleInfo>): Promise<boolean> => {
  return true
}

export const deleteRole = async (_id: number): Promise<boolean> => {
  return true
}

// ========== 房间相关 ==========

// 后端 Room entity → 前端 RoomInfo
function mapRoom(r: any, roomType?: any): RoomInfo {
  return {
    id: r.id,
    roomNo: r.roomNo || '',
    type: mapRoomType(roomType?.name || r.roomTypeId),
    floor: r.floor ?? 1,
    capacity: Number(roomType?.maxOccupancy) || 2,
    price: Number(roomType?.basePrice) || 0,
    area: Number(roomType?.area) || 0,
    facilities: roomType?.bedType ? [roomType.bedType] : [],
    status: mapRoomStatus(r.status),
    description: r.remarks || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }
}

function mapRoomType(value: any): any {
  const name = String(value || '').toLowerCase()
  if (name.includes('单') || name.includes('single')) return 'single'
  if (name.includes('家庭') || name.includes('family')) return 'family'
  if (name.includes('套') || name.includes('suite')) return 'suite'
  if (name.includes('青旅') || name.includes('床位') || name.includes('dorm')) return 'dorm'
  return 'double'
}

function mapRoomStatus(status: string): any {
  const map: Record<string, string> = {
    'AVAILABLE': 'vacant',
    'OCCUPIED': 'occupied',
    'CLEANING': 'cleaning',
    'MAINTENANCE': 'maintenance',
    'OUT_OF_ORDER': 'out_of_order'
  }
  return map[status] || 'vacant'
}

export const getRoomList = async (params: RoomListParams): Promise<PageResult<RoomInfo>> => {
  const res = await request<BackendPage<any>>({
    url: '/rooms',
    method: 'get',
    params: {
      current: params.page || 1,
      size: params.pageSize || 20,
      keyword: params.roomNo,
      status: params.status ? unmapRoomStatus(params.status) : undefined,
      floor: params.floor,
      propertyId: params.propertyId,
      roomTypeId: params.roomTypeId
    }
  })
  const roomTypes = await getRoomTypeList()
  const byId = new Map(roomTypes.map(rt => [rt.id, rt]))
  return adaptPage(res, (room: any) => mapRoom(room, byId.get(room.roomTypeId)))
}

export const getAllRooms = async (): Promise<RoomInfo[]> => {
  const res = await request<BackendPage<any>>({
    url: '/rooms',
    method: 'get',
    params: { current: 1, size: 999 }
  })
  const roomTypes = await getRoomTypeList()
  const byId = new Map(roomTypes.map(rt => [rt.id, rt]))
  return (res.records || []).map((room: any) => mapRoom(room, byId.get(room.roomTypeId)))
}

export const createRoom = async (data: Partial<RoomInfo>): Promise<{ id: number }> => {
  const res = await request<any>({
    url: '/rooms',
    method: 'post',
    data: {
      propertyId: (data as any).propertyId || 1,
      roomTypeId: (data as any).roomTypeId || 1,
      roomNo: data.roomNo,
      floor: data.floor || 1,
      status: 'AVAILABLE',
      remarks: data.description
    }
  })
  return { id: res.id }
}

export const updateRoom = async (id: number, data: Partial<RoomInfo>): Promise<boolean> => {
  await request({
    url: `/rooms/${id}`,
    method: 'put',
    data: {
      roomNo: data.roomNo,
      floor: data.floor,
      status: unmapRoomStatus(data.status),
      remarks: data.description
    }
  })
  return true
}

function unmapRoomStatus(status?: string): string {
  const map: Record<string, string> = {
    'vacant': 'AVAILABLE',
    'occupied': 'OCCUPIED',
    'cleaning': 'CLEANING',
    'maintenance': 'MAINTENANCE',
    'out_of_order': 'OUT_OF_ORDER'
  }
  return map[status || ''] || 'AVAILABLE'
}

export const deleteRoom = async (id: number): Promise<boolean> => {
  await request({ url: `/rooms/${id}`, method: 'delete' })
  return true
}

// ========== 订单相关 ==========

function mapOrder(o: any): OrderInfo {
  return {
    id: o.id,
    orderNo: o.bookingNo,
    customerId: o.customerId,
    customerName: o.guestName || '',
    customerPhone: o.guestPhone || '',
    roomId: o.roomTypeId,
    roomNo: '',
    roomType: 'double',
    checkInDate: o.checkInDate,
    checkOutDate: o.checkOutDate,
    nights: o.nights || 1,
    guests: o.guests || 1,
    totalAmount: Number(o.totalAmount) || 0,
    status: mapOrderStatus(o.status),
    remark: o.specialRequests,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  } as OrderInfo
}

function mapOrderStatus(status: string): any {
  const map: Record<string, string> = {
    'PENDING': 'pending',
    'CONFIRMED': 'confirmed',
    'CHECKED_IN': 'checked_in',
    'CHECKED_OUT': 'checked_out',
    'CANCELLED': 'cancelled'
  }
  return map[status] || 'pending'
}

function unmapOrderStatus(status: string): string {
  const map: Record<string, string> = {
    'pending': 'PENDING',
    'confirmed': 'CONFIRMED',
    'checked_in': 'CHECKED_IN',
    'checked_out': 'CHECKED_OUT',
    'cancelled': 'CANCELLED'
  }
  return map[status] || 'PENDING'
}

export const getOrderList = async (params: OrderListParams): Promise<PageResult<OrderInfo>> => {
  const res = await request<BackendPage<any>>({
    url: '/bookings',
    method: 'get',
    params: {
      current: params.page || 1,
      size: params.pageSize || 20,
      status: params.status ? unmapOrderStatus(params.status) : undefined,
      keyword: params.orderNo || params.customerName
    }
  })
  return adaptPage(res, mapOrder)
}

export const getAllOrders = async (): Promise<OrderInfo[]> => {
  const res = await request<BackendPage<any>>({
    url: '/bookings',
    method: 'get',
    params: { current: 1, size: 999 }
  })
  return (res.records || []).map(mapOrder)
}

export const createOrder = async (data: Partial<OrderInfo>): Promise<{ id: number }> => {
  const res = await request<any>({
    url: '/bookings',
    method: 'post',
    data: {
      propertyId: (data as any).propertyId || 1,
      roomTypeId: (data as any).roomId || (data as any).roomTypeId || 1,
      customerId: data.customerId,
      guestName: data.customerName,
      guestPhone: data.customerPhone,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights: data.nights || 1,
      guests: data.guests || 1,
      rooms: 1,
      totalAmount: data.totalAmount,
      specialRequests: data.remark,
      source: 'DIRECT'
    }
  })
  return { id: res.id }
}

export const updateOrder = async (id: number, data: Partial<OrderInfo>): Promise<boolean> => {
  await request({
    url: `/bookings/${id}`,
    method: 'put',
    data: {
      guestName: data.customerName,
      guestPhone: data.customerPhone,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights: data.nights,
      guests: data.guests,
      totalAmount: data.totalAmount,
      specialRequests: data.remark
    }
  })
  return true
}

export const deleteOrder = async (id: number): Promise<boolean> => {
  await request({ url: `/bookings/${id}`, method: 'delete' })
  return true
}

export const checkInOrder = async (id: number): Promise<boolean> => {
  // 状态机：confirm → check-in
  try {
    await request({ url: `/bookings/${id}/confirm`, method: 'post' })
  } catch (_) { /* 可能已经确认过，忽略 */
  }
  await request({ url: `/bookings/${id}/check-in`, method: 'post' })
  return true
}

export const checkOutOrder = async (id: number): Promise<boolean> => {
  await request({ url: `/bookings/${id}/check-out`, method: 'post' })
  return true
}

export const cancelOrder = async (id: number, reason?: string): Promise<any> => {
  // 后端逻辑：状态校验（已入住/已退房不可取消）→ 置 CANCELLED；
  // 已支付金额 > 0 时自动标记 REFUNDED。返回更新后的 Booking。
  const res = await request<any>({
    url: `/bookings/${id}/cancel`,
    method: 'post',
    data: reason ? { reason } : undefined
  })
  return res
}

// ========== 客户相关 ==========

function mapCustomer(c: any): CustomerInfo {
  return {
    id: c.id,
    name: c.name || '',
    phone: c.phone || '',
    email: c.email || '',
    idCard: c.idCard || '',
    gender: c.gender === 'F' ? 'female' : c.gender === 'M' ? 'male' : 'other',
    birthday: c.birthday,
    vipLevel: (c.vipLevel || 0) as 0 | 1 | 2 | 3,
    totalOrders: 0,
    totalSpend: 0,
    remark: c.remarks || '',
    blacklisted: c.blacklist === 1,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  } as CustomerInfo
}

export const getCustomerList = async (params: CustomerListParams): Promise<PageResult<CustomerInfo>> => {
  const res = await request<BackendPage<any>>({
    url: '/customers',
    method: 'get',
    params: {
      current: params.page || 1,
      size: params.pageSize || 20,
      keyword: params.name || params.phone
    }
  })
  return adaptPage(res, mapCustomer)
}

export const getAllCustomers = async (): Promise<CustomerInfo[]> => {
  const res = await request<BackendPage<any>>({
    url: '/customers',
    method: 'get',
    params: { current: 1, size: 999 }
  })
  return (res.records || []).map(mapCustomer)
}

export const createCustomer = async (data: Partial<CustomerInfo>): Promise<{ id: number }> => {
  const res = await request<any>({
    url: '/customers',
    method: 'post',
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      idCard: data.idCard,
      gender: data.gender === 'female' ? 'F' : data.gender === 'male' ? 'M' : 'O',
      birthday: data.birthday,
      vipLevel: data.vipLevel || 0,
      blacklist: data.blacklisted ? 1 : 0,
      remarks: data.remark
    }
  })
  return { id: res.id }
}

export const updateCustomer = async (id: number, data: Partial<CustomerInfo>): Promise<boolean> => {
  await request({
    url: `/customers/${id}`,
    method: 'put',
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email,
      idCard: data.idCard,
      gender: data.gender === 'female' ? 'F' : data.gender === 'male' ? 'M' : 'O',
      vipLevel: data.vipLevel,
      blacklist: data.blacklisted ? 1 : 0,
      remarks: data.remark
    }
  })
  return true
}

export const deleteCustomer = async (id: number): Promise<boolean> => {
  await request({ url: `/customers/${id}`, method: 'delete' })
  return true
}

/**
 * 客人详情 + 消费聚合。
 * 后端 GET /api/customers/{id} 返回 { customer, history[], totalStays, totalSpent }，
 * history 为该客人的订单列表（Booking）。
 */
export const getCustomerDetail = async (id: number): Promise<{
  customer: CustomerInfo
  history: any[]
  totalStays: number
  totalSpent: number
}> => {
  const res = await request<any>({
    url: `/customers/${id}`,
    method: 'get'
  })
  return {
    customer: mapCustomer(res.customer || {}),
    history: res.history || [],
    totalStays: res.totalStays || 0,
    totalSpent: Number(res.totalSpent || 0)
  }
}

// ========== 仪表盘统计 ==========

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await request<any>({
    url: '/dashboard/overview',
    method: 'get'
  })
  // 后端返回: { todayCheckIn, todayCheckOut, todayRevenue, pendingCount,
  //            totalProperties, totalCustomers, occupancyRate, totalRooms,
  //            soldRooms, blockedRooms }
  return {
    totalRooms: res.totalRooms ?? 0,
    vacantRooms: Math.max((res.totalRooms ?? 0) - (res.soldRooms ?? 0) - (res.blockedRooms ?? 0), 0),
    occupiedRooms: res.soldRooms ?? 0,
    cleaningRooms: 0,
    maintenanceRooms: res.blockedRooms ?? 0,
    occupancyRate: res.occupancyRate ?? 0,
    totalOrders: res.todayArrivals ?? 0,
    pendingOrders: res.pendingCount ?? 0,
    checkedInOrders: res.todayCheckIn ?? 0,
    todayCheckIns: res.todayCheckIn ?? 0,
    todayCheckOuts: res.todayCheckOut ?? 0,
    todayRevenue: Number(res.todayRevenue) || 0,
    monthRevenue: Number(res.todayRevenue) || 0,
    totalRevenue: Number(res.todayRevenue) || 0,
    totalCustomers: res.totalCustomers ?? 0,
    newCustomersThisMonth: 0
  }
}

// ========== 兼容旧 Profile.vue 调用的 stub ==========
export const createUser = async (data: Partial<UserInfo>): Promise<{ id: number }> => {
  void data
  return { id: Date.now() }
}

export const updateUser = async (_id: number, _data: Partial<UserInfo>): Promise<boolean> => {
  return true
}

export const deleteUser = async (_id: number): Promise<boolean> => {
  return true
}

// ========== 用户端内容 API ==========

export const getHeroCards = async (): Promise<HeroCard[]> => {
  return []
}

export const getContentCards = async (): Promise<ContentCard[]> => {
  return []
}

// ========== 房型（Property / RoomType / Room） ==========

/** 房型（从后端 RoomType 适配） */
export interface RoomTypeInfo {
  id: number
  propertyId: number
  name: string
  code: string
  basePrice: number
  maxOccupancy: number
  area: number
  bedType: string
  description: string
  status: number
}

/** 物业（精简字段，前端展示用） */
export interface PropertyBrief {
  id: number
  name: string
  city?: string
  address?: string
}

/** 获取所有房型（不分页，后端列表简单） */
export const getRoomTypeList = async (): Promise<RoomTypeInfo[]> => {
  const res = await request<BackendPage<any>>({
    url: '/room-types',
    method: 'get',
    params: { current: 1, size: 100 }
  })
  return (res.records || []).map((r: any) => ({
    id: r.id,
    propertyId: r.propertyId,
    name: r.name,
    code: r.code,
    basePrice: Number(r.basePrice) || 0,
    maxOccupancy: r.maxOccupancy || 2,
    area: Number(r.area) || 0,
    bedType: r.bedType || '',
    description: r.description || '',
    status: r.status ?? 1
  }))
}

/** 获取所有物业 */
export const getPropertyList = async (): Promise<PropertyBrief[]> => {
  const res = await request<BackendPage<any>>({
    url: '/properties',
    method: 'get',
    params: { current: 1, size: 100 }
  })
  return (res.records || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    city: p.city,
    address: p.address
  }))
}

// ========== 库存房态 ==========

/** 库存单日记录（房型级） */
export interface InventoryDay {
  id?: number
  roomTypeId: number
  stayDate: string
  totalRooms: number
  soldRooms: number
  blockedRooms: number
  status: 'OPEN' | 'CLOSED' | 'MAINTENANCE'
  remarks?: string
}

/** 查询某房型某段时间的房态 */
export const queryInventory = async (
  roomTypeId: number,
  from: string,
  to: string
): Promise<InventoryDay[]> => {
  const res = await request<InventoryDay[]>({
    url: '/inventory',
    method: 'get',
    params: { roomTypeId, from, to }
  })
  return res || []
}

/** upsert 单日房态 */
export const upsertInventory = async (data: InventoryDay): Promise<InventoryDay> => {
  const res = await request<InventoryDay>({
    url: '/inventory',
    method: 'put',
    data
  })
  return res
}

/** 切换关房/开房 */
export const toggleCloseRoom = async (
  roomTypeId: number,
  date: string,
  close: boolean
): Promise<void> => {
  await request({
    url: `/inventory/${roomTypeId}/${date}/close`,
    method: 'patch',
    params: { close }
  })
}

// ========== 房价日历 ==========

/** 房价日历单日记录 */
export interface RateCalendarDay {
  id?: number
  roomTypeId: number
  ratePlanId?: number
  stayDate: string
  price: number
  currency?: string
  overridden?: boolean
  overrideReason?: string
}

/** 查询某房型某段时间的房价日历 */
export const queryRateCalendar = async (
  roomTypeId: number,
  from: string,
  to: string,
  ratePlanId?: number
): Promise<RateCalendarDay[]> => {
  const res = await request<RateCalendarDay[]>({
    url: '/rate-calendar',
    method: 'get',
    params: { roomTypeId, from, to, ratePlanId }
  })
  return res || []
}

/** 更新单日房价 */
export const upsertRate = async (data: {
  roomTypeId: number
  ratePlanId?: number
  stayDate: string
  price: number
  overrideReason?: string
}): Promise<RateCalendarDay> => {
  const res = await request<RateCalendarDay>({
    url: '/rate-calendar',
    method: 'post',
    data
  })
  return res
}

/** 批量更新房价 */
export const batchUpsertRate = async (data: {
  roomTypeId: number
  ratePlanId?: number
  startDate: string
  endDate: string
  price: number
  weekdays?: number[]
}): Promise<{ count: number }> => {
  const res = await request<number>({
    url: '/rate-calendar/batch',
    method: 'post',
    data
  })
  return { count: res || 0 }
}

// ========== 物业（Property） — Phase 2 ==========

/** 物业精简视图（前端展示用） */
export interface PropertyView {
  id: number
  name: string
  code: string
  type: string
  status: string
  city: string
  address: string
  phone?: string
  email?: string
  checkInTime?: string
  checkOutTime?: string
  description?: string
}

/** 物业分页查询 */
export const getPropertyPage = async (params: {
  current?: number
  size?: number
  keyword?: string
}): Promise<PageResult<PropertyView>> => {
  const res = await request<BackendPage<any>>({
    url: '/properties',
    method: 'get',
    params: {
      current: params.current || 1,
      size: params.size || 20,
      keyword: params.keyword
    }
  })
  return adaptPage(res, (p: any) => ({
    id: p.id,
    name: p.name || '',
    code: p.code || '',
    type: p.type || 'minsu',
    status: p.status || 'active',
    city: p.city || '',
    address: p.address || '',
    phone: p.phone,
    email: p.email,
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    description: p.description
  }))
}

/** 物业全量列表（下拉用） */
export const getPropertyAll = async (): Promise<PropertyView[]> => {
  const res = await request<PropertyView[]>({
    url: '/properties/all',
    method: 'get'
  })
  return res || []
}

/** 物业详情 */
export const getPropertyDetail = async (id: number): Promise<PropertyView> => {
  return await request<PropertyView>({
    url: `/properties/${id}`,
    method: 'get'
  })
}

/** 创建物业 */
export const createProperty = async (data: Partial<PropertyView>): Promise<{ id: number }> => {
  const res = await request<any>({
    url: '/properties',
    method: 'post',
    data
  })
  return { id: res.id }
}

/** 更新物业 */
export const updateProperty = async (id: number, data: Partial<PropertyView>): Promise<boolean> => {
  await request({
    url: `/properties/${id}`,
    method: 'put',
    data
  })
  return true
}

/** 删除物业 */
export const deleteProperty = async (id: number): Promise<boolean> => {
  await request({ url: `/properties/${id}`, method: 'delete' })
  return true
}

// ========== OTA 渠道（Channel） — Phase 2 ==========

/** 渠道后端视图 */
export interface ChannelView {
  id: number
  code: string
  name: string
  enabled: number
  lastStatus: string
  lastError?: string
  lastSyncAt?: string
  credentials?: Record<string, string>
}

/** 渠道全量列表 */
export const getChannelList = async (): Promise<ChannelView[]> => {
  const res = await request<ChannelView[]>({
    url: '/channels',
    method: 'get'
  })
  return res || []
}

/** 渠道详情 */
export const getChannelDetail = async (id: number): Promise<ChannelView> => {
  return await request<ChannelView>({
    url: `/channels/${id}`,
    method: 'get'
  })
}

/** 创建渠道 */
export const createChannel = async (data: Partial<ChannelView>): Promise<{ id: number }> => {
  const res = await request<any>({
    url: '/channels',
    method: 'post',
    data
  })
  return { id: res.id }
}

/** 更新渠道 */
export const updateChannel = async (id: number, data: Partial<ChannelView>): Promise<boolean> => {
  await request({
    url: `/channels/${id}`,
    method: 'put',
    data
  })
  return true
}

/** 删除渠道 */
export const deleteChannel = async (id: number): Promise<boolean> => {
  await request({ url: `/channels/${id}`, method: 'delete' })
  return true
}

/** 渠道连接检测（ping） */
export const pingChannel = async (id: number): Promise<{
  channelId: number
  code: string
  name: string
  status: string
  durationMs: number
  checkedAt: string
  error?: string
}> => {
  return await request<any>({
    url: `/channels/${id}/ping`,
    method: 'post'
  })
}

// ========== OTA 同步日志（SyncLog） — Phase 2 接 OtaSyncLogController ==========
// 后端表 ota_sync_log：channelId(Long) / operation(VARCHAR) / status(VARCHAR) / request(TEXT) /
//   response(TEXT) / errorMsg / durationMs / occurredAt
// 前端 ChannelSyncLog：channelId(ChannelId 字符串枚举) / type / status / request/response 对象 / trigger / createdAt

/**
 * 渠道名 ↔ Long ID 映射（与 V900__seed_data.sql 对齐：
 *   1=CTRIP 2=MEITUAN 3=FLIGGY 4=BOOKING 5=AIRBNB；前端 ChannelId 只有 ctrip/meituan/fliggy/douyin/taobao，
 *   其中 douyin/taobao 在 DB 里暂对应 4/5，Phase 4 真接入时按 channel.code 重新对齐）
 */
const CHANNEL_NAME_TO_ID: Record<ChannelId, number> = {
  ctrip: 1,
  meituan: 2,
  fliggy: 3,
  douyin: 4,
  taobao: 5
}

const CHANNEL_ID_TO_NAME: Record<number, ChannelId> = {
  1: 'ctrip',
  2: 'meituan',
  3: 'fliggy',
  4: 'douyin',
  5: 'taobao'
}

/** 前端 SyncLogType ↔ 后端 operation */
const OPERATION_TO_BACKEND: Record<SyncLogType, string> = {
  inventory_push: 'PUSH_AVAIL',
  rate_push: 'PUSH_RATE',
  order_pull: 'FETCH_BOOKING',
  order_confirm: 'PUSH_BOOKING',
  order_cancel: 'PUSH_BOOKING'
}

const OPERATION_FROM_BACKEND: Record<string, SyncLogType> = {
  PUSH_AVAIL: 'inventory_push',
  PUSH_RATE: 'rate_push',
  FETCH_BOOKING: 'order_pull',
  PUSH_BOOKING: 'order_confirm'
}

/** 前端 SyncLogStatus ↔ 后端 OK/ERROR/SKIP */
const STATUS_TO_BACKEND: Record<SyncLogStatus, string> = {
  success: 'OK',
  failed: 'ERROR',
  partial: 'SKIP',
  pending: 'SKIP',
  running: 'SKIP'
}

const STATUS_FROM_BACKEND: Record<string, SyncLogStatus> = {
  OK: 'success',
  ERROR: 'failed',
  SKIP: 'partial'
}

function parseJsonField<T = Record<string, unknown>>(raw?: string | null): T | undefined {
  if (!raw) return undefined
  try { return JSON.parse(raw) as T } catch { return undefined }
}

function stringifyJsonField(value?: Record<string, unknown>): string | undefined {
  if (value === undefined || value === null) return undefined
  try { return JSON.stringify(value) } catch { return undefined }
}

/** 后端 OtaSyncLog → 前端 ChannelSyncLog */
function mapSyncLog(raw: any): ChannelSyncLog {
  return {
    id: raw.id,
    channelId: CHANNEL_ID_TO_NAME[raw.channelId] || ('unknown' as ChannelId),
    type: OPERATION_FROM_BACKEND[raw.operation] || 'inventory_push',
    status: STATUS_FROM_BACKEND[raw.status] || 'success',
    request: parseJsonField(raw.request),
    response: parseJsonField(raw.response),
    errorMessage: raw.errorMsg || undefined,
    durationMs: raw.durationMs ?? undefined,
    trigger: 'auto', // DB schema 无 trigger 字段，前端展示兜底为 'auto'（trigger 仅前端筛选用）
    createdAt: raw.occurredAt
  }
}

/** 分页查询同步日志 */
export const listSyncLogs = async (params: ChannelSyncLogParams): Promise<PageResult<ChannelSyncLog>> => {
  const res = await request<BackendPage<any>>({
    url: '/sync-logs',
    method: 'get',
    params: {
      channelId: params.channelId ? CHANNEL_NAME_TO_ID[params.channelId] : undefined,
      operation: params.type ? OPERATION_TO_BACKEND[params.type] : undefined,
      status: params.status ? STATUS_TO_BACKEND[params.status] : undefined,
      from: params.startDate,
      to: params.endDate,
      current: params.page || 1,
      size: params.pageSize || 20
    }
  })
  const records = res.records || []
  return {
    list: records.map(mapSyncLog),
    total: Number(res.total || 0),
    page: Number(res.current || 1),
    pageSize: Number(res.size || 20)
  }
}

/** 同步日志详情 */
export const getSyncLog = async (id: ID): Promise<ChannelSyncLog> => {
  const res = await request<any>({ url: `/sync-logs/${id}`, method: 'get' })
  return mapSyncLog(res)
}

/** 新增同步日志（手动推送 / OTA 适配器回调 / 调试） */
export const createSyncLog = async (log: Partial<ChannelSyncLog>): Promise<ChannelSyncLog> => {
  const channelId = log.channelId ? CHANNEL_NAME_TO_ID[log.channelId] : 1
  const operation = log.type ? OPERATION_TO_BACKEND[log.type] : 'PUSH_AVAIL'
  const status = log.status ? STATUS_TO_BACKEND[log.status] : 'OK'
  const res = await request<any>({
    url: '/sync-logs',
    method: 'post',
    data: {
      channelId,
      operation,
      status,
      request: stringifyJsonField(log.request),
      response: stringifyJsonField(log.response),
      errorMsg: log.errorMessage
    }
  })
  return mapSyncLog(res)
}

/** 同步日志聚合统计 */
export interface SyncLogStats {
  total: number
  success: number
  error: number
  skip: number
  successRate: number
  avgDurationMs: number
}

export const getSyncLogStats = async (params: {
  channelId?: ChannelId
  startDate?: string
  endDate?: string
}): Promise<SyncLogStats> => {
  return await request<any>({
    url: '/sync-logs/stats',
    method: 'get',
    params: {
      channelId: params.channelId ? CHANNEL_NAME_TO_ID[params.channelId] : undefined,
      from: params.startDate,
      to: params.endDate
    }
  })
}
