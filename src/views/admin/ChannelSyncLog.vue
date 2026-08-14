<template>
  <div class="sync-log">
    <!-- ========== 顶部 Hero ========== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><Document /></el-icon>
        <div class="hero-text">
          <h2>渠道同步日志</h2>
          <p class="subtitle">OTA 渠道（携程 / 飞猪 / 美团 / 抖音 / 淘宝）推送 / 拉取 操作的执行轨迹</p>
        </div>
        <div class="hero-actions">
          <el-tag type="info" effect="plain">共 {{ total }} 条记录</el-tag>
          <el-tag v-if="successRate >= 0" :type="successRate >= 0.9 ? 'success' : 'warning'" effect="plain">
            成功率 {{ (successRate * 100).toFixed(1) }}%
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- ========== 筛选栏 ========== -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="渠道">
          <el-select v-model="filters.channelId" placeholder="全部渠道" style="width: 180px" clearable @change="onSearch">
            <el-option
              v-for="m in channelList"
              :key="m.id"
              :label="m.displayName"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部类型" style="width: 180px" clearable @change="onSearch">
            <el-option v-for="t in TYPE_OPTIONS" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" style="width: 160px" clearable @change="onSearch">
            <el-option v-for="s in STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发方式">
          <el-select v-model="filters.trigger" placeholder="全部" style="width: 140px" clearable @change="onSearch">
            <el-option label="手动" value="manual" />
            <el-option label="自动" value="auto" />
            <el-option label="Webhook" value="webhook" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch" :loading="loading">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
          <el-button :icon="Plus" @click="simulateSync">模拟一次推送</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ========== 同步日志表格 ========== -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">同步日志</span>
          <span class="sub">点击"详情"查看请求 / 响应 / 错误堆栈</span>
        </div>
      </template>
      <el-table
        :data="rows"
        v-loading="loading"
        stripe
        border
        size="small"
        empty-text="暂无同步日志"
      >
        <el-table-column prop="id" label="ID" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="log-id">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="渠道" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="channelTagType(row.channelId)">
              {{ channelLabel(row.channelId) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发" width="80">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" type="info">
              {{ triggerLabel(row.trigger) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.durationMs !== undefined" :class="{ 'slow': row.durationMs > 1000 }">
              {{ row.durationMs }} ms
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="错误" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.errorMessage" class="text-error">{{ row.errorMessage }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            <span class="text-muted">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
        @current-change="loadRows"
        @size-change="loadRows"
      />
    </el-card>

    <!-- ========== 详情对话框 ========== -->
    <el-dialog v-model="detail.visible" title="同步日志详情" width="640px">
      <el-descriptions v-if="detail.row" :column="2" border size="small">
        <el-descriptions-item label="日志 ID">{{ detail.row.id }}</el-descriptions-item>
        <el-descriptions-item label="渠道">{{ channelLabel(detail.row.channelId) }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeLabel(detail.row.type) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detail.row.status) }}</el-descriptions-item>
        <el-descriptions-item label="触发方式">{{ triggerLabel(detail.row.trigger) }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ detail.row.durationMs ?? '—' }} ms</el-descriptions-item>
        <el-descriptions-item :span="2" label="时间">{{ formatTime(detail.row.createdAt) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.row.errorMessage" :span="2" label="错误信息">
          <span class="text-error">{{ detail.row.errorMessage }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.row.errorStack" :span="2" label="错误堆栈">
          <pre class="code-block">{{ detail.row.errorStack }}</pre>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.row.request" :span="2" label="请求 payload">
          <pre class="code-block">{{ JSON.stringify(detail.row.request, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.row.response" :span="2" label="响应">
          <pre class="code-block">{{ JSON.stringify(detail.row.response, null, 2) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Plus, Document } from '@element-plus/icons-vue'
import { channelList } from '@/channels/adapters/registry'
import {
  mockGetChannelSyncLogs,
  mockAppendSyncLog
} from '@/services/mock'
import type {
  ChannelSyncLog,
  ChannelId,
  SyncLogType,
  SyncLogStatus
} from '@/types/domain/channel'
import type { PageResult, ISODateTime } from '@/types/domain/common'

// ========== 常量 ==========

const TYPE_OPTIONS: Array<{ value: SyncLogType; label: string }> = [
  { value: 'inventory_push', label: '库存推送' },
  { value: 'rate_push', label: '价格推送' },
  { value: 'order_pull', label: '订单拉取' },
  { value: 'order_confirm', label: '订单确认' },
  { value: 'order_cancel', label: '订单取消' }
]

const STATUS_OPTIONS: Array<{ value: SyncLogStatus; label: string }> = [
  { value: 'pending', label: '等待中' },
  { value: 'running', label: '执行中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'partial', label: '部分成功' }
]

const TYPE_LABEL: Record<SyncLogType, string> = {
  inventory_push: '库存推送',
  rate_push: '价格推送',
  order_pull: '订单拉取',
  order_confirm: '订单确认',
  order_cancel: '订单取消'
}

const STATUS_LABEL: Record<SyncLogStatus, string> = {
  pending: '等待中',
  running: '执行中',
  success: '成功',
  failed: '失败',
  partial: '部分成功'
}

const TRIGGER_LABEL: Record<'auto' | 'manual' | 'webhook', string> = {
  auto: '自动',
  manual: '手动',
  webhook: 'Webhook'
}

// ========== 状态 ==========

const filters = reactive({
  channelId: '' as ChannelId | '',
  type: '' as SyncLogType | '',
  status: '' as SyncLogStatus | '',
  trigger: '' as '' | 'auto' | 'manual' | 'webhook',
  dateRange: [] as string[]
})

const pagination = reactive({
  current: 1,
  size: 20
})

const rows = ref<ChannelSyncLog[]>([])
const total = ref(0)
const loading = ref(false)

const detail = reactive({
  visible: false,
  row: null as ChannelSyncLog | null
})

// ========== 计算属性 ==========

const successRate = computed(() => {
  if (total.value === 0) return -1
  // 当前页内 success / total 比率（前端粗估，正式实现走 channelService.getChannelStats）
  const succ = rows.value.filter(r => r.status === 'success').length
  return succ / rows.value.length
})

// ========== 加载 ==========

const loadRows = async () => {
  loading.value = true
  try {
    const res: PageResult<ChannelSyncLog> = mockGetChannelSyncLogs({
      channelId: filters.channelId || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      startDate: filters.dateRange[0] || undefined,
      endDate: filters.dateRange[1] || undefined,
      page: pagination.current,
      pageSize: pagination.size
    })
    // trigger 是前端筛选（mockGetChannelSyncLogs 不支持）
    let data = res.list
    if (filters.trigger) data = data.filter(r => r.trigger === filters.trigger)
    rows.value = data
    total.value = res.total
  } catch (e) {
    ElMessage.error('加载同步日志失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  pagination.current = 1
  loadRows()
}

const onReset = () => {
  filters.channelId = ''
  filters.type = ''
  filters.status = ''
  filters.trigger = ''
  filters.dateRange = []
  pagination.current = 1
  loadRows()
}

// ========== 模拟一次推送（Phase 2 mock 演练用） ==========

const simulateSync = () => {
  const channels: ChannelId[] = channelList.map(c => c.id)
  if (channels.length === 0) {
    ElMessage.warning('未配置任何渠道')
    return
  }
  const channelId = channels[Math.floor(Math.random() * channels.length)]
  const types: SyncLogType[] = ['inventory_push', 'rate_push', 'order_pull']
  const type = types[Math.floor(Math.random() * types.length)]
  const ok = Math.random() > 0.3
  const log: ChannelSyncLog = {
    id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channelId,
    type,
    status: ok ? 'success' : 'failed',
    trigger: 'manual',
    durationMs: Math.floor(Math.random() * 800) + 50,
    errorMessage: ok ? undefined : '模拟连接超时（mock）',
    response: ok ? { ok: true, action: type, ts: Date.now() } : undefined,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
  }
  mockAppendSyncLog(log)
  ElMessage.success(`已模拟${TYPE_LABEL[type]}（${ok ? '成功' : '失败'}）`)
  loadRows()
}

// ========== 详情 ==========

const showDetail = (row: ChannelSyncLog) => {
  detail.row = row
  detail.visible = true
}

// ========== 辅助 ==========

const channelLabel = (id: ChannelId) => {
  return channelList.find(c => c.id === id)?.displayName || id
}
const channelTagType = (id: ChannelId): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  const m = channelList.find(c => c.id === id)
  // 简单按颜色映射
  switch (m?.id) {
    case 'ctrip': return 'primary'
    case 'fliggy': return 'warning'
    case 'meituan': return 'success'
    case 'douyin': return 'danger'
    case 'taobao': return 'info'
    default: return 'info'
  }
}
const typeLabel = (t: SyncLogType) => TYPE_LABEL[t] || t
const statusLabel = (s: SyncLogStatus) => STATUS_LABEL[s] || s
const statusTagType = (s: SyncLogStatus): 'success' | 'warning' | 'danger' | 'info' => {
  switch (s) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'partial': return 'warning'
    case 'running': return 'warning'
    case 'pending': return 'info'
    default: return 'info'
  }
}
const triggerLabel = (t: 'auto' | 'manual' | 'webhook') => TRIGGER_LABEL[t] || t
const formatTime = (iso?: string) => {
  if (!iso) return ''
  return iso.length > 19 ? iso.slice(0, 19).replace('T', ' ') : iso
}

onMounted(() => {
  // 首次加载：若没有 mock 数据，主动播种几条演示日志
  seedDemoLogsIfEmpty()
  loadRows()
})

const seedDemoLogsIfEmpty = () => {
  const cur = mockGetChannelSyncLogs({ page: 1, pageSize: 1 })
  if (cur.total > 0) return
  const now = Date.now()
  const demo: ChannelSyncLog[] = [
    {
      id: `sl-${now - 60000}-01`,
      channelId: 'ctrip',
      type: 'inventory_push',
      status: 'success',
      trigger: 'manual',
      durationMs: 312,
      response: { pushedDates: 14, ok: true },
      createdAt: new Date(now - 60000).toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
    },
    {
      id: `sl-${now - 120000}-02`,
      channelId: 'fliggy',
      type: 'rate_push',
      status: 'success',
      trigger: 'auto',
      durationMs: 245,
      response: { pushedDates: 7, ok: true },
      createdAt: new Date(now - 120000).toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
    },
    {
      id: `sl-${now - 180000}-03`,
      channelId: 'meituan',
      type: 'order_pull',
      status: 'failed',
      trigger: 'manual',
      durationMs: 1240,
      errorMessage: 'HTTP 500: 美团 PMS 网关超时',
      errorStack: 'com.xkzoom.pms.exception.BusinessException: ...\n\tat ChannelAdapter.meituan.pullOrders(...)',
      createdAt: new Date(now - 180000).toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
    },
    {
      id: `sl-${now - 300000}-04`,
      channelId: 'douyin',
      type: 'inventory_push',
      status: 'partial',
      trigger: 'auto',
      durationMs: 856,
      response: { pushedDates: 10, failedDates: 2 },
      errorMessage: '2 天推送失败（库存为零）',
      createdAt: new Date(now - 300000).toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
    },
    {
      id: `sl-${now - 600000}-05`,
      channelId: 'taobao',
      type: 'order_confirm',
      status: 'success',
      trigger: 'webhook',
      durationMs: 156,
      response: { orderId: 'TB-20260814-0001', confirmed: true },
      createdAt: new Date(now - 600000).toISOString().slice(0, 19).replace('T', ' ') as ISODateTime
    }
  ]
  demo.forEach(d => mockAppendSyncLog(d))
}

// channelList 已在模板里直接引用，无需 void 占位
</script>

<style scoped lang="scss">
.sync-log {
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
  .hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }
}
.filter-card {
  :deep(.el-card__body) { padding: 16px 20px; }
  .filter-form { margin-bottom: 0; }
}
.table-card {
  :deep(.el-card__body) { padding: 16px 20px 8px; }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .title { font-weight: 600; }
    .sub { color: #909399; font-size: 12px; }
  }
  .pagination { margin-top: 14px; justify-content: flex-end; }
  .log-id { font-family: monospace; font-size: 12px; color: #606266; }
  .slow { color: var(--el-color-warning); font-weight: 600; }
}
.text-muted { color: #909399; }
.text-error { color: var(--el-color-danger); }
.code-block {
  margin: 0;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>