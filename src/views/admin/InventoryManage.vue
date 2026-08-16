<template>
  <div class="inventory-manage">
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><Calendar /></el-icon>
        <div class="hero-text">
          <h2>库存房态</h2>
          <p class="subtitle">可视化房态图、关房、限量、平台分发</p>
        </div>
        <div class="hero-actions">
          <el-tag v-if="lastSyncAt" type="success" effect="plain">
            最近同步：{{ formatTime(lastSyncAt) }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="物业">
          <el-select v-model="selectedPropertyId" placeholder="全部物业" clearable style="width: 180px"
                     @change="onPropertyChange">
            <el-option v-for="p in properties" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="房型">
          <el-select v-model="selectedRoomTypeId" placeholder="选择房型" style="width: 220px" @change="loadCalendar">
            <el-option v-for="rt in filteredRoomTypes" :key="rt.id"
                       :label="rt.name + (rt.basePrice ? ` · ¥${rt.basePrice}` : '')" :value="rt.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="范围">
          <el-radio-group v-model="dateRange" @change="loadCalendar">
            <el-radio-button :value="30">30 天</el-radio-button>
            <el-radio-button :value="60">60 天</el-radio-button>
            <el-radio-button :value="90">90 天</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="loadCalendar" :loading="loading">刷新</el-button>
          <el-button :icon="Lock" @click="batchClose" :disabled="!selectedRoomTypeId">批量关房</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日历网格 -->
    <el-card v-loading="loading" shadow="never" class="calendar-card">
      <template v-if="!selectedRoomTypeId">
        <el-empty description="请先选择房型" />
      </template>
      <template v-else>
        <div class="legend">
          <span class="legend-item"><span class="dot dot-open"></span>可售</span>
          <span class="legend-item"><span class="dot dot-sold"></span>已售</span>
          <span class="legend-item"><span class="dot dot-blocked"></span>关房/维修</span>
          <span class="legend-item"><span class="dot dot-weekend"></span>周末</span>
        </div>

        <div class="calendar-scroll">
          <table class="calendar-table">
            <thead>
              <tr>
                <th class="date-col">日期</th>
                <th class="week-col">周</th>
                <th class="status-col">房态</th>
                <th class="rooms-col">总/可售</th>
                <th class="ops-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in calendar" :key="day.stayDate"
                  :class="{ 'is-weekend': isWeekend(day.stayDate), 'is-past': isPast(day.stayDate) }">
                <td class="date-col">
                  <div class="date-main">{{ formatDate(day.stayDate) }}</div>
                  <div class="date-sub" :class="{ 'is-today': isToday(day.stayDate) }">
                    {{ isToday(day.stayDate) ? '今天' : relativeDay(day.stayDate) }}
                  </div>
                </td>
                <td class="week-col">{{ weekdayCN(day.stayDate) }}</td>
                <td class="status-col">
                  <el-tag :type="statusTagType(day.status)" effect="dark" size="small">
                    {{ statusLabel(day.status) }}
                  </el-tag>
                </td>
                <td class="rooms-col">
                  <div class="rooms-numbers">
                    <span class="total">总 {{ day.totalRooms }}</span>
                    <span class="available"
                          :class="{ 'low': day.totalRooms - day.soldRooms - day.blockedRooms <= 1 }">
                      可售 {{ Math.max(day.totalRooms - day.soldRooms - day.blockedRooms, 0) }}
                    </span>
                  </div>
                  <div v-if="day.soldRooms > 0 || day.blockedRooms > 0" class="rooms-detail">
                    <span v-if="day.soldRooms > 0">已售 {{ day.soldRooms }}</span>
                    <span v-if="day.blockedRooms > 0">关 {{ day.blockedRooms }}</span>
                  </div>
                </td>
                <td class="ops-col">
                  <el-button v-if="day.status === 'OPEN'" size="small" type="danger" plain
                             @click="onToggleClose(day, true)">关房</el-button>
                  <el-button v-else size="small" type="success" plain
                             @click="onToggleClose(day, false)">开房</el-button>
                  <el-button size="small" :icon="Edit" @click="openEditDialog(day)">改库存</el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </el-card>

    <!-- 单日库存编辑对话框 -->
    <el-dialog v-model="editDialog.visible" :title="`编辑 ${editDialog.date} 库存`" width="420px">
      <el-form :model="editDialog.form" label-width="80px">
        <el-form-item label="总房间数">
          <el-input-number v-model="editDialog.form.totalRooms" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="已售数">
          <el-input-number v-model="editDialog.form.soldRooms" :min="0" :max="editDialog.form.totalRooms" />
        </el-form-item>
        <el-form-item label="关房数">
          <el-input-number v-model="editDialog.form.blockedRooms" :min="0"
                           :max="editDialog.form.totalRooms - editDialog.form.soldRooms" />
        </el-form-item>
        <el-form-item label="房态">
          <el-radio-group v-model="editDialog.form.status">
            <el-radio-button value="OPEN">可售</el-radio-button>
            <el-radio-button value="CLOSED">关房</el-radio-button>
            <el-radio-button value="MAINTENANCE">维修</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editDialog.form.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit" :loading="editDialog.saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量关房对话框 -->
    <el-dialog v-model="batchDialog.visible" title="批量关房" width="420px">
      <el-form :model="batchDialog.form" label-width="80px">
        <el-form-item label="开始日期">
          <el-date-picker v-model="batchDialog.form.startDate" type="date" value-format="YYYY-MM-DD"
                          style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="batchDialog.form.endDate" type="date" value-format="YYYY-MM-DD"
                          style="width: 100%" />
        </el-form-item>
        <el-form-item label="关房原因">
          <el-input v-model="batchDialog.form.reason" type="textarea" :rows="2"
                    placeholder="例：装修 / 包场 / 配合检查" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitBatchClose" :loading="batchDialog.saving">执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Calendar, Refresh, Lock, Edit } from '@element-plus/icons-vue'
import {
  getPropertyList,
  getRoomTypeList,
  getRoomCountByType,
  queryInventory,
  toggleCloseRoom,
  upsertInventory,
  type InventoryDay,
  type RoomTypeInfo,
  type PropertyBrief
} from '@/services/api'

// ========== 状态 ==========
const properties = ref<PropertyBrief[]>([])
const roomTypes = ref<RoomTypeInfo[]>([])
const selectedPropertyId = ref<number | undefined>()
const selectedRoomTypeId = ref<number | undefined>()
const dateRange = ref<30 | 60 | 90>(30)
const calendar = ref<InventoryDay[]>([])
const loading = ref(false)
const lastSyncAt = ref<string>('')

const editDialog = reactive({
  visible: false,
  saving: false,
  date: '',
  form: {
    totalRooms: 0,
    soldRooms: 0,
    blockedRooms: 0,
    status: 'OPEN' as 'OPEN' | 'CLOSED' | 'MAINTENANCE',
    remarks: ''
  }
})

const batchDialog = reactive({
  visible: false,
  saving: false,
  form: {
    startDate: '',
    endDate: '',
    reason: ''
  }
})

// 物业筛后的房型
const filteredRoomTypes = computed(() => {
  if (!selectedPropertyId.value) return roomTypes.value
  return roomTypes.value.filter(rt => rt.propertyId === selectedPropertyId.value)
})

// ========== 数据加载 ==========
async function loadMeta() {
  const [ps, rts] = await Promise.all([getPropertyList(), getRoomTypeList()])
  properties.value = ps
  roomTypes.value = rts
  // 默认选中第一个房型
  if (rts.length > 0 && !selectedRoomTypeId.value) {
    selectedRoomTypeId.value = rts[0].id
  }
  if (selectedRoomTypeId.value) await loadCalendar()
}

function onPropertyChange() {
  selectedRoomTypeId.value = undefined
  calendar.value = []
}

async function loadCalendar() {
  if (!selectedRoomTypeId.value) return
  loading.value = true
  try {
    const from = formatYMD(new Date())
    const to = formatYMD(addDays(new Date(), dateRange.value - 1))
    const [existing, totalRooms] = await Promise.all([
      queryInventory(selectedRoomTypeId.value, from, to),
      getRoomCountByType(selectedRoomTypeId.value)
    ])
    const existingDates = new Set(existing.map(item => item.stayDate))
    const missing: InventoryDay[] = []
    for (let i = 0; i < dateRange.value; i++) {
      const stayDate = formatYMD(addDays(new Date(), i))
      if (!existingDates.has(stayDate)) {
        missing.push({
          roomTypeId: selectedRoomTypeId.value,
          stayDate,
          totalRooms,
          soldRooms: 0,
          blockedRooms: 0,
          status: 'OPEN'
        })
      }
    }
    for (let i = 0; i < missing.length; i += 10) {
      await Promise.all(missing.slice(i, i + 10).map(item => upsertInventory(item)))
    }
    const ensured = { initialized: missing.length, totalRooms }
    const data = await queryInventory(selectedRoomTypeId.value, from, to)
    // 服务端会按真实房间数补齐范围；这里仍保留只读兜底，避免异常响应导致日历断档。
    const map = new Map(data.map(d => [d.stayDate, d]))
    const out: InventoryDay[] = []
    for (let i = 0; i < dateRange.value; i++) {
      const d = formatYMD(addDays(new Date(), i))
      if (map.has(d)) {
        out.push(map.get(d)!)
      } else {
        out.push({
          roomTypeId: selectedRoomTypeId.value,
          stayDate: d,
          totalRooms: ensured.totalRooms,
          soldRooms: 0,
          blockedRooms: 0,
          status: 'OPEN'
        })
      }
    }
    calendar.value = out
    if (ensured.initialized > 0) {
      ElMessage.success(`已按 ${ensured.totalRooms} 间真实房间初始化 ${ensured.initialized} 天库存`)
    }
    lastSyncAt.value = new Date().toISOString()
  } catch (e: any) {
    ElMessage.error('加载房态失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}

// ========== 操作 ==========
async function onToggleClose(day: InventoryDay, close: boolean) {
  try {
    await toggleCloseRoom(day.roomTypeId, day.stayDate, close)
    ElMessage.success(close ? '已关房' : '已开房')
    day.status = close ? 'CLOSED' : 'OPEN'
  } catch (e: any) {
    ElMessage.error('操作失败：' + (e?.message || e))
  }
}

function openEditDialog(day: InventoryDay) {
  editDialog.date = day.stayDate
  editDialog.form = {
    totalRooms: day.totalRooms || 0,
    soldRooms: day.soldRooms || 0,
    blockedRooms: day.blockedRooms || 0,
    status: day.status as any,
    remarks: day.remarks || ''
  }
  editDialog.visible = true
}

async function submitEdit() {
  if (!selectedRoomTypeId.value) return
  editDialog.saving = true
  try {
    await upsertInventory({
      roomTypeId: selectedRoomTypeId.value,
      stayDate: editDialog.date,
      totalRooms: editDialog.form.totalRooms,
      soldRooms: editDialog.form.soldRooms,
      blockedRooms: editDialog.form.blockedRooms,
      status: editDialog.form.status,
      remarks: editDialog.form.remarks
    })
    ElMessage.success('已保存')
    editDialog.visible = false
    await loadCalendar()
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || e))
  } finally {
    editDialog.saving = false
  }
}

function batchClose() {
  batchDialog.form = {
    startDate: formatYMD(new Date()),
    endDate: formatYMD(addDays(new Date(), 6)),
    reason: ''
  }
  batchDialog.visible = true
}

async function submitBatchClose() {
  if (!selectedRoomTypeId.value) return
  if (!batchDialog.form.startDate || !batchDialog.form.endDate) {
    ElMessage.warning('请选择日期范围')
    return
  }
  if (batchDialog.form.startDate > batchDialog.form.endDate) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return
  }
  await ElMessageBox.confirm(
    `确认将该房型 ${batchDialog.form.startDate} 至 ${batchDialog.form.endDate} 全部关房？`,
    '批量关房确认',
    { type: 'warning' }
  ).catch(() => { throw new Error('cancelled') })

  batchDialog.saving = true
  try {
    const start = new Date(batchDialog.form.startDate)
    const end = new Date(batchDialog.form.endDate)
    let cur = new Date(start)
    while (cur <= end) {
      await toggleCloseRoom(selectedRoomTypeId.value, formatYMD(cur), true)
      cur = addDays(cur, 1)
    }
    ElMessage.success(`已关房 ${Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1} 天`)
    batchDialog.visible = false
    await loadCalendar()
  } catch (e: any) {
    if (e?.message !== 'cancelled') {
      ElMessage.error('批量关房失败：' + (e?.message || e))
    }
  } finally {
    batchDialog.saving = false
  }
}

// ========== 工具 ==========
function formatYMD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function formatDate(s: string) {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function formatTime(s: string) {
  const d = new Date(s)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}
function isToday(s: string) {
  return s === formatYMD(new Date())
}
function isPast(s: string) {
  return s < formatYMD(new Date())
}
function isWeekend(s: string) {
  const wd = new Date(s).getDay()
  return wd === 0 || wd === 6
}
function weekdayCN(s: string) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(s).getDay()]
}
function relativeDay(s: string) {
  const today = new Date(formatYMD(new Date())).getTime()
  const target = new Date(s).getTime()
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff > 0) return `${diff} 天后`
  return `${-diff} 天前`
}
function statusLabel(s: string) {
  return ({ OPEN: '可售', CLOSED: '关房', MAINTENANCE: '维修' } as any)[s] || s
}
function statusTagType(s: string): 'success' | 'danger' | 'warning' {
  return ({ OPEN: 'success', CLOSED: 'danger', MAINTENANCE: 'warning' } as any)[s] || 'info'
}

