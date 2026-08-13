<template>
  <div class="order-manage">
    <!-- 搜索表单 -->
    <div class="search-card linear-card mb-5">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="如 BK20260805005" clearable style="width: 170px" />
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="searchForm.customerName" placeholder="客户姓名" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="房间号">
          <el-input v-model="searchForm.roomNo" placeholder="如 101" clearable style="width: 130px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="待入住" value="pending" />
            <el-option label="已入住" value="checked_in" />
            <el-option label="已退房" value="checked_out" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="入住日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <button type="button" class="linear-btn linear-btn--primary" @click="handleSearch">搜索</button>
          <button type="button" class="linear-btn linear-btn--secondary" @click="handleReset">重置</button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar mb-4">
      <button type="button" class="linear-btn linear-btn--primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新建订单
      </button>
      <div class="spacer"></div>
      <span class="summary">
        共 {{ total }} 单 · 合计 <strong>¥{{ totalAmount.toLocaleString('zh-CN') }}</strong>
      </span>
    </div>

    <!-- 数据表格 -->
    <div class="linear-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="id"
      >
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="orderNo" label="订单号" width="160" />
        <el-table-column label="客户" width="180">
          <template #default="{ row }">
            <div class="customer-cell">
              <el-avatar :size="32" :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.customerName}`">
                {{ row.customerName.charAt(0) }}
              </el-avatar>
              <div>
                <div class="c-name">{{ row.customerName }}</div>
                <div class="c-phone">{{ row.customerPhone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="房间" width="130">
          <template #default="{ row }">
            <div>
              <div class="room-no">{{ row.roomNo }}</div>
              <div class="room-type">{{ getRoomTypeLabel(row.roomType) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="入住/退房" width="200">
          <template #default="{ row }">
            <div class="date-cell">
              <div>入住 <strong>{{ row.checkInDate }}</strong></div>
              <div>退房 <strong>{{ row.checkOutDate }}</strong></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="nights" label="夜数" width="70" />
        <el-table-column prop="guests" label="人数" width="70" />
        <el-table-column prop="totalAmount" label="总价" width="110">
          <template #default="{ row }">
            <strong class="amount">¥{{ row.totalAmount.toLocaleString('zh-CN') }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              @click="handleCheckIn(row)"
            >办理入住</el-button>
            <el-button
              v-if="row.status === 'checked_in'"
              type="primary"
              link
              @click="handleCheckOut(row)"
            >办理退房</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status !== 'checked_in'"
              type="danger"
              link
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="loadData"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="客户" prop="customerId">
          <el-select
            v-model="formData.customerId"
            placeholder="选择客户"
            filterable
            style="width: 100%"
            @change="onCustomerChange"
          >
            <el-option
              v-for="c in allCustomers"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="房间" prop="roomId">
          <el-select
            v-model="formData.roomId"
            placeholder="选择房间"
            filterable
            style="width: 100%"
            @change="onRoomChange"
          >
            <el-option
              v-for="r in availableRooms"
              :key="r.id"
              :label="`${r.roomNo} · ${getRoomTypeLabel(r.type)} · ¥${r.price}/晚`"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入住日期" prop="checkInDate">
              <el-date-picker
                v-model="formData.checkInDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择入住日期"
                style="width: 100%"
                @change="recalcNights"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="退房日期" prop="checkOutDate">
              <el-date-picker
                v-model="formData.checkOutDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择退房日期"
                style="width: 100%"
                @change="recalcNights"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入住人数" prop="guests">
              <el-input-number v-model="formData.guests" :min="1" :max="10" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预估总价">
              <div class="amount-preview">
                ¥{{ estimatedAmount.toLocaleString('zh-CN') }}
                <span class="amount-tip">({{ nights }} 夜 × ¥{{ selectedRoomPrice }})</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="isEdit" label="订单状态" prop="status">
          <el-select v-model="formData.status" placeholder="选择状态" style="width: 100%">
            <el-option label="待入住" value="pending" />
            <el-option label="已入住" value="checked_in" />
            <el-option label="已退房" value="checked_out" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="客户特殊要求等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <button type="button" class="linear-btn linear-btn--secondary" @click="dialogVisible = false">取消</button>
        <button type="button" class="linear-btn linear-btn--primary" :loading="submitLoading" @click="handleSubmit">确定</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getOrderList,
  createOrder,
  updateOrder,
  deleteOrder,
  checkInOrder,
  checkOutOrder,
  getAllRooms,
  getAllCustomers
} from '@/services/api'
import type {
  OrderInfo,
  OrderStatus,
  RoomInfo,
  RoomType,
  CustomerInfo
} from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref<OrderInfo[]>([])
const total = ref(0)
const totalAmount = ref(0)
const page = ref(1)
const pageSize = ref(10)

const allRooms = ref<RoomInfo[]>([])
const allCustomers = ref<CustomerInfo[]>([])

const dateRange = ref<[string, string] | null>(null)

const searchForm = reactive({
  orderNo: '',
  customerName: '',
  roomNo: '',
  status: undefined as OrderStatus | undefined,
  checkInDateFrom: undefined as string | undefined,
  checkInDateTo: undefined as string | undefined
})

const dialogVisible = ref(false)
const dialogTitle = ref('新建订单')
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive<Partial<OrderInfo>>({
  customerId: undefined,
  customerName: '',
  customerPhone: '',
  roomId: undefined,
  roomNo: '',
  roomType: 'single',
  checkInDate: '',
  checkOutDate: '',
  nights: 1,
  guests: 1,
  totalAmount: 0,
  status: 'pending',
  remark: ''
})

const formRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  roomId: [{ required: true, message: '请选择房间', trigger: 'change' }],
  checkInDate: [{ required: true, message: '请选择入住日期', trigger: 'change' }],
  checkOutDate: [{ required: true, message: '请选择退房日期', trigger: 'change' }],
  guests: [{ required: true, message: '请输入入住人数', trigger: 'blur' }]
}

const availableRooms = computed(() => {
  // 编辑时保留当前房间；新增时排除维修中和已入住的房间
  if (isEdit.value) return allRooms.value
  return allRooms.value.filter(r => r.status !== 'maintenance' && r.status !== 'occupied')
})

const nights = computed(() => {
  if (!formData.checkInDate || !formData.checkOutDate) return 0
  const inD = new Date(formData.checkInDate)
  const outD = new Date(formData.checkOutDate)
  return Math.max(0, Math.ceil((outD.getTime() - inD.getTime()) / 86400000))
})

const selectedRoomPrice = computed(() => {
  const r = allRooms.value.find(r => r.id === formData.roomId)
  return r?.price || 0
})

const estimatedAmount = computed(() => {
  return nights.value * selectedRoomPrice.value
})

onMounted(async () => {
  await Promise.all([loadRooms(), loadCustomers()])
  loadData()
})

const loadRooms = async () => {
  allRooms.value = await getAllRooms()
}

const loadCustomers = async () => {
  allCustomers.value = await getAllCustomers()
}

const loadData = async () => {
  loading.value = true
  try {
    const result = await getOrderList({
      page: page.value,
      pageSize: pageSize.value,
      orderNo: searchForm.orderNo || undefined,
      customerName: searchForm.customerName || undefined,
      roomNo: searchForm.roomNo || undefined,
      status: searchForm.status,
      checkInDateFrom: searchForm.checkInDateFrom,
      checkInDateTo: searchForm.checkInDateTo
    })
    tableData.value = result.list
    total.value = result.total
    totalAmount.value = result.list.reduce((s, o) => s + o.totalAmount, 0)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadData()
}

const handleReset = () => {
  searchForm.orderNo = ''
  searchForm.customerName = ''
  searchForm.roomNo = ''
  searchForm.status = undefined
  searchForm.checkInDateFrom = undefined
  searchForm.checkInDateTo = undefined
  dateRange.value = null
  page.value = 1
  loadData()
}

watch(dateRange, (v) => {
  if (v && Array.isArray(v) && v.length === 2) {
    searchForm.checkInDateFrom = v[0]
    searchForm.checkInDateTo = v[1]
  } else {
    searchForm.checkInDateFrom = undefined
    searchForm.checkInDateTo = undefined
  }
})

const onCustomerChange = (id: number) => {
  const c = allCustomers.value.find(c => c.id === id)
  if (c) {
    formData.customerName = c.name
    formData.customerPhone = c.phone
  }
}

const onRoomChange = (id: number) => {
  const r = allRooms.value.find(r => r.id === id)
  if (r) {
    formData.roomNo = r.roomNo
    formData.roomType = r.type
  }
}

const recalcNights = () => {
  formData.nights = nights.value
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新建订单'
  Object.assign(formData, {
    customerId: undefined,
    customerName: '',
    customerPhone: '',
    roomId: undefined,
    roomNo: '',
    roomType: 'single',
    checkInDate: '',
    checkOutDate: '',
    nights: 1,
    guests: 1,
    totalAmount: 0,
    status: 'pending',
    remark: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: OrderInfo) => {
  isEdit.value = true
  dialogTitle.value = `编辑订单 ${row.orderNo}`
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (nights.value <= 0) {
      ElMessage.error('退房日期必须晚于入住日期')
      return
    }
    submitLoading.value = true
    try {
      const payload = {
        ...formData,
        nights: nights.value,
        totalAmount: estimatedAmount.value
      }
      if (isEdit.value) {
        await updateOrder(formData.id!, payload)
        ElMessage.success('更新成功')
      } else {
        await createOrder(payload)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      // 重新加载房间（状态可能变化）
      await loadRooms()
      loadData()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
}

const handleCheckIn = (row: OrderInfo) => {
  ElMessageBox.confirm(`为 ${row.customerName} 办理 ${row.roomNo} 的入住吗？`, '办理入住', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success'
  }).then(async () => {
    try {
      await checkInOrder(row.id)
      ElMessage.success('入住办理成功')
      await loadRooms()
      loadData()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

const handleCheckOut = (row: OrderInfo) => {
  ElMessageBox.confirm(`为 ${row.customerName} 办理 ${row.roomNo} 的退房吗？`, '办理退房', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await checkOutOrder(row.id)
      ElMessage.success('退房办理成功')
      await loadRooms()
      loadData()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

const handleDelete = (row: OrderInfo) => {
  ElMessageBox.confirm(`确定要删除订单 ${row.orderNo} 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteOrder(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

// 工具函数
const getRoomTypeLabel = (t: RoomType) => {
  const map: Record<RoomType, string> = {
    single: '单人间', double: '双人间', family: '家庭房', suite: '套房', dorm: '青旅床位'
  }
  return map[t] || t
}

const getStatusLabel = (s: OrderStatus) => {
  const map: Record<OrderStatus, string> = {
    pending: '待支付',
    confirmed: '已确认',
    checked_in: '已入住',
    checked_out: '已退房',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
    no_show: '未到店'
  }
  return map[s] || s
}

const getStatusType = (s: OrderStatus): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  const map: Record<OrderStatus, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    confirmed: 'primary',
    checked_in: 'primary',
    checked_out: 'success',
    completed: 'info',
    cancelled: 'danger',
    refunded: 'danger',
    no_show: 'danger'
  }
  return map[s] || 'info'
}
</script>

<style scoped lang="scss">
.order-manage {
  .mb-4 { margin-bottom: 16px; }
  .mb-5 { margin-bottom: 20px; }

  .search-card { position: relative; overflow: hidden; }

  .action-bar {
    display: flex;
    gap: 12px;
    align-items: center;

    .spacer { flex: 1; }
    .summary {
      color: var(--text-secondary);
      font-size: 14px;
      strong { color: var(--text-primary); font-size: 16px; }
    }
  }

  .customer-cell {
    display: flex;
    align-items: center;
    gap: 10px;

    .c-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.2;
    }
    .c-phone {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.2;
    }
  }

  .room-no {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
  }
  .room-type {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.2;
  }

  .date-cell {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;

    strong {
      color: var(--text-primary);
      margin-left: 4px;
    }
  }

  .amount {
    color: #f56c6c;
    font-size: 15px;
  }

  .amount-preview {
    width: 100%;
    padding: 0 12px;
    line-height: 32px;
    font-size: 16px;
    font-weight: 600;
    color: #f56c6c;
    background: var(--surface);
    border-radius: 4px;

    .amount-tip {
      font-weight: normal;
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: 8px;
    }
  }
}
</style>