<template>
  <div class="rate-plan-manage">
    <!-- ========== 顶部 Hero ========== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><Money /></el-icon>
        <div class="hero-text">
          <h2>房价管理</h2>
          <p class="subtitle">基础价日历 · 按房型 × 日期设定每晚价格，支持单日改价与批量调价</p>
        </div>
        <div class="hero-actions">
          <el-tag v-if="lastSyncAt" type="success" effect="plain">
            最近同步：{{ formatTime(lastSyncAt) }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- ========== 筛选栏 ========== -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="房型">
          <el-select v-model="selectedRoomTypeId" placeholder="选择房型" style="width: 220px" @change="onRoomTypeChange">
            <el-option
              v-for="rt in roomTypes"
              :key="rt.id"
              :label="rt.name + ` · ¥${rt.basePrice}`"
              :value="rt.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="房价计划">
          <el-select
            v-model="selectedRatePlanId"
            placeholder="选择计划"
            style="width: 220px"
            :disabled="!selectedRoomTypeId || plans.length === 0"
            @change="loadCalendar"
          >
            <el-option
              v-for="p in plans"
              :key="String(p.id)"
              :label="planOptionLabel(p)"
              :value="p.id"
            />
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
          <el-button type="primary" :icon="Refresh" @click="loadAll" :loading="loading">刷新</el-button>
          <el-button :icon="Plus" type="success" @click="openPlanDialog()" :disabled="!selectedRoomTypeId">
            新建房价计划
          </el-button>
          <el-button :icon="MagicStick" :disabled="!selectedRoomTypeId || !selectedRatePlanId" @click="openBatchDialog">
            批量调价
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ========== 房价计划列表 ========== -->
    <el-card shadow="never" class="plan-card">
      <template #header>
        <div class="card-header">
          <span class="title">房价计划（{{ plans.length }}）</span>
          <span class="sub">每房型至少保留一个 base 计划；非 base 策略为扩展预留</span>
        </div>
      </template>
      <el-table :data="plans" v-loading="planLoading" stripe size="small" empty-text="该房型暂无房价计划，点击右上角“新建房价计划”">
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="策略" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.strategy === 'base' ? 'primary' : 'info'">
              {{ strategyLabel(row.strategy) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="基础价" width="110" align="right">
          <template #default="{ row }">
            <span :class="{ 'currency-other': row.price.currency !== 'CNY' }">
              {{ formatPrice(row.price.amount, row.price.currency) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="计价" width="80">
          <template #default="{ row }">
            <span class="text-muted">{{ pricingUnitLabel(row.pricingUnit) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="适用范围" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="row.scope === 'all' ? 'success' : 'warning'" effect="plain">
              {{ scopeLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">{{ row.priority }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openPlanDialog(row)">编辑</el-button>
            <el-button size="small" link @click="togglePlanActive(row)">
              {{ row.status === 1 ? '停用' : '启用' }}
            </el-button>
            <el-button size="small" link type="danger" @click="confirmDeletePlan(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ========== 价格日历网格 ========== -->
    <el-card v-loading="loading" shadow="never" class="calendar-card">
      <template #header>
        <div class="card-header">
          <span class="title">价格日历</span>
          <span class="sub">点击“编辑”修改当晚价格 / 备注</span>
        </div>
      </template>
      <template v-if="!selectedRoomTypeId">
        <el-empty description="请先选择房型" />
      </template>
      <template v-else-if="plans.length === 0">
        <el-empty description="该房型暂无房价计划，日历价格需要先创建计划后才能维护">
          <el-button type="primary" :icon="Plus" @click="openPlanDialog()">新建房价计划</el-button>
        </el-empty>
      </template>
      <template v-else-if="!selectedRatePlanId">
        <el-empty description="请选择要查看/编辑的房价计划" />
      </template>
      <template v-else>
        <div class="legend">
          <span class="legend-item"><span class="dot dot-base"></span>默认基础价</span>
          <span class="legend-item"><span class="dot dot-custom"></span>已覆盖</span>
          <span class="legend-item"><span class="dot dot-weekend"></span>周末</span>
        </div>

        <div class="calendar-scroll">
          <table class="calendar-table">
            <thead>
              <tr>
                <th class="date-col">日期</th>
                <th class="week-col">周</th>
                <th class="price-col">卖价</th>
                <th class="remark-col">备注</th>
                <th class="ops-col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="day in calendar"
                :key="day.date"
                :class="{
                  'is-weekend': isWeekend(day.date),
                  'is-past': isPast(day.date),
                  'is-custom': day.overridden
                }"
              >
                <td class="date-col">
                  <div class="date-main">{{ formatDate(day.date) }}</div>
                  <div class="date-sub" :class="{ 'is-today': isToday(day.date) }">
                    {{ isToday(day.date) ? '今天' : relativeDay(day.date) }}
                  </div>
                </td>
                <td class="week-col">{{ weekdayCN(day.date) }}</td>
                <td class="price-col">
                  <span class="price-value">
                    {{ formatPrice(day.price.amount, day.price.currency) }}
                  </span>
                  <span v-if="day.overridden" class="price-tag">已覆盖</span>
                </td>
                <td class="remark-col">
                  <span v-if="day.overrideReason" class="remark-text">{{ day.overrideReason }}</span>
                  <span v-else class="remark-empty">—</span>
                </td>
                <td class="ops-col">
                  <el-button size="small" :icon="Edit" @click="openDailyDialog(day)">编辑</el-button>
                  <el-button
                    v-if="day.overridden"
                    size="small"
                    type="danger"
                    plain
                    @click="confirmDeleteDaily(day)"
                  >
                    清除
                  </el-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </el-card>

    <!-- ========== 房价计划 - 新建/编辑 对话框 ========== -->
    <el-dialog
      v-model="planDialog.visible"
      :title="planDialog.editing ? '编辑房价计划' : '新建房价计划'"
      width="500px"
    >
      <el-form :model="planDialog.form" label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="planDialog.form.name" placeholder="例：标准价 / 周末价 / VIP 价" maxlength="50" />
        </el-form-item>
        <el-form-item label="策略">
          <el-select v-model="planDialog.form.strategy" style="width: 100%">
            <el-option v-for="s in STRATEGY_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格（元）">
          <el-input-number
            v-model="planDialog.form.priceYuan"
            :min="0"
            :max="999999"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="计价单位">
          <el-select v-model="planDialog.form.pricingUnit" style="width: 100%">
            <el-option v-for="p in PRICING_UNIT_OPTIONS" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用范围">
          <el-tag type="info" effect="plain">
            {{ currentRoomType ? `当前房型：${currentRoomType.name}` : '未选择房型' }}
          </el-tag>
          <span class="form-tip">后端模型为一条计划绑定一个房型；多房型关联上线前不提供"全部房型"</span>
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="planDialog.form.priority" :min="0" :max="999" />
          <span class="form-tip">高优先级覆盖低</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="planDialog.form.active" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="planDialog.form.description"
            type="textarea"
            :rows="2"
            maxlength="200"
            placeholder="可选：补充说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="planDialog.saving" @click="submitPlan">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 单日改价 对话框 ========== -->
    <el-dialog
      v-model="dailyDialog.visible"
      :title="`编辑 ${dailyDialog.date} 价格`"
      width="420px"
    >
      <el-form :model="dailyDialog.form" label-width="80px">
        <el-form-item label="卖价（元）">
          <el-input-number
            v-model="dailyDialog.form.priceYuan"
            :min="0"
            :max="99999"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="dailyDialog.form.remarks"
            type="textarea"
            :rows="3"
            placeholder="例：周末加价 / 节假日 / 装修补偿"
            maxlength="120"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dailyDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dailyDialog.saving" @click="submitDaily">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 批量调价 对话框 ========== -->
    <el-dialog v-model="batchDialog.visible" title="批量调价" width="500px">
      <el-form :model="batchDialog.form" label-width="90px">
        <el-form-item label="目标价（元）">
          <el-input-number
            v-model="batchDialog.form.priceYuan"
            :min="0"
            :max="99999"
            :step="10"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="batchDialog.form.startDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="batchDialog.form.endDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="跳过已覆盖">
          <el-switch v-model="batchDialog.form.skipOverridden" />
          <span class="form-tip">开启后只覆盖默认基础价日期</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="batchDialog.saving" @click="submitBatch">执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// reload-trigger 2026-08-15 07:23
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Money,
  Refresh,
  Plus,
  Edit,
  MagicStick
} from '@element-plus/icons-vue'
import type { ID } from '@/types/domain/common'
import type {
  RatePlan,
  RateStrategy,
  PricingUnit
} from '@/types/domain/rate'
import {
  listRoomTypes,
  listRatePlansByRoomType,
  createRatePlan,
  updateRatePlan,
  deleteRatePlan,
  queryRateCalendar,
  upsertDailyRate,
  deleteDailyRate,
  batchUpdateRates
} from '@/api/rate'
import type { RoomTypeBrief, DailyRate } from '@/api/rate'

// ========== 静态选项 ==========

const STRATEGY_OPTIONS: { label: string; value: RateStrategy }[] = [
  { label: '基础价', value: 'base' },
  { label: '周末加价', value: 'weekend' },
  { label: '节假日加价', value: 'holiday' },
  { label: '季节性', value: 'seasonal' },
  { label: '会员价', value: 'member' },
  { label: '渠道价', value: 'channel' },
  { label: '连住优惠', value: 'long_stay' },
  { label: '提前预订', value: 'early_bird' },
  { label: '最后一刻', value: 'last_minute' }
]

const PRICING_UNIT_OPTIONS: { label: string; value: PricingUnit }[] = [
  { label: '每晚', value: 'per_night' },
  { label: '每次入住', value: 'per_stay' },
  { label: '每人', value: 'per_person' },
  { label: '每间', value: 'per_room' }
]

function strategyLabel(s: RateStrategy): string {
  return STRATEGY_OPTIONS.find(o => o.value === s)?.label ?? s
}

function pricingUnitLabel(p: PricingUnit): string {
  return PRICING_UNIT_OPTIONS.find(o => o.value === p)?.label ?? p
}

function scopeLabel(plan: RatePlan): string {
  if (plan.scope === 'all') return '全部房型'
  if ('category' in plan.scope) return `分类:${plan.scope.category}`
  if ('roomTypeIds' in plan.scope) {
    const n = plan.scope.roomTypeIds.length
    return `${n} 个房型`
  }
  return '-'
}

// ========== 状态 ==========

const roomTypes = ref<RoomTypeBrief[]>([])
const selectedRoomTypeId = ref<ID | undefined>(undefined)
const dateRange = ref<30 | 60 | 90>(30)

const plans = ref<RatePlan[]>([])
const planLoading = ref(false)
/** 显式选中的计划：日历查询、单日改价、清除、批量调价都以它为上下文 */
const selectedRatePlanId = ref<ID | undefined>(undefined)

const calendar = ref<DailyRate[]>([])
const loading = ref(false)
const lastSyncAt = ref<string>('')

interface PlanForm {
  name: string
  strategy: RateStrategy
  priceYuan: number
  pricingUnit: PricingUnit
  priority: number
  active: boolean
  description: string
}

function blankPlanForm(): PlanForm {
  return {
    name: '标准价',
    strategy: 'base',
    // 默认价在 openPlanDialog 里用所选房型 basePrice 覆盖，不硬编码
    priceYuan: 0,
    pricingUnit: 'per_night',
    priority: 0,
    active: true,
    description: ''
  }
}

const planDialog = reactive({
  visible: false,
  saving: false,
  editing: false,
  editingId: undefined as ID | undefined,
  form: blankPlanForm()
})

const dailyDialog = reactive({
  visible: false,
  saving: false,
  date: '',
  form: {
    priceYuan: 0,
    remarks: ''
  }
})

const batchDialog = reactive({
  visible: false,
  saving: false,
  form: {
    priceYuan: 0,
    startDate: '',
    endDate: '',
    skipOverridden: false
  }
})

// ========== 计算属性 ==========

const currentRoomType = computed(() =>
  roomTypes.value.find(rt => String(rt.id) === String(selectedRoomTypeId.value))
)

const selectedPlan = computed(() =>
  plans.value.find(p => String(p.id) === String(selectedRatePlanId.value))
)

function planOptionLabel(p: RatePlan): string {
  const status = p.status === 1 ? '' : '（已停用）'
  return `${p.name} · ¥${(p.price.amount / 100).toLocaleString('zh-CN')}${status}`
}

// ========== 工具 ==========

function formatPrice(cents: number, currency: string = 'CNY'): string {
  const yuan = Math.round(cents) / 100
  const symbol = ({ CNY: '¥', USD: '$', EUR: '€', HKD: 'HK$', JPY: '¥' } as Record<string, string>)[currency] ?? ''
  return `${symbol}${yuan.toLocaleString('zh-CN')}`
}

function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100)
}

// ========== 加载 ==========

async function loadMeta() {
  roomTypes.value = await listRoomTypes()
  if (roomTypes.value.length > 0 && selectedRoomTypeId.value === undefined) {
    // 后端按名称/创建时间返回的第一种房型不一定已有房价计划；
    // 优先定位数据库中确实存在计划的房型，避免页面初始显示“房价计划（0）”。
    for (const roomType of roomTypes.value) {
      const existingPlans = await listRatePlansByRoomType(roomType.id)
      if (existingPlans.length > 0) {
        selectedRoomTypeId.value = roomType.id
        break
      }
    }
    if (selectedRoomTypeId.value === undefined) {
      selectedRoomTypeId.value = roomTypes.value[0].id
    }
  }
}

async function loadPlans() {
  if (selectedRoomTypeId.value === undefined) {
    plans.value = []
    selectedRatePlanId.value = undefined
    return
  }
  planLoading.value = true
  try {
    plans.value = await listRatePlansByRoomType(selectedRoomTypeId.value)
    // 自动选中第一个计划；无计划时保持空，由日历区展示创建引导（不隐式建计划）
    selectedRatePlanId.value = plans.value.length > 0 ? plans.value[0].id : undefined
  } catch (e: any) {
    // 保留原始错误，避免页面静默显示“0”掩盖真正接线问题。
    plans.value = []
    selectedRatePlanId.value = undefined
    ElMessage.error('加载房价计划失败：' + (e?.message || e))
  } finally {
    planLoading.value = false
  }
}

async function loadCalendar() {
  if (selectedRoomTypeId.value === undefined || selectedRatePlanId.value === undefined) {
    calendar.value = []
    return
  }
  loading.value = true
  try {
    const from = formatYMD(new Date())
    const to = formatYMD(addDays(new Date(), dateRange.value - 1))
    const cal = await queryRateCalendar({
      propertyId: currentRoomType.value?.propertyId as ID,
      roomTypeId: selectedRoomTypeId.value,
      ratePlanId: selectedRatePlanId.value,
      startDate: from,
      endDate: to
    })
    calendar.value = cal.rates
    lastSyncAt.value = new Date().toISOString()
  } catch (e: any) {
    ElMessage.error('加载价格日历失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  // 先载入计划（会重置 selectedRatePlanId），再按选中计划载入日历
  await loadPlans()
  await loadCalendar()
}

function onRoomTypeChange() {
  loadAll()
}

// ========== 房价计划 - 操作 ==========

function openPlanDialog(row?: RatePlan) {
  planDialog.editing = !!row
  planDialog.editingId = row?.id
  if (row) {
    planDialog.form = {
      name: row.name,
      strategy: row.strategy,
      priceYuan: row.price.amount / 100,
      pricingUnit: row.pricingUnit,
      priority: row.priority,
      active: row.status === 1,
      description: row.description ?? ''
    }
  } else {
    const rt = currentRoomType.value
    planDialog.form = blankPlanForm()
    // 默认价来自所选房型基础价（issue #5：不允许硬编码 888）
    if (rt) planDialog.form.priceYuan = rt.basePrice
  }
  planDialog.visible = true
}

async function submitPlan() {
  if (!planDialog.form.name.trim()) {
    ElMessage.warning('请输入计划名称')
    return
  }
  if (!selectedRoomTypeId.value || !currentRoomType.value) {
    ElMessage.warning('请先选择房型')
    return
  }

  planDialog.saving = true
  try {
    const payload: Partial<RatePlan> = {
      // 物业来自所选房型，不静默回退 propertyId=1
      propertyId: currentRoomType.value.propertyId,
      name: planDialog.form.name.trim(),
      strategy: planDialog.form.strategy,
      pricingUnit: planDialog.form.pricingUnit,
      price: { amount: yuanToCents(planDialog.form.priceYuan), currency: 'CNY' },
      priority: planDialog.form.priority,
      status: planDialog.form.active ? 1 : 0,
      description: planDialog.form.description.trim() || undefined,
      scope: { roomTypeIds: [selectedRoomTypeId.value] }
    }
    if (planDialog.editing) {
      await updateRatePlan(planDialog.editingId!, payload)
      ElMessage.success('房价计划已更新')
    } else {
      await createRatePlan(payload)
      ElMessage.success('房价计划已创建')
    }
    planDialog.visible = false
    await loadAll()
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || e))
  } finally {
    planDialog.saving = false
  }
}

async function togglePlanActive(row: RatePlan) {
  try {
    await updateRatePlan(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(row.status === 1 ? '已停用' : '已启用')
    await loadAll()
  } catch (e: any) {
    ElMessage.error('操作失败：' + (e?.message || e))
  }
}

async function confirmDeletePlan(row: RatePlan) {
  try {
    await ElMessageBox.confirm(
      `确认删除房价计划「${row.name}」？`,
      '删除确认',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await deleteRatePlan(row.id)
    ElMessage.success('已删除')
    await loadAll()
  } catch (e: any) {
    ElMessage.error('删除失败：' + (e?.message || e))
  }
}

// ========== 单日改价 - 操作 ==========

function openDailyDialog(day: DailyRate) {
  dailyDialog.date = day.date
  dailyDialog.form = {
    priceYuan: day.price.amount / 100,
    remarks: day.overrideReason || ''
  }
  dailyDialog.visible = true
}

async function submitDaily() {
  if (!selectedRoomTypeId.value || !selectedRatePlanId.value) {
    ElMessage.warning('请先选择房型和房价计划')
    return
  }
  dailyDialog.saving = true
  try {
    await upsertDailyRate({
      roomTypeId: selectedRoomTypeId.value,
      ratePlanId: selectedRatePlanId.value,
      date: dailyDialog.date,
      price: { amount: yuanToCents(dailyDialog.form.priceYuan), currency: 'CNY' },
      overrideReason: dailyDialog.form.remarks
    })
    ElMessage.success('已保存')
    dailyDialog.visible = false
    await loadCalendar()
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || e))
  } finally {
    dailyDialog.saving = false
  }
}

async function confirmDeleteDaily(day: DailyRate) {
  if (!selectedRatePlanId.value) {
    ElMessage.warning('请先选择房价计划')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认清除 ${day.date} 在当前计划下的价格覆盖？该日将恢复为房型基础价。`,
      '清除确认',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await deleteDailyRate(selectedRatePlanId.value, day.date)
    ElMessage.success('已清除')
    await loadCalendar()
  } catch (e: any) {
    ElMessage.error('清除失败：' + (e?.message || e))
  }
}

// ========== 批量调价 - 操作 ==========

function openBatchDialog() {
  if (!selectedRoomTypeId.value || !selectedRatePlanId.value) {
    ElMessage.warning('请先选择房型和房价计划')
    return
  }
  batchDialog.form = {
    // 默认目标价来自所选房型基础价或所选计划价（不硬编码 888）
    priceYuan: selectedPlan.value
      ? selectedPlan.value.price.amount / 100
      : currentRoomType.value?.basePrice ?? 0,
    startDate: formatYMD(new Date()),
    endDate: formatYMD(addDays(new Date(), 6)),
    skipOverridden: false
  }
  batchDialog.visible = true
}

async function submitBatch() {
  if (!selectedRoomTypeId.value || !selectedRatePlanId.value) {
    ElMessage.warning('请先选择房型和房价计划')
    return
  }
  if (!batchDialog.form.startDate || !batchDialog.form.endDate) {
    ElMessage.warning('请选择日期范围')
    return
  }
  if (batchDialog.form.startDate > batchDialog.form.endDate) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return
  }
  batchDialog.saving = true
  try {
    const result = await batchUpdateRates({
      roomTypeId: selectedRoomTypeId.value,
      ratePlanId: selectedRatePlanId.value,
      startDate: batchDialog.form.startDate,
      endDate: batchDialog.form.endDate,
      price: { amount: yuanToCents(batchDialog.form.priceYuan), currency: 'CNY' },
      skipOverridden: batchDialog.form.skipOverridden
    })
    ElMessage.success(`批量调价完成：新增 ${result.inserted} 天，更新 ${result.updated} 天，跳过 ${result.skipped} 天`)
    batchDialog.visible = false
    await loadCalendar()
  } catch (e: any) {
    ElMessage.error('批量调价失败：' + (e?.message || e))
  } finally {
    batchDialog.saving = false
  }
}

// ========== 日期工具 ==========

function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function formatDate(s: string): string {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatTime(s: string): string {
  const d = new Date(s)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function isToday(s: string): boolean {
  return s === formatYMD(new Date())
}

function isPast(s: string): boolean {
  return s < formatYMD(new Date())
}

function isWeekend(s: string): boolean {
  const wd = new Date(s).getDay()
  return wd === 0 || wd === 6
}

function weekdayCN(s: string): string {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(s).getDay()]
}

function relativeDay(s: string): string {
  const today = new Date(formatYMD(new Date())).getTime()
  const target = new Date(s).getTime()
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff > 0) return `${diff} 天后`
  return `${-diff} 天前`
}

// ========== 生命周期 ==========

onMounted(async () => {
  await loadMeta()
  await loadAll()
})
</script>

<style scoped lang="scss">
.rate-plan-manage {
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

.plan-card,
.calendar-card {
  :deep(.el-card__body) { padding: 14px 18px; }
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  .title { font-weight: 600; font-size: 14px; }
  .sub { color: var(--text-secondary); font-size: 12px; }
}

.form-tip {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.text-muted {
  color: var(--text-secondary);
}

.currency-other {
  color: #e6a23c;
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
.dot-base { background: var(--primary-color); }
.dot-custom { background: #67c23a; }
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
.calendar-table tr.is-custom {
  background: rgba(103, 194, 58, 0.06);
}

.date-col { width: 90px; }
.date-main { font-weight: 500; }
.date-sub { font-size: 11px; color: var(--text-secondary); }
.date-sub.is-today { color: var(--primary-color); font-weight: 600; }
.week-col { width: 36px; color: var(--text-secondary); }
.price-col { width: 150px; }
.price-value { font-weight: 600; }
.price-tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}
.remark-col { min-width: 120px; }
.remark-text { color: var(--text-secondary); }
.remark-empty { color: var(--text-placeholder); }
.ops-col { width: 170px; white-space: nowrap; }
</style>