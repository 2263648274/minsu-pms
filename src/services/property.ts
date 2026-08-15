/**
 * 房源 Service
 * 物业、房型、房间、房价日历、库存日历的统一入口。
 *
 * Phase 2 范围：
 * - 物业查询（CRUD 在 Phase 3 接入）
 * - 房型查询
 * - 房间列表/状态切换（domain 版本）
 * - 房价计划列表 + 房价日历
 * - 库存日历查询
 */
import {
  getRoomList as _getRoomList,
  getAllRooms as _getAllRooms,
  createRoom as _createRoom,
  updateRoom as _updateRoom,
  deleteRoom as _deleteRoom
} from './api'
import type {
  RoomInfo,
  RoomListParams,
  PageResult
} from '@/types'
import type {
  Property,
  RoomType,
  Room,
  RoomListParams as DomainRoomListParams,
  RoomStatus
} from '@/types/domain/property'
import type {
  RatePlan,
  RateCalendar,
  RateCalendarQuery
} from '@/types/domain/rate'
import type {
  InventoryCalendar,
  InventoryCalendarQuery
} from '@/types/domain/inventory'
import type { ID } from '@/types/domain/common'
import request from './request'
import {
  listRatePlans as listBackendRatePlans,
  queryRateCalendar as queryBackendRateCalendar
} from '@/api/rate'

interface BackendPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

function toMoney(amount: unknown) {
  return { amount: Math.round(Number(amount) * 100) || 0, currency: 'CNY' as const }
}

function mapProperty(p: any): Property {
  return {
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
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  }
}

function mapRoomType(rt: any): RoomType {
  return {
    id: rt.id,
    propertyId: rt.propertyId,
    name: rt.name || '',
    category: 'double',
    area: Number(rt.area) || 0,
    capacity: Number(rt.maxOccupancy) || 2,
    beds: [],
    floors: [],
    totalRooms: 0,
    amenities: [],
    basePrice: toMoney(rt.basePrice),
    description: rt.description,
    createdAt: rt.createdAt,
    updatedAt: rt.updatedAt
  }
}

function mapDomainRoom(room: any, roomType?: any): Room {
  const statusMap: Record<string, RoomStatus> = {
    AVAILABLE: 'vacant',
    OCCUPIED: 'occupied',
    CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance',
    OUT_OF_ORDER: 'out_of_order'
  }
  return {
    id: room.id,
    propertyId: room.propertyId,
    roomTypeId: room.roomTypeId,
    roomNo: room.roomNo || '',
    floor: room.floor ?? 1,
    capacity: Number(roomType?.maxOccupancy) || 2,
    status: statusMap[room.status] || 'vacant',
    forSale: room.status !== 'OUT_OF_ORDER',
    description: room.remarks || '',
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  }
}

function toBackendRoomStatus(status: RoomStatus): string {
  return {
    vacant: 'AVAILABLE',
    occupied: 'OCCUPIED',
    cleaning: 'CLEANING',
    maintenance: 'MAINTENANCE',
    out_of_order: 'OUT_OF_ORDER'
  }[status]
}

