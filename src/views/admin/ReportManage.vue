<template>
  <div class="report-manage">
    <!-- ========== 顶部 Hero ========== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><TrendCharts /></el-icon>
        <div class="hero-text">
          <h2>营业报表</h2>
          <p class="subtitle">营收 · 间夜 · ADR · RevPAR · 入住率 可视化</p>
        </div>
        <div class="hero-actions">
          <el-tag type="warning" effect="plain">
            <el-icon><Warning /></el-icon>
            <span style="margin-left: 4px">数据来自后端报表聚合</span>
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- ========== 时间范围筛选 ========== -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
            @change="reload"
          />
        </el-form-item>
        <el-form-item label="对比">
          <el-radio-group v-model="filters.compareMode" @change="reload">
            <el-radio-button value="none">无对比</el-radio-button>
            <el-radio-button value="prev">对比上一周期</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="onReset">重置</el-button>
          <el-button :icon="Download" @click="exportCsv">导出报表</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ========== 顶部 KPI ========== -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">营收（卖价）</div>
          <div class="kpi-value">¥{{ formatMoney(kpi.revenue.amount) }}</div>
          <div v-if="filters.compareMode === 'prev'" class="kpi-diff" :class="kpi.revenue.diff > 0 ? 'up' : 'down'">
            <el-icon><CaretTop v-if="kpi.revenue.diff > 0" /><CaretBottom v-else /></el-icon>
            {{ Math.abs(kpi.revenue.diff * 100).toFixed(1) }}% vs 上期
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">订单数</div>
          <div class="kpi-value">{{ kpi.orderCount }}</div>
          <div v-if="filters.compareMode === 'prev'" class="kpi-diff" :class="kpi.orderCountDiff > 0 ? 'up' : 'down'">
            <el-icon><CaretTop v-if="kpi.orderCountDiff > 0" /><CaretBottom v-else /></el-icon>
            {{ Math.abs(kpi.orderCountDiff * 100).toFixed(1) }}% vs 上期
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">入住间夜</div>
          <div class="kpi-value">{{ kpi.nights }}</div>
          <div class="kpi-sub">ADR ¥{{ kpi.adr.toFixed(2) }} / RevPAR ¥{{ kpi.revpar.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">平均入住率</div>
          <div class="kpi-value">
            {{ (kpi.occupancyRate * 100).toFixed(1) }}%
          </div>
          <el-progress
            :percentage="Math.round(kpi.occupancyRate * 100)"
            :stroke-width="6"
            :show-text="false"
            :color="kpi.occupancyRate >= 0.7 ? '#67c23a' : kpi.occupancyRate >= 0.4 ? '#e6a23c' : '#f56c6c'"
            style="margin-top: 6px"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- ========== 营收趋势（按日聚合） ========== -->
    <el-card shadow="never" class="chart-card">
      <template #header>
        <div class="card-header">
          <span class="title">每日营收趋势</span>
          <span class="sub">柱状：营收 · 折线：入住率</span>
        </div>
      </template>
      <div class="bar-chart">
        <div class="y-axis-label">¥</div>
        <div class="bars">
          <div v-for="d in trend" :key="d.date" class="bar-wrap">
            <div class="bar" :style="{ height: barHeight(d.revenue) + '%' }" :title="`${d.date}: ¥${d.revenue}`">
              <span v-if="d.revenue > 0" class="bar-value">¥{{ formatMoney(d.revenue) }}</span>
            </div>
            <div class="bar-label">{{ shortDate(d.date) }}</div>
            <div class="bar-occupancy" :style="{ width: Math.max(2, d.occupancy * 100) + '%' }">
              {{ (d.occupancy * 100).toFixed(0) }}%
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- ========== 渠道贡献 ========== -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="card-header">
              <span class="title">渠道营收贡献</span>
              <span class="sub">本周期内每个渠道的订单 / 营收占比</span>
            </div>
          </template>
          <el-table :data="channelStats" stripe size="small" border>
            <el-table-column label="渠道" min-width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="channelTagType(row.channelId)">
                  {{ channelLabel(row.channelId) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="订单" prop="orderCount" width="80" align="right" />
            <el-table-column label="营收" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.revenue) }}</template>
            </el-table-column>
            <el-table-column label="占比" min-width="160">
              <template #default="{ row }">
                <el-progress :percentage="Math.round(row.share * 100)" :stroke-width="10" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="card-header">
              <span class="title">房型营收贡献</span>
              <span class="sub">本周期内每个房型的订单 / 营收占比</span>
            </div>
          </template>
          <el-table :data="roomTypeStats" stripe size="small" border>
            <el-table-column label="房型" min-width="120" prop="name" />
            <el-table-column label="订单" prop="orderCount" width="80" align="right" />
            <el-table-column label="营收" width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.revenue) }}</template>
            </el-table-column>
            <el-table-column label="占比" min-width="160">
              <template #default="{ row }">
                <el-progress :percentage="Math.round(row.share * 100)" :stroke-width="10" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- ========== 说明 ========== -->
    <el-alert type="warning" :closable="false" show-icon>
      <template #title>数据来源说明</template>
      <div class="alert-content">
        <p>本页 KPI、趋势、渠道贡献和房型贡献均来自后端 ReportController。</p>
        <p>Phase 4 实施路径：</p>
        <ul>
          <li>新增 <code>ReportController</code> 暴露 <code>/api/report/overview</code> + <code>/api/report/trend</code> + <code>/api/report/channel-breakdown</code></li>
          <li>聚合 SQL：营收按日 SUM / 按渠道 GROUP BY / 按房型 GROUP BY</li>
          <li>真实数据回填本页，前端只需把 <code>buildMockData()</code> 替换为 <code>fetch()</code></li>
        </ul>
      </div>
    </el-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Warning, TrendCharts, CaretTop, CaretBottom } from '@element-plus/icons-vue'
