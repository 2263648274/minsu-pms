/**
 * 仪表盘 Service
 * PMS 首页核心指标：入住率、ADR、RevPAR、营收、订单趋势。
 *
 * 基础 stats 走 /api/dashboard；Phase 2 扩展（营收趋势 / 房型表现 / 渠道表现）
 * 复用后端 /api/reports/* 聚合接口（与营业报表同源）。
 */
import { getDashboardStats as _getDashboardStats } from './api'
import { reportService, type ReportDailyTrend, type ReportChannelStat, type ReportRoomTypeStat } from './report'
import type { DashboardStats } from '@/types'

export const dashboardService = {
  /** 获取仪表盘统计 */
  getStats(): Promise<DashboardStats> {
    return _getDashboardStats()
  },

  // ========== Phase 2 扩展（复用报表后端） ==========

  /** 获取营收趋势（GET /api/reports/trend，日粒度） */
  getRevenueTrend(params: { startDate: string; endDate: string; granularity?: 'day' | 'week' | 'month' }): Promise<ReportDailyTrend[]> {
    // 后端当前仅支持日粒度；granularity 保留入参兼容，非 day 时由调用方自行聚合
    void params.granularity
    return reportService.getTrend(params.startDate, params.endDate)
  },

  /** 获取房型表现（GET /api/reports/roomtype-breakdown） */
  getRoomTypePerformance(params: { startDate: string; endDate: string }): Promise<ReportRoomTypeStat[]> {
    return reportService.getRoomTypeBreakdown(params.startDate, params.endDate)
  },

  /** 获取渠道表现（GET /api/reports/channel-breakdown） */
  getChannelPerformance(params: { startDate: string; endDate: string }): Promise<ReportChannelStat[]> {
    return reportService.getChannelBreakdown(params.startDate, params.endDate)
  }
}

export type DashboardService = typeof dashboardService
export default dashboardService