onMounted(async () => {
  await loadMeta()
})
</script>

<style scoped lang="scss">
.inventory-manage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card {
  :deep(.el-card__body) { padding: 18px 20px; }
}
.hero-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hero-text {
  flex: 1;
  h2 { margin: 0 0 2px; font-size: 18px; }
  .subtitle { margin: 0; color: var(--text-secondary); font-size: 13px; }
}

.filter-card {
  :deep(.el-card__body) { padding: 14px 18px; }
}
.filter-form { margin-bottom: 0; }
.filter-form :deep(.el-form-item) { margin-bottom: 0; }

.calendar-card {
  :deep(.el-card__body) { padding: 14px 18px; }
}
.legend {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.dot-open { background: #67c23a; }
.dot-sold { background: #e6a23c; }
.dot-blocked { background: #f56c6c; }
.dot-weekend { background: #909399; }

.calendar-scroll {
  overflow-x: auto;
  max-height: 60vh;
}
.calendar-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.calendar-table th,
.calendar-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color-lighter, #ebeef5);
  text-align: left;
}
.calendar-table thead th {
  background: var(--bg-color-page, #fafafa);
  font-weight: 600;
  color: var(--text-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}
.calendar-table tr.is-weekend {
  background: rgba(144, 147, 153, 0.04);
}
.calendar-table tr.is-past {
  opacity: 0.55;
}

.date-col { width: 90px; }
.date-main { font-weight: 500; }
.date-sub { font-size: 11px; color: var(--text-secondary); }
.date-sub.is-today { color: var(--primary-color); font-weight: 600; }
.week-col { width: 36px; color: var(--text-secondary); }
.status-col { width: 80px; }
.rooms-col { width: 130px; }
.rooms-numbers { display: flex; gap: 8px; }
.total { color: var(--text-secondary); font-size: 12px; }
.available { font-weight: 600; }
.available.low { color: #f56c6c; }
.rooms-detail { font-size: 11px; color: var(--text-secondary); margin-top: 2px; display: flex; gap: 8px; }
.ops-col { width: 160px; white-space: nowrap; }
</style>
