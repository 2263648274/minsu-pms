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
import {
  mockGetProperties,
  mockGetProperty,
  mockGetRoomTypes,
  mockGetRooms,
  mockUpdateRoomStatus,
  mockGetRatePlans,
  mockGetRateCalendar,
  mockGetInventoryCalendar
} from './mock'

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
    return Promise.resolve(mockGetProperties())
  },

  getProperty(id: ID): Promise<Property | undefined> {
    return Promise.resolve(mockGetProperty(id))
  },

  // ========== 房型 ==========

  listRoomTypes(propertyId?: ID): Promise<RoomType[]> {
    return Promise.resolve(mockGetRoomTypes(propertyId))
  },

  // ========== 房间（domain 版本，供 Phase 2 页面使用） ==========

  listDomainRooms(params?: DomainRoomListParams): Promise<PageResult<Room>> {
    return Promise.resolve(mockGetRooms(params ?? {}))
  },

  /** 更新房间状态（vacant/occupied/cleaning/maintenance/out_of_order） */
  updateRoomStatus(id: ID, status: RoomStatus): Promise<Room | undefined> {
    return Promise.resolve(mockUpdateRoomStatus(id, status))
  },

  // ========== 房价 ==========

  listRatePlans(propertyId?: ID): Promise<RatePlan[]> {
    return Promise.resolve(mockGetRatePlans(propertyId))
  },

  getRateCalendar(query: RateCalendarQuery): Promise<RateCalendar> {
    return Promise.resolve(mockGetRateCalendar(query))
  },

  // ========== 库存 ==========

  getInventoryCalendar(query: InventoryCalendarQuery): Promise<InventoryCalendar> {
    return Promise.resolve(mockGetInventoryCalendar(query))
  },

  // ========== 可售房型搜索（按日期范围，预订创建时使用） ==========

  async searchAvailableRooms(params: {
    propertyId: ID
    checkIn: string
    checkOut: string
    guests?: number
  }): Promise<RoomType[]> {
    // 简化为：返回所有房型（库存判断留待 Phase 3 接入 BookingService.createBooking 时执行）
    const types = mockGetRoomTypes(params.propertyId)
    if (!params.guests) return types
    return types.filter(t => t.capacity >= params.guests!)
  }
}

export type PropertyService = typeof propertyService
export default propertyService