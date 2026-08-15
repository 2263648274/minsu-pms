import request from './request'

export interface ReportDailyTrend { date: string; revenue: number; occupancy: number }
export interface ReportChannelStat { channelId: string; orderCount: number; revenue: number; share: number }
export interface ReportRoomTypeStat { roomTypeId: number; name: string; orderCount: number; revenue: number; share: number }
export interface ReportOverview {
  from: string; to: string; days: number; revenue: number; orderCount: number
  nights: number; totalRoomNights: number; adr: number; revpar: number; occupancyRate: number
}

const rangeParams = (from?: string, to?: string) => ({ from, to })

export const reportService = {
  getOverview(from?: string, to?: string) {
    return request<ReportOverview>({ url: '/reports/overview', method: 'get', params: rangeParams(from, to) })
  },
  getTrend(from?: string, to?: string) {
    return request<ReportDailyTrend[]>({ url: '/reports/trend', method: 'get', params: rangeParams(from, to) })
  },
  getChannelBreakdown(from?: string, to?: string) {
    return request<ReportChannelStat[]>({ url: '/reports/channel-breakdown', method: 'get', params: rangeParams(from, to) })
  },
  getRoomTypeBreakdown(from?: string, to?: string) {
    return request<ReportRoomTypeStat[]>({ url: '/reports/roomtype-breakdown', method: 'get', params: rangeParams(from, to) })
  }
}

export default reportService
