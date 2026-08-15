import request from './request'

export interface FinanceStats {
  month: string
  monthRevenue: number
  monthBase: number
  monthCommission: number
  monthNet: number
  orderCount: number
}

export interface FinanceChannelSettlement {
  channelId: string
  orderCount: number
  nights: number
  sellingAmount: number
  baseAmount: number
  commissionRate: number
  commission: number
  netRevenue: number
}

export interface FinanceOrderSettlement {
  orderNo: string
  channelId: string
  checkInDate: string
  checkOutDate: string
  nights: number
  guestName: string
  sellingAmount: number
  baseAmount: number
  commission: number
  netRevenue: number
  diff: number
}

interface BackendPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export const financeService = {
  getStats(month?: string) {
    return request<FinanceStats>({ url: '/finance/stats', method: 'get', params: { month } })
  },
  getChannelSettlements(month?: string) {
    return request<FinanceChannelSettlement[]>({ url: '/finance/channel-settlements', method: 'get', params: { month } })
  },
  getOrderSettlements(params: { month?: string; channelId?: string; current?: number; size?: number }) {
    return request<BackendPage<FinanceOrderSettlement>>({
      url: '/finance/order-settlements',
      method: 'get',
      params
    })
  }
}

export default financeService
