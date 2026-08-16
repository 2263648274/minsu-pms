<template>
  <div class="dashboard">
    <!-- Stats Bento Grid -->
    <div class="stats-bento mb-6">
      <div
        v-for="(stat, index) in stats"
        :key="index"
        class="stat-card linear-card"
        :ref="el => cardRefs[index] = el"
        @mousemove="handleMouseMove"
      >
        <div class="linear-card__spotlight"
          :style="{ left: `${spotlightPositions[index].x}px`, top: `${spotlightPositions[index].y}px` }"
        ></div>
        <div class="stat-content linear-card-content">
          <div class="stat-icon" :style="{ background: stat.color }">
            <el-icon :size="32" color="white">
              <component :is="stat.icon"></component>
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div v-if="stat.sub" class="stat-sub">{{ stat.sub }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- 房态分布 -->
      <div class="content-card-main linear-card">
        <div class="card-header">
          <span class="text-lg font-semibold text-text-primary">房态分布</span>
          <el-button link type="primary" @click="goToRooms">查看全部 →</el-button>
        </div>
        <div v-loading="loading" class="room-status-grid">
          <div
            v-for="rs in roomStatusList"
            :key="rs.status"
            class="room-status-item"
            :style="{ borderColor: rs.color }"
            @click="goToRooms(rs.status)"
          >
            <div class="rs-icon" :style="{ background: rs.color }">
              <el-icon :size="20" color="white"><component :is="rs.icon" /></el-icon>
            </div>
            <div class="rs-info">
              <div class="rs-label">{{ rs.label }}</div>
              <div class="rs-value">{{ rs.count }} <span class="rs-unit">间</span></div>
            </div>
          </div>
        </div>
        <el-divider />
        <div class="occupancy-bar">
          <div class="ob-label">
            <span>入住率</span>
            <span class="ob-value">{{ statsData?.occupancyRate ?? 0 }}%</span>
          </div>
          <el-progress
            :percentage="statsData?.occupancyRate ?? 0"
            :stroke-width="14"
            :show-text="false"
            color="#67c23a"
          />
          <div class="ob-tip">
            已入住 {{ statsData?.occupiedRooms ?? 0 }} / 总 {{ statsData?.totalRooms ?? 0 }}
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="content-card-side linear-card">
        <div class="card-header">
          <span class="text-lg font-semibold text-text-primary">快捷操作</span>
        </div>
        <el-space wrap direction="vertical" fill :size="12">
          <button type="button" class="linear-btn linear-btn--primary linear-btn--full" @click="goToOrders">
            <el-icon><Plus /></el-icon> 新建订单
          </button>
          <button type="button" class="linear-btn linear-btn--secondary linear-btn--full" @click="() => goToRooms()">
            <el-icon><House /></el-icon> 房间管理
          </button>
          <button type="button" class="linear-btn linear-btn--ghost linear-btn--full" @click="goToCustomers">
            <el-icon><User /></el-icon> 客户档案
          </button>
        </el-space>

        <el-divider />

        <div class="quick-stat-list">
          <div class="qs-item">
            <span class="qs-label">今日入住</span>
            <span class="qs-value">{{ statsData?.todayCheckIns ?? 0 }} 单</span>
          </div>
          <div class="qs-item">
            <span class="qs-label">今日退房</span>
            <span class="qs-value">{{ statsData?.todayCheckOuts ?? 0 }} 单</span>
          </div>
          <div class="qs-item">
            <span class="qs-label">待入住订单</span>
            <span class="qs-value">{{ statsData?.pendingOrders ?? 0 }} 单</span>
          </div>
          <div class="qs-item">
            <span class="qs-label">本月新增客户</span>
            <span class="qs-value">{{ statsData?.newCustomersThisMonth ?? 0 }} 位</span>
          </div>
        </div>
      </div>
    </div>

    <div v-loading="loading" class="report-section">
      <div class="report-card report-card--trend linear-card">
        <div class="card-header">
          <div>
            <span class="text-lg font-semibold text-text-primary">本月营收趋势</span>
            <div class="card-subtitle">数据来自后端营业报表，按日聚合</div>
          </div>
          <el-button link type="primary" @click="goToReports">查看完整报表 →</el-button>
        </div>
        <div v-if="revenueTrend.length" class="trend-chart">
          <div v-for="item in revenueTrend" :key="item.date" class="trend-column">
            <div class="trend-value">{{ item.revenue > 0 ? formatCompactMoney(item.revenue) : '' }}</div>
            <div class="trend-track">
              <div class="trend-bar" :style="{ height: `${trendBarHeight(item.revenue)}%` }"></div>
            </div>
            <div class="trend-date">{{ item.date.slice(5) }}</div>
            <div class="trend-occupancy">{{ formatOccupancy(item.occupancy) }}</div>
          </div>
        </div>
        <el-empty v-else description="本月暂无营收趋势数据" :image-size="72" />
      </div>

      <div class="report-split-grid">
        <div class="report-card linear-card">
          <div class="card-header">
            <div>
              <span class="text-lg font-semibold text-text-primary">渠道表现</span>
              <div class="card-subtitle">订单与营收贡献</div>
            </div>
          </div>
          <div v-if="channelPerformance.length" class="performance-list">
            <div v-for="item in channelPerformance" :key="item.channelId" class="performance-item">
              <div class="performance-meta">
                <span class="performance-name">{{ channelLabel(item.channelId) }}</span>
                <span>{{ item.orderCount }} 单 · {{ formatMoney(item.revenue) }}</span>
              </div>
              <el-progress :percentage="Math.round(item.share * 100)" :stroke-width="8" />
            </div>
          </div>
          <el-empty v-else description="暂无渠道数据" :image-size="64" />
        </div>

        <div class="report-card linear-card">
          <div class="card-header">
            <div>
              <span class="text-lg font-semibold text-text-primary">房型表现</span>
              <div class="card-subtitle">房型营收贡献</div>
            </div>
          </div>
          <div v-if="roomTypePerformance.length" class="performance-list">
            <div v-for="item in roomTypePerformance" :key="item.roomTypeId" class="performance-item">
              <div class="performance-meta">
                <span class="performance-name">{{ item.name }}</span>
                <span>{{ item.orderCount }} 单 · {{ formatMoney(item.revenue) }}</span>
              </div>
              <el-progress :percentage="Math.round(item.share * 100)" :stroke-width="8" color="#67c23a" />
            </div>
          </div>
          <el-empty v-else description="暂无房型数据" :image-size="64" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dashboardService from '@/services/dashboard'
import type { ReportDailyTrend, ReportChannelStat, ReportRoomTypeStat } from '@/services/report'
import { channelList } from '@/channels/adapters/registry'
import type { DashboardStats } from '@/types'
import {
  TrendCharts,
  Money,
  House,
  User,
  Brush,
  Tools,
  Plus
} from '@element-plus/icons-vue'

const router = useRouter()

interface SpotlightPosition {
  x: number
  y: number
}

const statsData = ref<DashboardStats | null>(null)
const loading = ref(false)
const revenueTrend = ref<ReportDailyTrend[]>([])
const channelPerformance = ref<ReportChannelStat[]>([])
const roomTypePerformance = ref<ReportRoomTypeStat[]>([])

const stats = ref([
  {
    label: '今日营收',
    value: '¥0',
    sub: '',
    color: 'linear-gradient(135deg, #f56c6c, #f89898)',
    icon: Money
  },
  {
    label: '本月营收',
    value: '¥0',
    sub: '累计 ¥0',
    color: 'linear-gradient(135deg, #67c23a, #95d475)',
    icon: TrendCharts
  },
  {
    label: '已入住',
    value: '0 间',
    sub: '入住率 0%',
    color: 'linear-gradient(135deg, #409eff, #79bbff)',
    icon: House
  },
  {
    label: '客户总数',
    value: '0',
    sub: '本月新增 0 位',
    color: 'linear-gradient(135deg, #e6a23c, #ebb563)',
    icon: User
  }
])

const roomStatusList = ref<Array<{ status: string; label: string; count: number; color: string; icon: any }>>([
  { status: 'vacant', label: '空闲', count: 0, color: '#67c23a', icon: House },
  { status: 'occupied', label: '已入住', count: 0, color: '#409eff', icon: User },
  { status: 'cleaning', label: '打扫中', count: 0, color: '#e6a23c', icon: Brush },
  { status: 'maintenance', label: '维修中', count: 0, color: '#f56c6c', icon: Tools }
])

// Spotlight effect
const cardRefs = ref<any[]>([])
const spotlightPositions = ref<SpotlightPosition[]>([
  { x: 150, y: 80 },
  { x: 150, y: 80 },
  { x: 150, y: 80 },
  { x: 150, y: 80 }
])

const handleMouseMove = (event: MouseEvent) => {
  const index = cardRefs.value.findIndex(ref => ref === event.currentTarget)
  if (index >= 0) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    spotlightPositions.value[index] = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }
}

