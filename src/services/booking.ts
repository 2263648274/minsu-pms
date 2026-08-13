/**
 * 订单 Service
 * 民宿 PMS 的核心业务实体：订单全生命周期管理。
 *
 * Phase 2 范围：
 * - 订单 CRUD（保留与 OrderManage.vue 兼容）
 * - 状态机校验：取消/入住/退房的状态前置条件检查
 * - 取消订单（含退款处理）
 *
 * Phase 3 范围：客人自动匹配、押金管理、渠道订单转换。
 */
import {
  getOrderList as _getOrderList,
  getAllOrders as _getAllOrders,
  createOrder as _createOrder,
  updateOrder as _updateOrder,
  deleteOrder as _deleteOrder,
  checkInOrder as _checkInOrder,
  checkOutOrder as _checkOutOrder
} from './api'
import type {
  OrderInfo,
  OrderListParams,
  PageResult
} from '@/types'
import type { ID } from '@/types/domain/common'
import { mockCancelBooking } from './mock'

/** 状态机：定义合法的状态流转 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: ['completed'],
  completed: [],
  cancelled: [],
  refunded: [],
  no_show: []
}

export const bookingService = {
  // ========== 订单 CRUD ==========

  listBookings(params: OrderListParams): Promise<PageResult<OrderInfo>> {
    return _getOrderList(params)
  },

  listAllBookings(): Promise<OrderInfo[]> {
    return _getAllOrders()
  },

  createBooking(data: Partial<OrderInfo>): Promise<{ id: number }> {
    return _createOrder(data)
  },

  updateBooking(id: number, data: Partial<OrderInfo>): Promise<boolean> {
    return _updateOrder(id, data)
  },

  deleteBooking(id: number): Promise<boolean> {
    return _deleteOrder(id)
  },

  // ========== 状态流转 ==========

  checkIn(id: number): Promise<boolean> {
    return _checkInOrder(id)
  },

  checkOut(id: number): Promise<boolean> {
    return _checkOutOrder(id)
  },

  /**
   * 取消订单（含退款处理）。
   * 状态机校验：只有 pending/confirmed 状态可取消。
   */
  async cancelBooking(
    id: ID,
    reason: string,
    refund: boolean
  ): Promise<{ ok: boolean; status: string; refunded: boolean; message?: string }> {
    // 状态机校验（演示版：从 mock 拿当前状态）
    const allOrders = await _getAllOrders()
    const order = allOrders.find(o => o.id === id)
    if (!order) return { ok: false, status: 'not_found', refunded: false, message: '订单不存在' }
    if (!VALID_TRANSITIONS[order.status]?.includes('cancelled')) {
      return {
        ok: false,
        status: order.status,
        refunded: false,
        message: `当前状态 [${order.status}] 不允许取消`
      }
    }
    return mockCancelBooking(id, reason, refund)
  },

  /** 判断状态流转是否合法 */
  canTransition(from: string, to: string): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false
  },

  /** 列出某个状态的合法目标状态 */
  nextStates(from: string): string[] {
    return VALID_TRANSITIONS[from] ?? []
  }
}

export type BookingService = typeof bookingService
export default bookingService