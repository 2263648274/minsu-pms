/**
 * 仪表盘 Service
 * PMS 首页核心指标：入住率、ADR、RevPAR、营收、订单趋势。
 *
 * Phase 1 范围：基础 stats（保留与 Dashboard.vue 兼容）。
 * Phase 2 扩展：营收趋势、房型表现、渠道表现。
 */
import { getDashboardStats as _getDashboardStats } from './api'
import type { DashboardStats } from '@/types'

export const dashboardService = {
  /** 获取仪表盘统计 */
  getStats(): Promise<DashboardStats> {
    return _getDashboardStats()
  },

  // ========== Phase 2 占位 ==========

  /** 获取营收趋势 */
  getRevenueTrend(_params: { startDate: string; endDate: string; granularity: 'day' | 'week' | 'month' }): Promise<unknown> {
    throw new Error('[dashboardService.getRevenueTrend] Phase 2 待实现')
  },

  /** 获取房型表现 */
  getRoomTypePerformance(_params: { startDate: string; endDate: string }): Promise<unknown> {
    throw new Error('[dashboardService.getRoomTypePerformance] Phase 2 待实现')
  },

  /** 获取渠道表现 */
  getChannelPerformance(_params: { startDate: string; endDate: string }): Promise<unknown> {
    throw new Error('[dashboardService.getChannelPerformance] Phase 2 待实现')
  }
}

export type DashboardService = typeof dashboardService
export default dashboardService