<template>
  <div class="customer-manage">
    <!-- 搜索表单 -->
    <div class="search-card linear-card mb-5">
      <el-form :model="searchForm" inline>
        <el-form-item label="姓名">
          <el-input v-model="searchForm.name" placeholder="客户姓名" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="客户手机号" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="searchForm.vipLevel" placeholder="全部" clearable style="width: 130px">
            <el-option label="普通" :value="0" />
            <el-option label="银卡" :value="1" />
            <el-option label="金卡" :value="2" />
            <el-option label="钻石" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户状态">
          <el-select v-model="searchForm.blacklisted" placeholder="全部" clearable style="width: 130px">
            <el-option label="正常" :value="false" />
            <el-option label="黑名单" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <button type="button" class="linear-btn linear-btn--primary" @click="handleSearch">搜索</button>
          <button type="button" class="linear-btn linear-btn--secondary" @click="handleReset">重置</button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar mb-4">
      <button type="button" class="linear-btn linear-btn--primary" @click="handleAdd">新增客户</button>
      <div class="spacer"></div>
      <span class="summary">
        共 {{ total }} 位 · 累计消费 <strong>¥{{ totalSpend.toLocaleString('zh-CN') }}</strong>
      </span>
    </div>

    <!-- 数据表格 -->
    <div class="linear-card">
      <el-table v-loading="loading" :data="tableData" row-key="id">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column label="客户" width="220">
          <template #default="{ row }">
            <div class="customer-cell">
              <el-avatar :size="40" :src="row.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.name}`">
                {{ row.name.charAt(0) }}
              </el-avatar>
              <div>
                <div class="c-name">
                  {{ row.name }}
                  <el-tag v-if="row.blacklisted" size="small" type="danger">黑名单</el-tag>
                  <el-icon v-if="row.gender === 'female'" class="gender-icon female"><Female /></el-icon>
                  <el-icon v-else-if="row.gender === 'male'" class="gender-icon male"><Male /></el-icon>
                </div>
                <div class="c-id">#{{ String(row.id).padStart(4, '0') }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="idCard" label="身份证号" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.idCard">{{ maskIdCard(row.idCard) }}</span>
            <span v-else class="text-muted">未填写</span>
          </template>
        </el-table-column>
        <el-table-column label="会员等级" width="110">
          <template #default="{ row }">
            <el-tag :type="getVipType(row.vipLevel)" effect="dark">
              <el-icon v-if="row.vipLevel === 3"><Trophy /></el-icon>
              {{ getVipLabel(row.vipLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalOrders" label="累计订单" width="100" sortable>
          <template #default="{ row }">{{ row.totalOrders }} 单</template>
        </el-table-column>
        <el-table-column prop="totalSpend" label="累计消费" width="130" sortable>
          <template #default="{ row }">
            <strong class="amount">¥{{ row.totalSpend.toLocaleString('zh-CN') }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="170" />
        <el-table-column label="操作" width="290" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleDetail(row)">详情</el-button>
            <el-button :type="row.blacklisted ? 'success' : 'warning'" link @click="handleBlacklist(row)">
              {{ row.blacklisted ? '移出黑名单' : '加入黑名单' }}
            </el-button>
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

    <el-drawer v-model="detailVisible" title="客户档案" size="680px">
      <div v-loading="detailLoading">
        <template v-if="customerDetail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="客户">{{ customerDetail.customer.name }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="customerDetail.customer.blacklisted ? 'danger' : 'success'">
                {{ customerDetail.customer.blacklisted ? '黑名单' : '正常' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="手机号">{{ customerDetail.customer.phone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="会员等级">{{ getVipLabel(customerDetail.customer.vipLevel) }}</el-descriptions-item>
            <el-descriptions-item label="累计入住">{{ customerDetail.totalStays }} 次</el-descriptions-item>
            <el-descriptions-item label="累计消费">¥{{ customerDetail.totalSpent.toLocaleString('zh-CN') }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ customerDetail.customer.remark || '—' }}</el-descriptions-item>
          </el-descriptions>

          <div class="detail-heading">消费与入住记录</div>
          <el-table :data="customerDetail.history" border stripe empty-text="暂无消费记录">
            <el-table-column prop="bookingNo" label="订单号" min-width="150" />
            <el-table-column label="入住日期" width="115">
              <template #default="{ row }">{{ row.checkInDate || '—' }}</template>
            </el-table-column>
            <el-table-column label="退房日期" width="115">
              <template #default="{ row }">{{ row.checkOutDate || '—' }}</template>
            </el-table-column>
            <el-table-column label="来源" width="90">
              <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
            </el-table-column>
            <el-table-column label="消费" width="110" align="right">
              <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toLocaleString('zh-CN') }}</template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-drawer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="客户姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="formData.gender">
                <el-radio value="male">男</el-radio>
                <el-radio value="female">女</el-radio>
                <el-radio value="other">其他</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="11位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="formData.idCard" placeholder="可选" maxlength="18" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生日">
              <el-date-picker
                v-model="formData.birthday"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择生日"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="会员等级">
              <el-select v-model="formData.vipLevel" placeholder="选择等级" style="width: 100%">
                <el-option label="普通" :value="0" />
                <el-option label="银卡" :value="1" />
                <el-option label="金卡" :value="2" />
                <el-option label="钻石" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="联系地址">
          <el-input v-model="formData.address" placeholder="可选" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="客户偏好、特殊要求等" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Female, Male, Trophy } from '@element-plus/icons-vue'
import { getCustomerList, getCustomerDetail, createCustomer, updateCustomer, deleteCustomer } from '@/services/api'
import type { CustomerInfo } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const loading = ref(false)
const submitLoading = ref(false)
const tableData = ref<CustomerInfo[]>([])
const total = ref(0)
const totalSpend = ref(0)
const page = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const detailLoading = ref(false)
const customerDetail = ref<Awaited<ReturnType<typeof getCustomerDetail>> | null>(null)

const searchForm = reactive({
  name: '',
  phone: '',
  vipLevel: undefined as 0 | 1 | 2 | 3 | undefined,
  blacklisted: undefined as boolean | undefined
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增客户')
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive<Partial<CustomerInfo>>({
  name: '',
  phone: '',
  idCard: '',
  gender: 'male',
  birthday: '',
  address: '',
  vipLevel: 0,
  remark: ''
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await getCustomerList({
      page: page.value,
      pageSize: pageSize.value,
      name: searchForm.name || undefined,
      phone: searchForm.phone || undefined,
      vipLevel: searchForm.vipLevel,
      blacklisted: searchForm.blacklisted
    })
    tableData.value = result.list
    total.value = result.total
    totalSpend.value = result.list.reduce((s, c) => s + c.totalSpend, 0)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadData()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.phone = ''
  searchForm.vipLevel = undefined
  searchForm.blacklisted = undefined
  page.value = 1
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增客户'
  Object.assign(formData, {
    name: '',
    phone: '',
    idCard: '',
    gender: 'male',
    birthday: '',
    address: '',
    vipLevel: 0,
    remark: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: CustomerInfo) => {
  isEdit.value = true
  dialogTitle.value = `编辑客户 ${row.name}`
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleDetail = async (row: CustomerInfo) => {
  detailVisible.value = true
  detailLoading.value = true
  customerDetail.value = null
  try {
    customerDetail.value = await getCustomerDetail(row.id)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '客户详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

const handleBlacklist = async (row: CustomerInfo) => {
  const next = !row.blacklisted
  try {
    await ElMessageBox.confirm(
      next ? `确定将 ${row.name} 加入黑名单？` : `确定将 ${row.name} 移出黑名单？`,
      next ? '加入黑名单' : '移出黑名单',
      { type: next ? 'warning' : 'info' }
    )
  } catch {
    return
  }
  try {
    await updateCustomer(row.id, { blacklisted: next })
    row.blacklisted = next
    ElMessage.success(next ? '已加入黑名单' : '已移出黑名单')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '黑名单状态更新失败')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      if (isEdit.value) {
        await updateCustomer(formData.id!, formData)
        ElMessage.success('更新成功')
      } else {
        await createCustomer(formData)
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

const handleDelete = (row: CustomerInfo) => {
  ElMessageBox.confirm(`确定要删除客户 ${row.name} 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteCustomer(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }).catch(() => {})
}

const maskIdCard = (id: string) => {
  if (!id || id.length < 8) return id
  return id.substring(0, 4) + '****' + id.substring(id.length - 4)
}

const getVipLabel = (level?: number) => {
  const map: Record<number, string> = { 0: '普通', 1: '银卡', 2: '金卡', 3: '钻石' }
  return map[level || 0] || '普通'
}

const getVipType = (level?: number): 'info' | 'success' | 'warning' | 'danger' => {
  const map: Record<number, 'info' | 'success' | 'warning' | 'danger'> = {
    0: 'info',
    1: 'success',
    2: 'warning',
    3: 'danger'
  }
  return map[level || 0] || 'info'
}

const sourceLabel = (source?: string) => {
  const map: Record<string, string> = {
    direct: '直销',
    DIRECT: '直销',
    ctrip: '携程',
    fliggy: '飞猪',
    meituan: '美团',
    douyin: '抖音',
    taobao: '淘宝'
  }
  return source ? (map[source] || source) : '—'
}
</script>

<style scoped lang="scss">
.customer-manage {
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

  .text-muted { color: var(--text-secondary); }

  .customer-cell {
    display: flex;
    align-items: center;
    gap: 12px;

    .c-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.2;
      display: flex;
      align-items: center;
      gap: 4px;

      .gender-icon {
        font-size: 14px;

        &.female { color: #ec407a; }
        &.male { color: #409eff; }
      }
    }

    .c-id {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.2;
      margin-top: 2px;
    }
  }

  .amount {
    color: #f56c6c;
    font-size: 15px;
  }

  .detail-heading {
    margin: 24px 0 12px;
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
