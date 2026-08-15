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
  checkOutOrder as _checkOutOrder,
  cancelOrder as _cancelOrder
} from './api'
import type {
  OrderInfo,
  OrderListParams,
  PageResult
} from '@/types'
import type { ID } from '@/types/domain/common'

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
   * 调用后端 POST /api/bookings/{id}/cancel：
   * - 后端做状态校验（已入住/已退房不可取消）
   * - 已支付金额 > 0 时自动标记 REFUNDED
   */
  async cancelBooking(
    id: ID,
    reason: string,
    refund: boolean
  ): Promise<{ ok: boolean; status: string; refunded: boolean; message?: string }> {
    void refund // 后端自动按已支付金额退款，无需前端传开关
    try {
      const res = await _cancelOrder(id as number, reason)
      const refunded = res?.paymentStatus === 'REFUNDED'
      // 后端取消成功固定返回 CANCELLED
      return { ok: true, status: 'cancelled', refunded, message: '订单已取消' }
    } catch (e: any) {
      return {
        ok: false,
        status: 'error',
        refunded: false,
        message: e?.message || '取消失败，请稍后重试'
      }
    }
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