<template>
  <div class="finance-manage">
    <!-- ========== 顶部 Hero ========== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><Wallet /></el-icon>
        <div class="hero-text">
          <h2>财务对账</h2>
          <p class="subtitle">多平台结算单核对 · 应收 / 应付 / 佣金 / 差额</p>
        </div>
        <div class="hero-actions">
          <el-tag type="warning" effect="plain">
            <el-icon><Warning /></el-icon>
            <span style="margin-left: 4px">当前后端无财务接口，本页数据为前端聚合演示</span>
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- ========== 顶部统计卡 ========== -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月营收（卖价）</div>
          <div class="stat-value">¥{{ formatMoney(stats.monthRevenue) }}</div>
          <div class="stat-sub">来自 {{ stats.orderCount }} 笔订单</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月应付底价</div>
          <div class="stat-value text-warning">¥{{ formatMoney(stats.monthBase) }}</div>
          <div class="stat-sub">扣除佣金前</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月佣金</div>
          <div class="stat-value text-danger">¥{{ formatMoney(stats.monthCommission) }}</div>
          <div class="stat-sub">OTA 平台抽佣</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">本月实际收入</div>
          <div class="stat-value text-success">¥{{ formatMoney(stats.monthNet) }}</div>
          <div class="stat-sub">卖价 − 佣金</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ========== 筛选栏 ========== -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="结算月份">
          <el-date-picker
            v-model="filters.month"
            type="month"
            placeholder="选择月份"
            value-format="YYYY-MM"
            style="width: 180px"
            @change="onFilterChange"
          />
        </el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="filters.channelId" placeholder="全部渠道" style="width: 180px" clearable @change="onFilterChange">
            <el-option label="直销" value="DIRECT" />
            <el-option
              v-for="m in channelList"
              :key="m.id"
              :label="m.displayName"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="reload" :loading="loading">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
          <el-button :icon="Download" @click="exportCsv">导出 CSV</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ========== 渠道结算表 ========== -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">按渠道聚合的结算明细</span>
          <span class="sub">应收 − 佣金 = 实收 · 单位 元</span>
        </div>
      </template>
      <el-table
        :data="channelSettlements"
        v-loading="loading"
        stripe
        border
        size="small"
        empty-text="暂无结算数据"
      >
        <el-table-column label="渠道" min-width="140">
          <template #default="{ row }">
            <el-tag size="small" :type="channelTagType(row.channelId)">
              {{ channelLabel(row.channelId) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单数" prop="orderCount" width="100" align="right" />
        <el-table-column label="入住间夜" prop="nights" width="110" align="right" />
        <el-table-column label="卖价合计" prop="sellingAmount" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.sellingAmount) }}</template>
        </el-table-column>
        <el-table-column label="底价合计" prop="baseAmount" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.baseAmount) }}</template>
        </el-table-column>
        <el-table-column label="佣金率" prop="commissionRate" width="100" align="right">
          <template #default="{ row }">{{ (row.commissionRate * 100).toFixed(1) }}%</template>
        </el-table-column>
        <el-table-column label="佣金" prop="commission" width="140" align="right">
          <template #default="{ row }">
            <span class="text-danger">¥{{ formatMoney(row.commission) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实际收入" prop="netRevenue" width="160" align="right" fixed="right">
          <template #default="{ row }">
            <span class="text-success" style="font-weight: 600">¥{{ formatMoney(row.netRevenue) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ========== 订单级明细 ========== -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">订单级对账明细</span>
          <span class="sub">展示每笔订单的应收 / 应付 / 佣金 / 差额</span>
        </div>
      </template>
      <el-table
        :data="orderSettlements"
        v-loading="loading"
        stripe
        border
        size="small"
        max-height="500"
        empty-text="暂无订单数据"
      >
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="channelId" label="渠道" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="channelTagType(row.channelId)" effect="plain">
              {{ channelLabel(row.channelId) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="checkInDate" label="入住" width="110" />
        <el-table-column prop="checkOutDate" label="退房" width="110" />
        <el-table-column prop="nights" label="夜数" width="70" align="right" />
        <el-table-column prop="guestName" label="客人" min-width="100" show-overflow-tooltip />
        <el-table-column label="卖价" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.sellingAmount) }}</template>
        </el-table-column>
        <el-table-column label="底价" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.baseAmount) }}</template>
        </el-table-column>
        <el-table-column label="佣金" width="110" align="right">
          <template #default="{ row }">
            <span class="text-danger">¥{{ formatMoney(row.commission) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实收" width="130" align="right" fixed="right">
          <template #default="{ row }">
            <span class="text-success" style="font-weight: 600">¥{{ formatMoney(row.netRevenue) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="差额" width="110" align="right">
          <template #default="{ row }">
            <span :class="row.diff === 0 ? 'text-muted' : 'text-warning'">
              {{ row.diff === 0 ? '0.00' : (row.diff > 0 ? '+' : '') + row.diff.toFixed(2) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ========== 说明 ========== -->
    <el-alert type="warning" :closable="false" show-icon>
      <template #title>数据来源说明</template>
      <div class="alert-content">
        <p>当前后端 <code>backend/</code> 暂无 FinanceController / 结算相关接口，本页面"按渠道聚合"和"订单级明细"均为前端聚合演示数据。</p>
        <p>Phase 4 实施路径：</p>
        <ul>
          <li>新增 <code>FinanceSettlement</code> 表 + <code>FinanceController</code> 暴露 <code>/api/finance/settlements</code> + <code>/api/finance/export</code></li>
          <li>对接 OTA 平台结算单 API（携程周结 / 飞猪月结 / 美团 T+7 / 抖音月结）</li>
          <li>真实应收 / 应付 / 佣金数据回填本页，前端无需改动</li>
        </ul>
      </div>
    </el-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download, Warning, Wallet } from '@element-plus/icons-vue'
import { channelList, type ChannelMeta } from '@/channels/adapters/registry'

// ========== 类型 ==========

interface ChannelSettlement {
  channelId: string
  orderCount: number
  nights: number
  sellingAmount: number
  baseAmount: number
  commissionRate: number
  commission: number
  netRevenue: number
}

interface OrderSettlement {
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

// ========== 筛选 ==========

const filters = reactive({
  month: '' as string | undefined,
  channelId: '' as string | undefined
})

const loading = ref(false)

const channelSettlements = ref<ChannelSettlement[]>([])
const orderSettlements = ref<OrderSettlement[]>([])

// ========== 统计 ==========

const stats = computed(() => {
  let monthRevenue = 0
  let monthBase = 0
  let monthCommission = 0
  let orderCount = orderSettlements.value.length
  for (const o of orderSettlements.value) {
    monthRevenue += o.sellingAmount
    monthBase += o.baseAmount
    monthCommission += o.commission
  }
  return {
    monthRevenue,
    monthBase,
    monthCommission,
    monthNet: monthRevenue - monthCommission,
    orderCount
  }
})

// ========== 数据生成（前端 mock 聚合） ==========

const SEED_CHANNELS = ['DIRECT', 'ctrip', 'fliggy', 'meituan', 'douyin', 'taobao']
const SEED_GUESTS = ['李雪', '王昊', '陈晓', '张伟', '刘洋', '黄敏', '杨光', '周凯', '吴婷', '钱涛']

function pick<T>(arr: T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length]
}

function genOrderId(i: number, channel: string): string {
  const prefix = channel === 'DIRECT' ? 'DIR' : channel.toUpperCase().slice(0, 2)
  return `${prefix}-${filters.month?.replace('-', '') || '202508'}-${String(i + 1).padStart(4, '0')}`
}

function buildMockData(): {
  channelSet: ChannelSettlement[]
  orderSet: OrderSettlement[]
} {
  const month = filters.month || '2025-08'
  const orderSet: OrderSettlement[] = []
  const channelMap = new Map<string, ChannelSettlement>()

  // 生成 30~50 笔订单
  const orderTotal = 30 + Math.floor(Math.random() * 20)
  for (let i = 0; i < orderTotal; i++) {
    const channel = pick(SEED_CHANNELS, i)
    // 筛选
    if (filters.channelId && channel !== filters.channelId) continue

    const checkInDay = 1 + Math.floor(Math.random() * 25)
    const nights = 1 + Math.floor(Math.random() * 5)
    const checkInDate = `${month}-${String(checkInDay).padStart(2, '0')}`
    const checkOutDay = checkInDay + nights
    const checkOutDate = `${month}-${String(Math.min(checkOutDay, 30)).padStart(2, '0')}`

    const sellingAmount = (500 + Math.floor(Math.random() * 1500)) * nights
    const baseAmount = Math.round(sellingAmount * (0.6 + Math.random() * 0.15))
    const commissionRate = channel === 'DIRECT' ? 0 : 0.08 + Math.random() * 0.07
    const commission = channel === 'DIRECT' ? 0 : Math.round(sellingAmount * commissionRate)
    const netRevenue = sellingAmount - commission
    const diff = sellingAmount - baseAmount - commission

    const order: OrderSettlement = {
      orderNo: genOrderId(i, channel),
      channelId: channel,
      checkInDate,
      checkOutDate,
      nights,
      guestName: pick(SEED_GUESTS, i),
      sellingAmount,
      baseAmount,
      commission,
      netRevenue,
      diff
    }
    orderSet.push(order)

    // 聚合到渠道
    let row = channelMap.get(channel)
    if (!row) {
      row = {
        channelId: channel,
        orderCount: 0,
        nights: 0,
        sellingAmount: 0,
        baseAmount: 0,
        commissionRate,
        commission: 0,
        netRevenue: 0
      }
      channelMap.set(channel, row)
    }
    row.orderCount += 1
    row.nights += nights
    row.sellingAmount += sellingAmount
    row.baseAmount += baseAmount
    row.commission += commission
    row.netRevenue += netRevenue
    row.commissionRate = row.commission / Math.max(row.sellingAmount, 1) // 加权
  }

  return {
    channelSet: Array.from(channelMap.values()).sort((a, b) => b.sellingAmount - a.sellingAmount),
    orderSet
  }
}

const reload = async () => {
  loading.value = true
  // 模拟异步延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  try {
    const { channelSet, orderSet } = buildMockData()
    channelSettlements.value = channelSet
    orderSettlements.value = orderSet
  } finally {
    loading.value = false
  }
}

const onFilterChange = () => {
  reload()
}

const onReset = () => {
  filters.month = ''
  filters.channelId = ''
  reload()
}

// ========== 导出 ==========

const exportCsv = () => {
  if (orderSettlements.value.length === 0) {
    ElMessage.warning('当前没有可导出的数据')
    return
  }
  const header = ['订单号', '渠道', '入住', '退房', '夜数', '客人', '卖价', '底价', '佣金', '实收', '差额']
  const rows = orderSettlements.value.map(o => [
    o.orderNo, o.channelId, o.checkInDate, o.checkOutDate,
    String(o.nights), o.guestName,
    o.sellingAmount.toFixed(2), o.baseAmount.toFixed(2),
    o.commission.toFixed(2), o.netRevenue.toFixed(2),
    o.diff.toFixed(2)
  ])
  // 加 BOM 让 Excel 正确识别 UTF-8
  const csv = '\uFEFF' + [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finance-${filters.month || 'all'}-${Date.now()}.csv`
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
const formatMoney = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

onMounted(() => {
  // 默认本月
  const now = new Date()
  filters.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  reload()
})

// channelList 已在模板里直接引用，无需 void 占位
</script>

<style scoped lang="scss">
.finance-manage {
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
.stat-row {
  .stat-card {
    :deep(.el-card__body) { padding: 16px 20px; }
    .stat-label { color: #909399; font-size: 13px; }
    .stat-value {
      font-size: 26px;
      font-weight: 700;
      margin: 4px 0;
      color: #303133;
    }
    .stat-sub { color: #909399; font-size: 12px; }
  }
  .text-warning { color: var(--el-color-warning); }
  .text-danger { color: var(--el-color-danger); }
  .text-success { color: var(--el-color-success); }
}
.filter-card {
  :deep(.el-card__body) { padding: 16px 20px; }
  .filter-form { margin-bottom: 0; }
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
.text-muted { color: #909399; }
.text-warning { color: var(--el-color-warning); }
.text-danger { color: var(--el-color-danger); }
.text-success { color: var(--el-color-success); }
.alert-content {
  font-size: 13px;
  line-height: 1.6;
  p { margin: 6px 0; }
  ul { margin: 6px 0 6px 24px; }
  code { background: #f5f7fa; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
}
</style>