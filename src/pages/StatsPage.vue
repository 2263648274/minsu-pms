<template>
  <div class="stats-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col
        v-for="(stat, index) in stats"
        :key="index"
        :xs="24"
        :sm="12"
        :md="6"
        :lg="6"
      >
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: stat.color }">
              <el-icon :size="32" color="white">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'">
                <el-icon>
                  <component :is="stat.trend > 0 ? TrendCharts : Bottom" />
                </el-icon>
                {{ Math.abs(stat.trend) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :xs="24" :md="16">
        <el-card class="chart-card">
          <template #header>
            <span>{{ chartTitle }}</span>
          </template>
          <div class="chart-placeholder">
            <el-empty description="图表区域，可集成ECharts或Chart.js" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="chart-card">
          <template #header>
            <span>数据分布</span>
          </template>
          <div class="chart-placeholder">
            <el-empty description="图表区域，可集成ECharts或Chart.js" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-row style="margin-top: 20px">
      <el-col :span="24">
        <el-card class="table-card">
          <template #header>
            <span>详细数据</span>
          </template>
          <el-table :data="tableData" stripe>
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="value" label="数值" />
            <el-table-column prop="date" label="日期" width="180" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { TrendCharts, Bottom } from '@element-plus/icons-vue'

interface Stat {
  label: string
  value: string | number
  trend: number
  color: string
  icon: any
}

interface Props {
  stats?: Stat[]
  chartTitle?: string
  tableData?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  stats: () => [],
  chartTitle: '数据趋势',
  tableData: () => []
})
void props
</script>

<style scoped lang="scss">
.stats-page {
  .stats-row {
    .stat-card {
      margin-bottom: 20px;

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
          margin-bottom: 8px;
        }

        .stat-trend {
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;

          &.up {
            color: #67c23a;
          }

          &.down {
            color: #f56c6c;
          }
        }
      }
    }
  }

  .chart-card,
  .table-card {
    .chart-placeholder {
      height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
