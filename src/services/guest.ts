/**
 * 客人 Service
 * 民宿客户的档案、消费记录、VIP 等级管理。
 *
 * Phase 2 范围：
 * - 客人 CRUD（保留与 CustomerManage.vue 兼容）
 * - 消费记录聚合（按客人）
 * - 黑名单管理
 */
import {
  getCustomerList as _getCustomerList,
  getAllCustomers as _getAllCustomers,
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
import { mockGetGuestSpendHistory, mockToggleBlacklist } from './mock'

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

  /** 获取客人消费记录 */
  getSpendHistory(id: ID): Promise<GuestSpendHistory> {
    const data = mockGetGuestSpendHistory(id)
    return Promise.resolve({
      guestId: data.guestId as ID,
      bookings: data.bookings.map((b: any) => ({
        bookingId: b.bookingId,
        orderNo: b.orderNo,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        nights: b.nights,
        amount: { amount: b.amount, currency: 'CNY' as const },
        source: b.source
      })),
      totalSpend: { amount: data.totalSpend, currency: 'CNY' as const },
      averageNights: data.averageNights
    })
  },

  /** 加入 / 移出黑名单 */
  toggleBlacklist(id: ID, blacklisted: boolean, reason?: string): Promise<boolean> {
    return Promise.resolve(mockToggleBlacklist(id, blacklisted, reason))
  }
}

export type GuestService = typeof guestService
export default guestService