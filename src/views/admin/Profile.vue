<template>
  <div class="profile-page">
    <div class="grid-container">
      <!-- 基本信息卡片 -->
      <div class="linear-card profile-card">
        <div class="linear-card-content">
          <h2 class="linear-h2 mb-6">基本信息</h2>
          <div class="avatar-section mb-6">
            <div class="avatar-wrapper">
              <el-avatar :size="120" :src="userStore.avatar">
                {{ userStore.username.charAt(0).toUpperCase() }}
              </el-avatar>
            </div>
          </div>
          <el-form ref="formRef" :model="formData" label-width="100px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="formData.username" disabled />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="formData.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="formData.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="角色" prop="role">
              <el-input v-model="formData.role" disabled />
            </el-form-item>
            <el-form-item>
              <div class="actions">
                <button type="button" class="linear-btn linear-btn--primary" :loading="loading" @click="handleSave">
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
          <h2 class="linear-h2 mb-6">修改密码</h2>
          <el-form ref="passwordFormRef" :model="passwordForm" label-width="100px">
            <el-form-item label="旧密码" prop="oldPassword" :rules="[{ required: true, message: '请输入旧密码' }]">
              <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入旧密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword" :rules="validatePassword">
              <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword" :rules="validateConfirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <div class="actions">
                <button type="button" class="linear-btn linear-btn--primary" :loading="passwordLoading" @click="handleChangePassword">
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
  .grid-container {
    max-width: 800px;
    margin: 0 auto;
    display: grid;
    gap: 24px;
  }

  .mb-6 {
    margin-bottom: 24px;
  }

  .avatar-section {
    text-align: center;

    .avatar-wrapper {
      display: inline-block;
      position: relative;

      ::deep .el-avatar {
        font-size: 32px;
      }
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .profile-card,
  .password-card {
    position: relative;
    overflow: hidden;
  }
}
</style>