const formatMoney = (n: number) => `¥${n.toLocaleString('zh-CN')}`
const formatCompactMoney = (n: number) => n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${Math.round(n)}`
const formatOccupancy = (value: number) => `${Math.round(Math.min(value, 1) * 100)}%`
const trendBarHeight = (revenue: number) => {
  const max = Math.max(...revenueTrend.value.map(item => item.revenue), 1)
  return revenue > 0 ? Math.max((revenue / max) * 100, 4) : 0
}
const channelLabel = (id: string) => {
  if (id.toUpperCase() === 'DIRECT') return '直销'
  return channelList.find(channel => channel.id.toLowerCase() === id.toLowerCase())?.displayName || id
}
const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const loadStats = async () => {
  loading.value = true
  try {
    const today = new Date()
    const startDate = formatDate(new Date(today.getFullYear(), today.getMonth(), 1))
    const endDate = formatDate(today)
    const [data, trend, channels, roomTypes] = await Promise.all([
      dashboardService.getStats(),
      dashboardService.getRevenueTrend({ startDate, endDate }),
      dashboardService.getChannelPerformance({ startDate, endDate }),
      dashboardService.getRoomTypePerformance({ startDate, endDate })
    ])
    revenueTrend.value = trend
    channelPerformance.value = channels
    roomTypePerformance.value = roomTypes
    statsData.value = data
    const monthRevenue = trend.reduce((sum, item) => sum + item.revenue, 0)
    stats.value = [
      {
        label: '今日营收',
        value: formatMoney(data.todayRevenue),
        sub: '',
        color: 'linear-gradient(135deg, #f56c6c, #f89898)',
        icon: Money
      },
      {
        label: '本月营收',
        value: formatMoney(monthRevenue),
        sub: `截至 ${endDate.slice(5)}`,
        color: 'linear-gradient(135deg, #67c23a, #95d475)',
        icon: TrendCharts
      },
      {
        label: '已入住',
        value: `${data.occupiedRooms} 间`,
        sub: `入住率 ${data.occupancyRate}%`,
        color: 'linear-gradient(135deg, #409eff, #79bbff)',
        icon: House
      },
      {
        label: '客户总数',
        value: `${data.totalCustomers}`,
        sub: `本月新增 ${data.newCustomersThisMonth} 位`,
        color: 'linear-gradient(135deg, #e6a23c, #ebb563)',
        icon: User
      }
    ]
    roomStatusList.value = [
      { status: 'vacant', label: '空闲', count: data.vacantRooms, color: '#67c23a', icon: House },
      { status: 'occupied', label: '已入住', count: data.occupiedRooms, color: '#409eff', icon: User },
      { status: 'cleaning', label: '打扫中', count: data.cleaningRooms, color: '#e6a23c', icon: Brush },
      { status: 'maintenance', label: '维修中', count: data.maintenanceRooms, color: '#f56c6c', icon: Tools }
    ]
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '仪表盘加载失败')
  } finally {
    loading.value = false
  }
}

const goToRooms = (status?: string) => {
  router.push({ path: '/admin/property/rooms', query: status ? { status } : {} })
}
const goToOrders = () => router.push('/admin/booking')
const goToCustomers = () => router.push('/admin/guest')
const goToReports = () => router.push('/admin/report')

onMounted(() => {
  loadStats()
})
</script>

<style scoped lang="scss">
.dashboard {
  .mb-6 {
    margin-bottom: 24px;
  }

  .text-lg {
    font-size: 18px;
  }

  .font-semibold {
    font-weight: 600;
  }

  .text-text-primary {
    color: var(--text-primary);
  }

  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  // Stats Bento Grid - 2x2
  .stats-bento {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .stat-card {
    position: relative;
    overflow: hidden;

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-default);
      flex-shrink: 0;
    }

    .stat-info {
      flex: 1;

      .stat-label {
        font-size: 14px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: var(--text-primary);
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .stat-sub {
        font-size: 13px;
        color: var(--text-secondary);
      }
    }
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;

    .content-card-main,
    .content-card-side {
      position: relative;
    }
  }

  .report-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 20px;
  }

  .report-card {
    overflow: hidden;
  }

  .card-subtitle {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .trend-chart {
    display: flex;
    align-items: stretch;
    gap: 10px;
    height: 240px;
    padding: 20px;
    overflow-x: auto;
  }

  .trend-column {
    display: grid;
    grid-template-rows: 22px 1fr 18px 18px;
    flex: 1 0 44px;
    min-width: 44px;
    text-align: center;
  }

  .trend-value,
  .trend-date,
  .trend-occupancy {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .trend-track {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    min-height: 130px;
    border-bottom: 1px solid var(--border-default);
  }

  .trend-bar {
    width: min(26px, 65%);
    min-height: 0;
    border-radius: 6px 6px 2px 2px;
    background: linear-gradient(180deg, #409eff, #79bbff);
    transition: height 0.25s ease;
  }

  .trend-occupancy {
    color: #67c23a;
  }

  .report-split-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }

  .performance-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .performance-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .performance-name {
    color: var(--text-primary);
    font-weight: 600;
  }

  .room-status-grid {
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .room-status-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    }

    .rs-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .rs-info {
      flex: 1;

      .rs-label {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 2px;
      }

      .rs-value {
        font-size: 22px;
        font-weight: bold;
        color: var(--text-primary);

        .rs-unit {
          font-size: 13px;
          font-weight: normal;
          color: var(--text-secondary);
          margin-left: 4px;
        }
      }
    }
  }

  .occupancy-bar {
    padding: 0 20px 20px;

    .ob-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
      color: var(--text-secondary);

      .ob-value {
        font-size: 22px;
        font-weight: bold;
        color: #67c23a;
      }
    }

    .ob-tip {
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    }
  }

  .quick-stat-list {
    padding: 0 20px 20px;

    .qs-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
      border-bottom: 1px dashed var(--border-default);

      &:last-child {
        border-bottom: none;
      }

      .qs-label {
        color: var(--text-secondary);
      }

      .qs-value {
        color: var(--text-primary);
        font-weight: 600;
      }
    }
  }

  @media (max-width: 768px) {
    .stats-bento {
      grid-template-columns: 1fr;
    }

    .content-grid {
      grid-template-columns: 1fr;
    }

    .report-split-grid {
      grid-template-columns: 1fr;
    }

    .room-status-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
