<template>
  <div class="channel-manage">
    <!-- ========== 顶部 Hero ========== -->
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="36" color="var(--primary-color)"><Connection /></el-icon>
        <div class="hero-text">
          <h2>OTA 渠道管理</h2>
          <p class="subtitle">携程 · 飞猪 · 美团 · 抖音 · 淘宝 — 渠道配置 / 凭证管理 / 连接检测</p>
        </div>
        <div class="hero-actions">
          <el-tag type="success" effect="plain">已接入 {{ connectedCount }} / {{ list.length }}</el-tag>
        </div>
      </div>
    </el-card>

    <!-- ========== 平台适配器入口 ========== -->
    <el-card shadow="never" class="channels-grid">
      <template #header>
        <div class="card-header">
          <span>平台适配器入口</span>
          <el-tag type="info" size="small">Phase 2 渠道配置</el-tag>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col v-for="ch in cardsWithStatus" :key="ch.id" :xs="24" :sm="12" :md="8" :lg="4">
          <el-card
            shadow="hover"
            class="channel-card"
            :body-style="{ padding: '16px' }"
            @click="openDialogByCode(ch)"
          >
            <div class="channel-logo" :style="{ background: ch.color }">{{ ch.short }}</div>
            <div class="channel-info">
              <div class="channel-name">{{ ch.displayName }}</div>
              <div class="channel-meta">
                <el-tag
                  size="small"
                  :type="ch.configStatus === 'connected' ? 'success' : (ch.configStatus === 'error' ? 'danger' : 'info')"
                  effect="plain"
                >
                  {{ configStatusLabel(ch.configStatus) }}
                </el-tag>
                <el-tag size="small" type="info" effect="plain">
                  {{ ch.lastStatus }}
                </el-tag>
              </div>
              <div class="channel-protocol">{{ ch.protocolLabel }}</div>
              <div class="channel-cta">
                <el-button v-if="ch.channel" size="small" link type="primary" @click.stop="pingChannel(ch.channel)">
                  <el-icon><Position /></el-icon>检测
                </el-button>
                <el-button size="small" link type="primary" @click.stop="openDialogByCode(ch)">
                  <el-icon><Setting /></el-icon>配置
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-alert
        title="Phase 2 实施说明"
        type="info"
        :closable="false"
        show-icon
      >
        渠道配置 CRUD 已对接后端 ChannelController；凭证、佣金率、结算账户、推送设置保存在数据库。
        真实调用 OTA API（携程 PMS / 飞猪 OpenAPI / 美团 PMS / 抖音民宿 / 淘宝飞猪）将在 Phase 3 接入。
      </el-alert>
    </el-card>

    <!-- ========== 渠道配置表格 ========== -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">渠道列表（{{ list.length }}）</span>
          <span class="sub">点击行展开详情，支持新增 / 编辑 / 删除 / 连接检测</span>
        </div>
      </template>
      <el-table
        :data="list"
        v-loading="loading"
        stripe
        border
        size="small"
        empty-text="暂无渠道配置"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="code" label="平台 code" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="平台名称" min-width="140" />
        <el-table-column label="启用" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled === 1"
              :loading="row.__pinging"
              @change="(v: boolean) => toggleEnabled(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="最近状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="lastStatusType(row.lastStatus)">
              {{ row.lastStatus || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近同步" min-width="170" prop="lastSyncAt" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.lastSyncAt">{{ formatTime(row.lastSyncAt) }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="最近错误" min-width="160" prop="lastError" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.lastError" class="text-error">{{ row.lastError }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="pingChannel(row)" :loading="row.__pinging">检测</el-button>
            <el-button size="small" link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" link @click="resetError(row)">清错</el-button>
            <el-button size="small" link type="danger" @click="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ========== 新建/编辑 对话框 ========== -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.editing ? '编辑渠道配置' : '新建渠道配置'"
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
            <el-form-item label="平台 code" prop="code">
              <el-input
                v-model="dialog.form.code"
                :disabled="dialog.editing"
                maxlength="30"
                placeholder="ctrip / fliggy / meituan / douyin / taobao"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平台名称" prop="name">
              <el-input v-model="dialog.form.name" maxlength="60" placeholder="携程 / 飞猪 / 美团 ..." />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用" prop="enabled">
              <el-switch
                :model-value="dialog.form.enabled === 1"
                @change="(v: boolean) => (dialog.form.enabled = v ? 1 : 0)"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="说明">
          <el-alert type="info" :closable="false" show-icon>
            Phase 2 仅持久化渠道基础信息（code / name / enabled）。凭证 / 佣金 / 同步设置等扩展字段将在 Phase 3 OTA 适配器接入时落库。
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submit" :loading="dialog.submitting">
          {{ dialog.editing ? '保存修改' : '创建渠道' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import { Connection, Position, Setting } from '@element-plus/icons-vue'
import { channelList, type ChannelMeta } from '@/channels/adapters/registry'
import {
  getChannelList,
  createChannel,
  updateChannel,
  deleteChannel,
  pingChannel as pingChannelApi,
  type ChannelView
} from '@/services/api'

// ========== 类型 ==========

interface ChannelCard extends ChannelMeta {
  configStatus: 'connected' | 'disconnected' | 'error' | 'unknown'
  lastStatus: string
  channel?: ChannelView
}

interface DialogForm {
  id?: number
  code: string
  name: string
  enabled: number
}

const defaultForm = (): DialogForm => ({ code: '', name: '', enabled: 1 })

// ========== 状态 ==========

const list = ref<ChannelView[]>([])
const loading = ref(false)

const dialog = reactive({
  visible: false,
  editing: false,
  submitting: false,
  form: defaultForm()
})
const formRef = ref<FormInstance>()

const formRules: FormRules = {
  code: [
    { required: true, message: '请输入平台 code', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]{1,29}$/i, message: '字母/数字/下划线，2-30 字符', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入平台名称', trigger: 'blur' }]
}

// ========== 计算属性 ==========

const connectedCount = computed(() => list.value.filter(c => c.enabled === 1).length)

const cardsWithStatus = computed<ChannelCard[]>(() => {
  return channelList.map(meta => {
    const ch = list.value.find(c => c.code.toLowerCase() === meta.id.toLowerCase())
    const status = ch?.lastStatus || 'UNKNOWN'
    return {
      ...meta,
      configStatus: !ch
        ? 'disconnected'
        : status === 'OK'
          ? 'connected'
          : status === 'ERROR'
            ? 'error'
            : 'unknown',
      lastStatus: status,
      channel: ch
    }
  })
})

// ========== 加载 ==========

const loadList = async () => {
  loading.value = true
  try {
    list.value = await getChannelList()
  } catch (e) {
    ElMessage.error('加载渠道列表失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ========== Dialog 操作 ==========

const openDialog = (row?: ChannelView) => {
  dialog.editing = !!row
  if (row) {
    dialog.form = {
      id: row.id,
      code: row.code,
      name: row.name,
      enabled: row.enabled
    }
  } else {
    dialog.form = defaultForm()
  }
  dialog.visible = true
}

const openDialogByCode = (meta: ChannelCard) => {
  if (meta.channel) {
    openDialog(meta.channel)
  } else {
    dialog.editing = false
    dialog.form = { code: meta.id, name: meta.displayName, enabled: 1 }
    dialog.visible = true
  }
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
  const payload = {
    code: dialog.form.code,
    name: dialog.form.name,
    enabled: dialog.form.enabled
  }
  try {
    if (dialog.editing && dialog.form.id) {
      await updateChannel(dialog.form.id, payload)
      ElMessage.success('渠道已更新')
    } else {
      await createChannel(payload)
      ElMessage.success('渠道已创建')
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

// ========== 启停 / 检测 / 清错 / 删除 ==========

const toggleEnabled = async (row: ChannelView, val: boolean) => {
  try {
    await updateChannel(row.id, { enabled: val ? 1 : 0 })
    ElMessage.success(`${row.name} 已${val ? '启用' : '停用'}`)
    loadList()
  } catch (e) {
    ElMessage.error('操作失败')
    console.error(e)
  }
}

const pingChannel = async (row: ChannelView) => {
  row.__pinging = true
  try {
    const res = await pingChannelApi(row.id)
    if (res.status === 'OK') {
      ElMessage.success(`检测成功（${res.durationMs}ms）`)
    } else {
      ElMessage.warning(`检测失败：${res.error || '未知错误'}`)
    }
    loadList()
  } catch (e) {
    ElMessage.error('检测请求失败')
    console.error(e)
  } finally {
    row.__pinging = false
  }
}

const resetError = async (row: ChannelView) => {
  try {
    await updateChannel(row.id, { lastStatus: 'UNKNOWN', lastError: '' as any })
    ElMessage.success('错误状态已清除')
    loadList()
  } catch (e) {
    ElMessage.error('清除失败')
    console.error(e)
  }
}

const confirmDelete = async (row: ChannelView) => {
  try {
    await ElMessageBox.confirm(`确认删除渠道「${row.name}」？`, '删除确认', { type: 'error' })
  } catch {
    return
  }
  try {
    await deleteChannel(row.id)
    ElMessage.success('渠道已删除')
    loadList()
  } catch (e) {
    ElMessage.error('删除失败')
    console.error(e)
  }
}

// ========== 辅助 ==========

const configStatusLabel = (s: ChannelCard['configStatus']) => {
  const map: Record<ChannelCard['configStatus'], string> = {
    connected: '已连接',
    disconnected: '未配置',
    error: '异常',
    unknown: '未知'
  }
  return map[s]
}

const lastStatusType = (s?: string): 'success' | 'danger' | 'info' | 'warning' => {
  if (s === 'OK') return 'success'
  if (s === 'ERROR') return 'danger'
  if (s === 'UNKNOWN') return 'info'
  return 'info'
}

const formatTime = (iso?: string) => {
  if (!iso) return ''
  // 后端返回 "YYYY-MM-DD HH:mm:ss" 或 ISO
  return iso.length > 19 ? iso.slice(0, 19).replace('T', ' ') : iso
}

onMounted(loadList)
</script>

<style scoped lang="scss">
.channel-manage {
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
.channels-grid {
  .channel-card {
    margin-bottom: 16px;
    cursor: pointer;
    transition: transform 0.15s ease;
    &:hover { transform: translateY(-2px); }
    .channel-logo {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .channel-info {
      .channel-name { font-weight: 600; margin-bottom: 6px; font-size: 14px; }
      .channel-meta {
        display: flex;
        gap: 6px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .channel-protocol {
        color: #909399;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .channel-cta {
        display: flex;
        gap: 4px;
        :deep(.el-button) { padding: 4px 6px; }
      }
    }
  }
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
.text-error { color: var(--el-color-danger); }
</style>
