<template>
  <div class="property-manage">
    <!-- ========== 顶部 Hero ========== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><HomeFilled /></el-icon>
        <div class="hero-text">
          <h2>房源管理</h2>
          <p class="subtitle">物业档案 · 房型 / 房间 / 图集 / 入住政策 一站式管理</p>
        </div>
        <div class="hero-actions">
          <el-tag type="success" effect="plain">当前 {{ total }} 个物业</el-tag>
        </div>
      </div>
    </el-card>

    <!-- ========== 筛选栏 ========== -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="关键字">
          <el-input
            v-model="filters.keyword"
            placeholder="物业名 / 编号"
            style="width: 240px"
            clearable
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="城市">
          <el-input
            v-model="filters.city"
            placeholder="按城市筛选"
            style="width: 180px"
            clearable
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" style="width: 160px" clearable @change="onSearch">
            <el-option v-for="t in TYPE_OPTIONS" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch" :loading="loading">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
          <el-button type="success" :icon="Plus" @click="openDialog()">新建物业</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ========== 物业表格 ========== -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">物业列表</span>
          <span class="sub">点击行查看详情 · 支持新增 / 编辑 / 启停 / 删除</span>
        </div>
      </template>
      <el-table
        :data="list"
        v-loading="loading"
        stripe
        border
        size="small"
        @row-click="onRowClick"
        empty-text="暂无物业数据"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="row-expand">
              <el-descriptions :column="3" size="small" border>
                <el-descriptions-item label="编号">{{ row.code }}</el-descriptions-item>
                <el-descriptions-item label="电话">{{ row.phone || '—' }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{ row.email || '—' }}</el-descriptions-item>
                <el-descriptions-item label="入住时间">{{ row.checkInTime || '—' }}</el-descriptions-item>
                <el-descriptions-item label="退房时间">{{ row.checkOutTime || '—' }}</el-descriptions-item>
                <el-descriptions-item label="类型">{{ typeLabel(row.type) }}</el-descriptions-item>
                <el-descriptions-item :span="3" label="地址">{{ row.city }} · {{ row.address }}</el-descriptions-item>
                <el-descriptions-item v-if="row.description" :span="3" label="简介">
                  {{ row.description }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="物业名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="code" label="编号" width="120" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTagType(row.type)">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="城市" width="120" prop="city" />
        <el-table-column label="地址" min-width="200" prop="address" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="openDialog(row)">编辑</el-button>
            <el-button size="small" link @click.stop="toggleStatus(row)">
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
            <el-button size="small" link type="danger" @click.stop="confirmDelete(row)">删除</el-button>
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
        @current-change="loadList"
        @size-change="loadList"
      />
    </el-card>

    <!-- ========== 新建/编辑 对话框 ========== -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editing ? '编辑物业' : '新建物业'"
      width="640px"
      :close-on-click-modal="false"
      @closed="onDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="dialog.form"
        :rules="formRules"
        label-width="100px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="物业名" prop="name">
              <el-input v-model="dialog.form.name" maxlength="60" placeholder="例：三亚亚龙湾海景民宿" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编号" prop="code">
              <el-input v-model="dialog.form.code" maxlength="30" placeholder="例：SY-YLW-001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" prop="type">
              <el-select v-model="dialog.form.type" style="width: 100%">
                <el-option v-for="t in TYPE_OPTIONS" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="dialog.form.status" style="width: 100%">
                <el-option label="营业中" value="active" />
                <el-option label="暂停营业" value="suspended" />
                <el-option label="已关闭" value="closed" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="城市" prop="city">
              <el-input v-model="dialog.form.city" maxlength="30" placeholder="例：三亚市" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="dialog.form.phone" maxlength="20" placeholder="前台联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="详细地址" prop="address">
              <el-input v-model="dialog.form.address" maxlength="120" placeholder="街道、门牌号、楼层等" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="dialog.form.email" maxlength="60" placeholder="可选" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入住 / 退房">
              <div style="display: flex; gap: 8px">
                <el-time-picker
                  v-model="checkInTimeModel"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="入住"
                  style="flex: 1"
                />
                <el-time-picker
                  v-model="checkOutTimeModel"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="退房"
                  style="flex: 1"
                />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="简介" prop="description">
              <el-input
                v-model="dialog.form.description"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="物业亮点 / 周边配套 / 交通信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submit" :loading="dialog.submitting">
          {{ dialog.editing ? '保存修改' : '创建物业' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import {
  getPropertyPage,
  createProperty,
  updateProperty,
  deleteProperty,
  type PropertyView
} from '@/services/api'

// ========== 常量 ==========

const TYPE_OPTIONS = [
  { value: 'minsu', label: '民宿' },
  { value: 'hotel', label: '酒店' },
  { value: 'apartment', label: '公寓' },
  { value: 'villa', label: '别墅' },
  { value: 'hostel', label: '青旅' },
  { value: 'b&b', label: '床位早餐' }
]

const TYPE_LABEL: Record<string, string> = {
  minsu: '民宿',
  hotel: '酒店',
  apartment: '公寓',
  villa: '别墅',
  hostel: '青旅',
  'b&b': '床位早餐'
}

const STATUS_LABEL: Record<string, string> = {
  active: '营业中',
  suspended: '暂停',
  closed: '已关闭'
}

// ========== 筛选 / 分页 ==========

const filters = reactive({
  keyword: '',
  city: '',
  type: '' as string | undefined
})

const pagination = reactive({
  current: 1,
  size: 20
})

const total = ref(0)
const list = ref<PropertyView[]>([])
const loading = ref(false)

// 时间选择器（HH:mm）— 转字符串避免 dialog 双向绑定类型问题
const checkInTimeModel = ref<string>('14:00')
const checkOutTimeModel = ref<string>('12:00')

// ========== 表单 / 对话框 ==========

interface DialogForm {
  id?: number
  name: string
  code: string
  type: string
  status: string
  city: string
  address: string
  phone: string
  email: string
  checkInTime: string
  checkOutTime: string
  description: string
}

const defaultForm = (): DialogForm => ({
  name: '',
  code: '',
  type: 'minsu',
  status: 'active',
  city: '',
  address: '',
  phone: '',
  email: '',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  description: ''
})

const dialog = reactive({
  visible: false,
  editing: false,
  submitting: false,
  form: defaultForm()
})

const formRef = ref<FormInstance>()

const formRules: FormRules = {
  name: [{ required: true, message: '请输入物业名', trigger: 'blur' }],
  code: [{ required: true, message: '请输入物业编号', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
  phone: [
    {
      validator: (_rule, value: string, cb) => {
        if (!value) return cb()
        if (!/^[\d\-\+\s]{6,20}$/.test(value)) return cb(new Error('电话格式不正确'))
        cb()
      },
      trigger: 'blur'
    }
  ],
  email: [
    {
      validator: (_rule, value: string, cb) => {
        if (!value) return cb()
        if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return cb(new Error('邮箱格式不正确'))
        cb()
      },
      trigger: 'blur'
    }
  ]
}

// ========== 方法 ==========

const loadList = async () => {
  loading.value = true
  try {
    const res = await getPropertyPage({
      current: pagination.current,
      size: pagination.size,
      keyword: filters.keyword || undefined
    })
    // 内存中按 city / type 二次过滤（后端 keyword 已经模糊匹配 name + code）
    let rows = res.list
    if (filters.city) rows = rows.filter(r => (r.city || '').includes(filters.city))
    if (filters.type) rows = rows.filter(r => r.type === filters.type)
    list.value = rows
    total.value = res.total
  } catch (e) {
    ElMessage.error('加载物业列表失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  pagination.current = 1
  loadList()
}

const onReset = () => {
  filters.keyword = ''
  filters.city = ''
  filters.type = ''
  pagination.current = 1
  loadList()
}

const onRowClick = (row: PropertyView) => {
  // 行点击时不做任何副作用 — 只触发展开/折叠（el-table 默认行为）
  // 子行通过 <el-table-column type="expand"> 展示
  void row
}

const openDialog = (row?: PropertyView) => {
  dialog.editing = !!row
  if (row) {
    dialog.form = {
      id: row.id,
      name: row.name || '',
      code: row.code || '',
      type: row.type || 'minsu',
      status: row.status || 'active',
      city: row.city || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      checkInTime: row.checkInTime || '14:00',
      checkOutTime: row.checkOutTime || '12:00',
      description: row.description || ''
    }
    checkInTimeModel.value = dialog.form.checkInTime
    checkOutTimeModel.value = dialog.form.checkOutTime
  } else {
    dialog.form = defaultForm()
    checkInTimeModel.value = '14:00'
    checkOutTimeModel.value = '12:00'
  }
  dialog.visible = true
}

const onDialogClosed = () => {
  formRef.value?.resetFields()
}

const submit = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  dialog.submitting = true
  // 把时间选择器值写回 form
  dialog.form.checkInTime = checkInTimeModel.value || '14:00'
  dialog.form.checkOutTime = checkOutTimeModel.value || '12:00'

  const payload: Partial<PropertyView> = {
    name: dialog.form.name,
    code: dialog.form.code,
    type: dialog.form.type,
    status: dialog.form.status,
    city: dialog.form.city,
    address: dialog.form.address,
    phone: dialog.form.phone || undefined,
    email: dialog.form.email || undefined,
    checkInTime: dialog.form.checkInTime,
    checkOutTime: dialog.form.checkOutTime,
    description: dialog.form.description || undefined
  }
  try {
    if (dialog.editing && dialog.form.id) {
      await updateProperty(dialog.form.id, payload)
      ElMessage.success('物业已更新')
    } else {
      await createProperty(payload)
      ElMessage.success('物业已创建')
    }
    dialog.visible = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
    console.error(e)
  } finally {
    dialog.submitting = false
  }
}

const toggleStatus = async (row: PropertyView) => {
  const next = row.status === 'active' ? 'suspended' : 'active'
  const tip = next === 'active' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认${tip}物业「${row.name}」？`, `${tip}确认`, {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await updateProperty(row.id, { status: next })
    ElMessage.success(`已${tip}「${row.name}」`)
    loadList()
  } catch (e) {
    ElMessage.error(`${tip}失败`)
    console.error(e)
  }
}

const confirmDelete = async (row: PropertyView) => {
  try {
    await ElMessageBox.confirm(
      `确认删除物业「${row.name}」？该操作不可恢复，且会级联删除关联房型、房价、库存。`,
      '删除确认',
      { type: 'error' }
    )
  } catch {
    return
  }
  try {
    await deleteProperty(row.id)
    ElMessage.success('物业已删除')
    // 如果删到最后一页，回到上一页
    if (list.value.length === 1 && pagination.current > 1) {
      pagination.current -= 1
    }
    loadList()
  } catch (e) {
    ElMessage.error('删除失败')
    console.error(e)
  }
}

// ========== 辅助 ==========

const typeLabel = (t?: string) => TYPE_LABEL[t || 'minsu'] || t || '—'
const typeTagType = (t?: string) => {
  switch (t) {
    case 'villa': return 'warning'
    case 'hotel': return 'success'
    case 'apartment': return 'info'
    case 'hostel': return 'primary'
    default: return ''
  }
}
const statusLabel = (s?: string) => STATUS_LABEL[s || 'active'] || s || '—'
const statusTagType = (s?: string) => {
  switch (s) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'closed': return 'danger'
    default: return 'info'
  }
}

// ========== 初始化 ==========

onMounted(loadList)
</script>

<style scoped lang="scss">
.property-manage {
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
    h2 { margin: 0 0 4px; font-size: 22px; color: var(--text-primary, #303133); }
    .subtitle { margin: 0; color: var(--text-secondary, #909399); font-size: 13px; }
  }
  .hero-actions { display: flex; gap: 8px; }
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
  .pagination {
    margin-top: 14px;
    justify-content: flex-end;
  }
}
.row-expand {
  padding: 8px 24px;
  background: #fafafa;
}
</style>