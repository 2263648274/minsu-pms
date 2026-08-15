<template>
  <div class="profile-page">
    <!-- 顶部用户横幅 -->
    <div class="profile-banner">
      <div class="banner-left">
        <el-avatar class="banner-avatar" :src="userStore.avatar" :size="72">
          {{ userStore.username.charAt(0).toUpperCase() }}
        </el-avatar>
        <div class="banner-info">
          <div class="banner-name">
            {{ formData.nickname || userStore.username }}
            <span class="role-badge">{{ formData.role || 'admin' }}</span>
          </div>
          <div class="banner-sub">@{{ formData.username }}</div>
        </div>
      </div>
      <div class="banner-stats">
        <div class="stat-item">
          <div class="stat-label">邮箱</div>
          <div class="stat-value">{{ formData.email || '未设置' }}</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">手机号</div>
          <div class="stat-value">{{ formData.phone || '未设置' }}</div>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <div class="stat-label">账号状态</div>
          <div class="stat-value stat-active">● 正常</div>
        </div>
      </div>
    </div>

    <div class="grid-container">
      <!-- 基本信息卡片 -->
      <div class="linear-card profile-card">
        <div class="linear-card-content">
          <div class="card-head">
            <el-icon class="card-icon"><User /></el-icon>
            <h2 class="card-title">基本信息</h2>
          </div>
          <el-form ref="formRef" :model="formData" label-width="80px" class="tight-form">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="formData.username" disabled />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="formData.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="formData.email" placeholder="请输入邮箱">
                <template #prefix><el-icon><Message /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入手机号">
                <template #prefix><el-icon><Iphone /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item label="角色" prop="role">
              <el-input v-model="formData.role" disabled />
            </el-form-item>
            <el-form-item label-width="0">
              <div class="actions">
                <button type="button" class="linear-btn linear-btn--primary" @click="handleSave">
                  保存修改
                </button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 修改密码卡片 -->
      <div class="linear-card password-card">
        <div class="linear-card-content">
          <div class="card-head">
            <el-icon class="card-icon"><Lock /></el-icon>
            <h2 class="card-title">修改密码</h2>
          </div>
          <el-form ref="passwordFormRef" :model="passwordForm" label-width="80px" class="tight-form">
            <el-form-item label="旧密码" prop="oldPassword" :rules="[{ required: true, message: '请输入旧密码' }]">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入旧密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword" :rules="validatePassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword" :rules="validateConfirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
            </el-form-item>
            <div class="pwd-tip">
              <el-icon><InfoFilled /></el-icon>
              密码需至少 6 位，且同时包含字母和数字
            </div>
            <el-form-item label-width="0">
              <div class="actions">
                <button type="button" class="linear-btn linear-btn--primary" @click="handleChangePassword">
                  修改密码
                </button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { User, Lock, Message, Iphone, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store'
import { updateUser } from '@/services/api'

const userStore = useUserStore()
const loading = ref(false)
const passwordLoading = ref(false)
const formRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

const formData = reactive({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  role: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码强度验证
const validatePassword = (_rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请输入新密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度不能少于6位'))
  } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    callback(new Error('密码必须包含字母和数字'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (_rule: any, value: any, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

onMounted(() => {
  const user = userStore.userInfo
  if (user) {
    formData.username = user.username || ''
    formData.nickname = user.nickname || ''
    formData.email = user.email || ''
    formData.phone = user.phone || ''
    formData.role = user.role || ''
  }
})

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      if (userStore.userInfo?.id) {
        await updateUser(userStore.userInfo.id, formData)
        // 更新 store 中的信息
        userStore.updateProfile(formData)
        ElMessage.success('保存成功')
      }
    } catch (error: any) {
      ElMessage.error(error.message || '保存失败')
    } finally {
      loading.value = false
    }
  })
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    passwordLoading.value = true
    try {
      // 在实际项目中这里调用修改密码 API
      // await changePassword({
      //   oldPassword: passwordForm.oldPassword,
      //   newPassword: passwordForm.newPassword
      // })
      ElMessage.success('密码修改成功，请重新登录')
      userStore.logout()
      window.location.reload()
    } catch (error: any) {
      ElMessage.error(error.message || '修改密码失败')
    } finally {
      passwordLoading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.profile-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

/* ===== 顶部横幅 ===== */
.profile-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: 14px;
  margin-bottom: 20px;
  background: linear-gradient(120deg, #6366f1 0%, #8b5cf6 55%, #a855f7 100%);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
  color: #fff;
  flex-wrap: wrap;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-avatar {
  border: 3px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
  font-size: 28px;
  font-weight: 600;
  flex-shrink: 0;
}

.banner-name {
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
}

.banner-sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.85;
}

.banner-stats {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-item {
  min-width: 90px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
}

.stat-active {
  color: #a7f3d0;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
}

/* ===== 卡片区 ===== */
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.card-icon {
  font-size: 18px;
  color: #6366f1;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.tight-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.tight-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

/* disabled 字段：浅灰，不再深灰突兀 */
:deep(.el-input.is-disabled .el-input__wrapper) {
  background-color: #f8fafc;
  box-shadow: 0 0 0 1px #e5e7eb inset;
}

:deep(.el-form-item__label) {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.pwd-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: #f8fafc;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 0 16px 80px;
}

.actions {
  display: flex;
  justify-content: flex-start;
  width: 100%;
}

.actions .linear-btn {
  min-width: 120px;
}

@media (max-width: 820px) {
  .grid-container {
    grid-template-columns: 1fr;
  }
  .banner-stats {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
