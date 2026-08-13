<template>
  <div class="room-manage">
    <!-- 搜索表单 -->
    <div class="search-card linear-card mb-5">
      <el-form :model="searchForm" inline>
        <el-form-item label="房间号">
          <el-input v-model="searchForm.roomNo" placeholder="请输入房间号" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="房型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 130px">
            <el-option label="单人间" value="single" />
            <el-option label="双人间" value="double" />
            <el-option label="家庭房" value="family" />
            <el-option label="套房" value="suite" />
            <el-option label="青旅床位" value="dorm" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="空闲" value="vacant" />
            <el-option label="已入住" value="occupied" />
            <el-option label="打扫中" value="cleaning" />
            <el-option label="维修中" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="楼层">
          <el-input-number v-model="searchForm.floor" :min="1" :max="20" controls-position="right" style="width: 110px" />
        </el-form-item>
        <el-form-item>
          <button type="button" class="linear-btn linear-btn--primary" @click="handleSearch">搜索</button>
          <button type="button" class="linear-btn linear-btn--secondary" @click="handleReset">重置</button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar mb-4">
      <button type="button" class="linear-btn linear-btn--primary" @click="handleAdd">新增房间</button>
      <button type="button" class="linear-btn linear-btn--secondary" :disabled="!selectedRows.length" @click="handleBatchDelete">
        批量删除 ({{ selectedRows.length }})
      </button>
      <div class="spacer"></div>
      <span class="summary">共 {{ total }} 间</span>
    </div>

    <!-- 数据表格 -->
    <div class="linear-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        @selection-change="handleSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column type="index" label="#" width="60" />
        <el-table-column label="房间" width="240">
          <template #default="{ row }">
            <div class="room-cell">
              <el-image
                :src="row.cover"
                fit="cover"
                class="room-thumb"
                lazy
              >
                <template #error>
                  <div class="room-thumb-fallback">
                    <el-icon :size="20"><House /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="room-meta">
                <div class="room-no">{{ row.roomNo }}</div>
                <div class="room-desc">{{ row.description || '—' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="房型" width="110">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" effect="plain">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="floor" label="楼层" width="80" />
        <el-table-column prop="capacity" label="可住" width="80">
          <template #default="{ row }">{{ row.capacity }} 人</template>
        </el-table-column>
        <el-table-column prop="area" label="面积" width="90">
          <template #default="{ row }">{{ row.area }} ㎡</template>
        </el-table-column>
        <el-table-column prop="price" label="单价/晚" width="110">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="设施" min-width="180">
          <template #default="{ row }">
            <el-tag
              v-for="f in row.facilities.slice(0, 4)"
              :key="f"
              size="small"
              effect="plain"
              class="facility-tag"
            >{{ f }}</el-tag>
            <el-tag v-if="row.facilities.length > 4" size="small" type="info" effect="plain">
              +{{ row.facilities.length - 4 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
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
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="房间号" prop="roomNo">
              <el-input v-model="formData.roomNo" placeholder="如 101" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="楼层" prop="floor">
              <el-input-number v-model="formData.floor" :min="1" :max="20" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="房型" prop="type">
              <el-select v-model="formData.type" placeholder="请选择" style="width: 100%">
                <el-option label="单人间" value="single" />
                <el-option label="双人间" value="double" />
                <el-option label="家庭房" value="family" />
                <el-option label="套房" value="suite" />
                <el-option label="青旅床位" value="dorm" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择" style="width: 100%">
                <el-option label="空闲" value="vacant" />
                <el-option label="打扫中" value="cleaning" />
                <el-option label="维修中" value="maintenance" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="可住人数" prop="capacity">
              <el-input-number v-model="formData.capacity" :min="1" :max="10" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面积(㎡)" prop="area">
              <el-input-number v-model="formData.area" :min="5" :max="500" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="单价/晚" prop="price">
          <el-input-number v-model="formData.price" :min="0" :step="10" controls-position="right" style="width: 100%">
            <template #prefix>¥</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="配套设施">
          <el-select
            v-model="formData.facilities"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="可手动输入新设施"
            style="width: 100%"
          >
            <el-option label="WiFi" value="WiFi" />
            <el-option label="空调" value="空调" />
            <el-option label="电视" value="电视" />
            <el-option label="独卫" value="独卫" />
            <el-option label="浴缸" value="浴缸" />
            <el-option label="小冰箱" value="小冰箱" />
            <el-option label="阳台" value="阳台" />
            <el-option label="观景阳台" value="观景阳台" />
            <el-option label="客厅" value="客厅" />
            <el-option label="厨房" value="厨房" />
            <el-option label="共用卫浴" value="共用卫浴" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面图">
          <el-input v-model="formData.cover" placeholder="图片 URL，可留空" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="房间特色描述" />
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { House } from '@element-plus/icons-vue'
import { getRoomList, createRoom, updateRoom, deleteRoom } from '@/services/api'
import type { RoomInfo, RoomType, RoomStatus } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const route = useRoute()

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref<RoomInfo[]>([])
const selectedRows = ref<RoomInfo[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const searchForm = reactive({
  roomNo: '',
  type: undefined as RoomType | undefined,
  status: undefined as RoomStatus | undefined,
  floor: undefined as number | undefined
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增房间')
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive<Partial<RoomInfo>>({
  roomNo: '',
  type: 'single',
  floor: 1,
  capacity: 1,
  price: 0,
  area: 20,
  facilities: ['WiFi', '空调'],
  status: 'vacant',
  description: '',
  cover: ''
})

const formRules: FormRules = {
  roomNo: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  type: [{ required: true, message: '请选择房型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  floor: [{ required: true, message: '请输入楼层', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入可住人数', trigger: 'blur' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'blur' }]
}

// 从 URL query 同步状态搜索
watch(
  () => route.query.status,
  (v) => {
    if (typeof v === 'string' && ['vacant', 'occupied', 'cleaning', 'maintenance'].includes(v)) {
      searchForm.status = v as RoomStatus
      page.value = 1
      loadData()
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await getRoomList({
      page: page.value,
      pageSize: pageSize.value,
      roomNo: searchForm.roomNo || undefined,
      type: searchForm.type,
      status: searchForm.status,
      floor: searchForm.floor
    })
    tableData.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadData()
}

const handleReset = () => {
  searchForm.roomNo = ''
  searchForm.type = undefined
  searchForm.status = undefined
  searchForm.floor = undefined
  page.value = 1
  loadData()
}

const handleSelectionChange = (selection: RoomInfo[]) => {
  selectedRows.value = selection
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增房间'
  Object.assign(formData, {
    roomNo: '',
    type: 'single',
    floor: 1,
    capacity: 1,
    price: 0,
    area: 20,
    facilities: ['WiFi', '空调'],
    status: 'vacant',
    description: '',
    cover: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: RoomInfo) => {
  isEdit.value = true
  dialogTitle.value = `编辑房间 ${row.roomNo}`
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      if (isEdit.value) {
        await updateRoom(formData.id!, formData)
        ElMessage.success('更新成功')
      } else {
        await createRoom(formData)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadData()
    } finally {
      submitLoading.value = false
    }
  })
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
}

const handleDelete = (row: RoomInfo) => {
  ElMessageBox.confirm(`确定要删除房间 ${row.roomNo} 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteRoom(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 间房间吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    let success = 0
    let fail = 0
    for (const r of selectedRows.value) {
      try {
        await deleteRoom(r.id)
        success++
      } catch {
        fail++
      }
    }
    ElMessage.success(`已删除 ${success} 间${fail ? `，${fail} 间失败` : ''}`)
    selectedRows.value = []
    loadData()
  }).catch(() => {})
}

// 工具函数
const getTypeLabel = (t: RoomType) => {
  const map: Record<RoomType, string> = {
    single: '单人间',
    double: '双人间',
    family: '家庭房',
    suite: '套房',
    dorm: '青旅床位'
  }
  return map[t] || t
}

const getTypeTag = (t: RoomType): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  const map: Record<RoomType, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    single: 'info',
    double: 'primary',
    family: 'warning',
    suite: 'danger',
    dorm: 'success'
  }
  return map[t] || 'info'
}

const getStatusLabel = (s: RoomStatus) => {
  const map: Record<RoomStatus, string> = {
    vacant: '空闲',
    occupied: '已入住',
    cleaning: '打扫中',
    maintenance: '维修中',
    out_of_order: '停用'
  }
  return map[s] || s
}

const getStatusType = (s: RoomStatus): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  const map: Record<RoomStatus, 'success' | 'primary' | 'warning' | 'danger' | 'info'> = {
    vacant: 'success',
    occupied: 'primary',
    cleaning: 'warning',
    maintenance: 'danger',
    out_of_order: 'info'
  }
  return map[s] || 'info'
}
</script>

<style scoped lang="scss">
.room-manage {
  .mb-4 { margin-bottom: 16px; }
  .mb-5 { margin-bottom: 20px; }

  .search-card { position: relative; overflow: hidden; }

  .action-bar {
    display: flex;
    gap: 12px;
    align-items: center;

    .spacer { flex: 1; }
    .summary { color: var(--text-secondary); font-size: 14px; }
  }

  .room-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;

    .room-thumb {
      width: 80px;
      height: 56px;
      border-radius: 6px;
      overflow: hidden;
      background: var(--surface);
      flex-shrink: 0;
    }

    .room-thumb-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
      color: var(--text-secondary);
    }

    .room-meta {
      .room-no {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 2px;
      }
      .room-desc {
        font-size: 12px;
        color: var(--text-secondary);
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .facility-tag {
    margin-right: 4px;
    margin-bottom: 4px;
  }
}
</style>