import { channelList } from '@/channels/adapters/registry'
import reportService from '@/services/report'

// ========== 类型 ==========

interface DailyTrend {
  date: string
  revenue: number
  occupancy: number
}

interface ChannelStat {
  channelId: string
  orderCount: number
  revenue: number
  share: number
}

interface RoomTypeStat {
  name: string
  orderCount: number
  revenue: number
  share: number
}

interface Kpi {
  revenue: { amount: number; diff: number }
  orderCount: number
  orderCountDiff: number
  nights: number
  adr: number
  revpar: number
  occupancyRate: number
}

// ========== 筛选 ==========

const filters = reactive({
  dateRange: [] as string[],
  compareMode: 'none' as 'none' | 'prev'
})

const trend = ref<DailyTrend[]>([])
const channelStats = ref<ChannelStat[]>([])
const roomTypeStats = ref<RoomTypeStat[]>([])
const prevKpi = ref<{ revenue: number; orderCount: number } | null>(null)
const reportKpi = ref<{ revenue: number; orderCount: number; nights: number; adr: number; revpar: number; occupancyRate: number } | null>(null)

// ========== KPI ==========

const kpi = computed<Kpi>(() => {
  const totalRevenue = reportKpi.value?.revenue ?? trend.value.reduce((s, d) => s + d.revenue, 0)
  const totalOrders = reportKpi.value?.orderCount ?? channelStats.value.reduce((s, c) => s + c.orderCount, 0)
  const totalNights = reportKpi.value?.nights ?? 0
  const adr = reportKpi.value?.adr ?? 0
  const revpar = reportKpi.value?.revpar ?? 0
  const occupancyRate = reportKpi.value?.occupancyRate ?? 0
  const revenueDiff = prevKpi.value ? (totalRevenue - prevKpi.value.revenue) / Math.max(prevKpi.value.revenue, 1) : 0
  const orderDiff = prevKpi.value ? (totalOrders - prevKpi.value.orderCount) / Math.max(prevKpi.value.orderCount, 1) : 0
  return {
    revenue: { amount: totalRevenue, diff: revenueDiff },
    orderCount: totalOrders,
    orderCountDiff: orderDiff,
    nights: totalNights,
    adr,
    revpar,
    occupancyRate: Math.min(occupancyRate, 1)
  }
})

// ========== 柱状图高度计算 ==========

const barHeight = (revenue: number) => {
  const max = Math.max(...trend.value.map(d => d.revenue), 1)
  return Math.max((revenue / max) * 100, revenue > 0 ? 4 : 0)
}

// ========== 数据生成 ==========

const SEED_CHANNELS = ['DIRECT', 'ctrip', 'fliggy', 'meituan', 'douyin', 'taobao']
const SEED_ROOM_TYPES = ['海景大床房', '园景双床房', '豪华家庭房', '亲子套房', '经济单人房']

function dateRange(start: string, end: string): string[] {
  const res: string[] = []
  const s = new Date(start)
  const e = new Date(end)
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    res.push(d.toISOString().slice(0, 10))
  }
  return res
}

const reload = async () => {
  const today = new Date()
  const defaultEnd = today.toISOString().slice(0, 10)
  const defaultStart = new Date(today.getTime() - 13 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const [from, to] = filters.dateRange.length === 2 ? filters.dateRange : [defaultStart, defaultEnd]
  try {
    const [overview, trendData, channels, roomTypes] = await Promise.all([
      reportService.getOverview(from, to),
      reportService.getTrend(from, to),
      reportService.getChannelBreakdown(from, to),
      reportService.getRoomTypeBreakdown(from, to)
    ])
    trend.value = trendData
    channelStats.value = channels
    roomTypeStats.value = roomTypes
    prevKpi.value = null
    reportKpi.value = overview
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '报表加载失败')
  }
}

