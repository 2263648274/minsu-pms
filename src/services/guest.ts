/**
 * 客人 Service
 * 民宿客户的档案、消费记录、VIP 等级管理。
 *
 * Phase 2 范围：
 * - 客人 CRUD（保留与 CustomerManage.vue 兼容）
 * - 消费记录聚合（按客人）— 走后端 GET /api/customers/{id}
 * - 黑名单管理 — 走后端 PUT /api/customers/{id}（blacklist 字段）
 */
import {
  getCustomerList as _getCustomerList,
  getAllCustomers as _getAllCustomers,
  getCustomerDetail as _getCustomerDetail,
  createCustomer as _createCustomer,
  updateCustomer as _updateCustomer,
  deleteCustomer as _deleteCustomer
} from './api'
import type {
  CustomerInfo,
  CustomerListParams,
  PageResult
} from '@/types'
import type { ID } from '@/types/domain/common'
import type { GuestSpendHistory } from '@/types/domain/guest'
import type { BookingSource } from '@/types/domain/booking'

export const guestService = {
  /** 客人分页列表 */
  listGuests(params: CustomerListParams): Promise<PageResult<CustomerInfo>> {
    return _getCustomerList(params)
  },

  /** 客人全量（下拉框用） */
  listAllGuests(): Promise<CustomerInfo[]> {
    return _getAllCustomers()
  },

  /** 创建客人 */
  createGuest(data: Partial<CustomerInfo>): Promise<{ id: number }> {
    return _createCustomer(data)
  },

  /** 更新客人 */
  updateGuest(id: number, data: Partial<CustomerInfo>): Promise<boolean> {
    return _updateCustomer(id, data)
  },

  /** 删除客人 */
  deleteGuest(id: number): Promise<boolean> {
    return _deleteCustomer(id)
  },

  /**
   * 获取客人消费记录。
   * 数据来自后端 GET /api/customers/{id} 的订单聚合（history），非前端伪造数据。
   */
  async getSpendHistory(id: ID): Promise<GuestSpendHistory> {
    const detail = await _getCustomerDetail(Number(id))
    const bookings = detail.history.map((b: any) => ({
      bookingId: b.id as ID,
      orderNo: b.bookingNo || '',
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      nights: b.nights || 0,
      amount: { amount: Number(b.totalAmount || 0), currency: 'CNY' as const },
      source: (b.source || 'direct') as BookingSource
    }))
    const totalNights = bookings.reduce((s, b) => s + (b.nights || 0), 0)
    const averageNights = bookings.length > 0
      ? Math.round((totalNights / bookings.length) * 10) / 10
      : 0
    return {
      guestId: id,
      bookings,
      totalSpend: { amount: detail.totalSpent, currency: 'CNY' as const },
      averageNights
    }
  },

  /**
   * 加入 / 移出黑名单。
   * 黑名单是 Customer 实体字段，走后端 PUT /api/customers/{id}。
   */
  async toggleBlacklist(id: ID, blacklisted: boolean, reason?: string): Promise<boolean> {
    return _updateCustomer(Number(id), {
      blacklisted,
      remark: reason
    } as Partial<CustomerInfo>)
  }
}

export type GuestService = typeof guestService
export default guestService