export const propertyService = {
  // ========== 旧 API 兼容（保留给 admin/RoomManage.vue） ==========

  /** 房间分页列表（旧 RoomInfo） */
  listRooms(params: RoomListParams): Promise<PageResult<RoomInfo>> {
    return _getRoomList(params)
  },

  /** 房间全量列表（下拉框用） */
  listAllRooms(): Promise<RoomInfo[]> {
    return _getAllRooms()
  },

  createRoom(data: Partial<RoomInfo>): Promise<{ id: number }> {
    return _createRoom(data)
  },

  updateRoom(id: number, data: Partial<RoomInfo>): Promise<boolean> {
    return _updateRoom(id, data)
  },

  deleteRoom(id: number): Promise<boolean> {
    return _deleteRoom(id)
  },

  // ========== 物业 ==========

  listProperties(): Promise<Property[]> {
    return request<BackendPage<any>>({
      url: '/properties', method: 'get',
      params: { current: 1, size: 100 }
    }).then(res => (res.records || []).map(mapProperty))
  },

  getProperty(id: ID): Promise<Property | undefined> {
    return request<any>({ url: `/properties/${id}`, method: 'get' })
      .then(mapProperty)
      .catch(() => undefined)
  },

  // ========== 房型 ==========

  listRoomTypes(propertyId?: ID): Promise<RoomType[]> {
    return request<BackendPage<any>>({
      url: '/room-types', method: 'get',
      params: { current: 1, size: 100, propertyId }
    }).then(res => (res.records || []).map(mapRoomType))
  },

  // ========== 房间（domain 版本，供 Phase 2 页面使用） ==========

  listDomainRooms(params: DomainRoomListParams = {}): Promise<PageResult<Room>> {
    return request<BackendPage<any>>({
      url: '/rooms', method: 'get',
      params: {
        current: params.page || 1,
        size: params.pageSize || 20,
        propertyId: params.propertyId,
        roomTypeId: params.roomTypeId,
        keyword: params.roomNo,
        floor: params.floor,
        status: params.status ? toBackendRoomStatus(params.status) : undefined
      }
    }).then(async res => {
      const roomTypes = await this.listRoomTypes(params.propertyId)
      const byId = new Map(roomTypes.map(rt => [rt.id, rt]))
      return {
        list: (res.records || []).map((room: any) => mapDomainRoom(room, byId.get(room.roomTypeId))),
        total: res.total || 0,
        page: res.current || 1,
        pageSize: res.size || 20
      }
    })
  },

  /** 更新房间状态（vacant/occupied/cleaning/maintenance/out_of_order） */
  updateRoomStatus(id: ID, status: RoomStatus): Promise<Room | undefined> {
    return request<any>({
      url: `/rooms/${id}`, method: 'put',
      data: { status: toBackendRoomStatus(status) }
    }).then(mapDomainRoom).catch(() => undefined)
  },

  // ========== 房价 ==========

  listRatePlans(propertyId?: ID): Promise<RatePlan[]> {
    return listBackendRatePlans(propertyId === undefined ? undefined : { propertyId })
  },

  getRateCalendar(query: RateCalendarQuery): Promise<RateCalendar> {
    return queryBackendRateCalendar(query)
  },

  // ========== 库存 ==========

  async getInventoryCalendar(query: InventoryCalendarQuery): Promise<InventoryCalendar> {
    const roomTypes = await this.listRoomTypes(query.propertyId)
    const targetTypes = query.roomTypeId
      ? roomTypes.filter(rt => rt.id === query.roomTypeId)
      : roomTypes
    const roomTypeNights = (await Promise.all(targetTypes.map(async rt => {
      const rows = await request<any[]>({
        url: '/inventory', method: 'get',
        params: { roomTypeId: rt.id, from: query.startDate, to: query.endDate }
      })
      return (rows || []).map(row => ({
        roomTypeId: rt.id,
        date: row.stayDate,
        total: row.totalRooms || 0,
        available: Math.max((row.totalRooms || 0) - (row.soldRooms || 0) - (row.blockedRooms || 0), 0),
        sold: row.soldRooms || 0,
        held: 0,
        closed: row.status === 'CLOSED' ? (row.blockedRooms || row.totalRooms || 0) : 0,
        outOfOrder: row.status === 'MAINTENANCE' ? (row.blockedRooms || row.totalRooms || 0) : 0
      }))
    }))).flat()
    return { propertyId: query.propertyId, roomTypeId: query.roomTypeId, roomTypeNights }
  },

  // ========== 可售房型搜索（按日期范围，预订创建时使用） ==========

  async searchAvailableRooms(params: {
    propertyId: ID
    checkIn: string
    checkOut: string
    guests?: number
  }): Promise<RoomType[]> {
    const types = await this.listRoomTypes(params.propertyId)
    if (!params.guests) return types
    return types.filter(t => t.capacity >= params.guests!)
  }
}

export type PropertyService = typeof propertyService
export default propertyService