const onReset = () => {
  filters.dateRange = []
  filters.compareMode = 'none'
  reload()
}

// ========== 导出 ==========

const exportCsv = () => {
  if (trend.value.length === 0) {
    ElMessage.warning('当前没有可导出的数据')
    return
  }
  const header = ['日期', '营收', '入住率']
  const rows = trend.value.map(d => [d.date, d.revenue.toString(), (d.occupancy * 100).toFixed(2) + '%'])
  const csv = '\uFEFF' + [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('CSV 已下载')
}

// ========== 辅助 ==========

const channelLabel = (id: string) => {
  if (id === 'DIRECT') return '直销'
  return channelList.find(c => c.id === id)?.displayName || id
}
const channelTagType = (id: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  if (id === 'DIRECT') return 'success'
  switch (id) {
    case 'ctrip': return 'primary'
    case 'fliggy': return 'warning'
    case 'meituan': return 'success'
    case 'douyin': return 'danger'
    case 'taobao': return 'info'
    default: return 'info'
  }
}
const formatMoney = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const shortDate = (iso: string) => iso.slice(5) // MM-DD

onMounted(reload)

// channelList 已在模板里直接引用，无需 void 占位
</script>

<style scoped lang="scss">
.report-manage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hero-card {
  background: linear-gradient(135deg, var(--primary-color-9, #ecf5ff) 0%, #fff 100%);
  border: none;
  :deep(.el-card__body) { padding: 20px 24px; }
}
.hero-content {
  display: flex;
  align-items: center;
  gap: 18px;
  .hero-text {
    flex: 1;
    h2 { margin: 0 0 4px; font-size: 22px; }
    .subtitle { margin: 0; color: #909399; font-size: 13px; }
  }
  .hero-actions { display: flex; gap: 8px; }
}
.filter-card {
  :deep(.el-card__body) { padding: 16px 20px; }
  .filter-form { margin-bottom: 0; }
}
.kpi-row {
  .kpi-card {
    :deep(.el-card__body) { padding: 16px 20px; }
    .kpi-label { color: #909399; font-size: 13px; }
    .kpi-value {
      font-size: 26px;
      font-weight: 700;
      margin: 4px 0;
      color: #303133;
    }
    .kpi-sub { color: #909399; font-size: 12px; margin-top: 4px; }
    .kpi-diff {
      font-size: 12px;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 2px;
      &.up { color: var(--el-color-success); }
      &.down { color: var(--el-color-danger); }
    }
  }
}
.chart-card {
  :deep(.el-card__body) { padding: 16px 20px; }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title { font-weight: 600; }
    .sub { color: #909399; font-size: 12px; }
  }
  .bar-chart {
    display: flex;
    gap: 4px;
    height: 220px;
    padding-top: 8px;
    align-items: stretch;
    .y-axis-label {
      width: 20px;
      color: #909399;
      font-size: 11px;
      display: flex;
      align-items: flex-start;
      padding-top: 2px;
    }
    .bars {
      flex: 1;
      display: flex;
      gap: 4px;
      align-items: flex-end;
      border-bottom: 1px solid #ebeef5;
      padding-bottom: 0;
      .bar-wrap {
        flex: 1;
        min-width: 18px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        height: 100%;
        justify-content: flex-end;
        position: relative;
        .bar {
          width: 100%;
          background: linear-gradient(180deg, #409eff 0%, #79bbff 100%);
          border-radius: 3px 3px 0 0;
          transition: height 0.3s ease;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 2px;
          min-height: 2px;
          &:hover { background: linear-gradient(180deg, #337ecc 0%, #5fa1e8 100%); }
        }
        .bar-value {
          font-size: 9px;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,.3);
          writing-mode: vertical-rl;
          padding: 2px 0;
        }
        .bar-label {
          font-size: 10px;
          color: #606266;
          margin-top: 2px;
        }
        .bar-occupancy {
          font-size: 9px;
          color: var(--el-color-warning);
          background: #fdf6ec;
          padding: 0 2px;
          border-radius: 2px;
          margin-top: 1px;
        }
      }
    }
  }
}
.table-card {
  :deep(.el-card__body) { padding: 16px 20px; }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title { font-weight: 600; }
    .sub { color: #909399; font-size: 12px; }
  }
}
.alert-content {
  font-size: 13px;
  line-height: 1.6;
  p { margin: 6px 0; }
  ul { margin: 6px 0 6px 24px; }
  code { background: #f5f7fa; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
}
</style>