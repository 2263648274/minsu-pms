<template>
  <div class="register-page linear-bg">
    <div class="linear-blob linear-blob--primary"></div>
    <div class="linear-blob linear-blob--secondary"></div>
    <div class="linear-blob linear-blob--tertiary"></div>
    <div class="linear-blob linear-blob--bottom"></div>

    <div class="register-container linear-content" ref="containerRef">
      <div class="register-form-wrapper linear-card">
        <div class="register-header linear-card-content">
          <h1>{{ title }}</h1>
          <p>用户注册</p>
        </div>

        <el-form ref="formRef" :model="registerForm" :rules="rules" class="register-form">
          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
              placeholder="请输入用户名"
              size="large"
              clearable
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="nickname">
            <el-input
              v-model="registerForm.nickname"
              placeholder="请输入昵称"
              size="large"
              clearable
            >
              <template #prefix>
                <el-icon><ChatDotRound /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码（至少6位，包含字母和数字）"
              size="large"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              size="large"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item prop="email">
                <el-input
                  v-model="registerForm.email"
                  placeholder="邮箱（可选）"
                  size="large"
                >
                  <template #prefix>
                    <el-icon><Message /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item prop="phone">
                <el-input
                  v-model="registerForm.phone"
                  placeholder="手机号（可选）"
                  size="large"
                >
                  <template #prefix>
                    <el-icon><Phone /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleRegister"
              class="linear-btn linear-btn--primary linear-btn--full"
            >
              注册
            </el-button>
          </el-form-item>
        </el-form>

        <div class="register-footer">
          <el-divider />
          <p>已有账号？<router-link to="/admin/login">立即登录</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store'
import { User, Lock, ChatDotRound, Message, Phone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { register } from '@/services/api'
import gsap from 'gsap'

const router = useRouter()
const userStore = useUserStore()

const title = import.meta.env.VITE_APP_TITLE
const loading = ref(false)
const formRef = ref<FormInstance>()
const containerRef = ref<HTMLElement>()

const registerForm = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: ''
})

// 用户名验证
const validateUsername = (_rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请输入用户名'))
  } else if (value.length < 3) {
    callback(new Error('用户名长度不能少于3位'))
  } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    callback(new Error('用户名只能包含字母、数字和下划线'))
  } else {
    callback()
  }
}

// 昵称验证
const validateNickname = (_rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请输入昵称'))
  } else {
    callback()
  }
}

// 密码强度验证：至少6位
const validatePassword = (_rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 6) {
    callback(new Error('密码长度不能少于6位'))
  } else {
    callback()
  }
}

// 确认密码验证
const validateConfirmPassword = (_rule: any, value: any, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  username: [{ validator: validateUsername, trigger: 'blur' }],
  nickname: [{ validator: validateNickname, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

// 保存 GSAP 动画引用以便清理
let animations: gsap.core.Tween[] = []

// GSAP动画
onMounted(() => {
  if (containerRef.value) {
    const formWrapper = containerRef.value.querySelector('.register-form-wrapper')

    gsap.from(formWrapper, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    })
  }
})

onUnmounted(() => {
  // 清理所有动画
  animations.forEach(anim => anim.kill())
  animations = []
})

const handleRegister = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true

    try {
      const { confirmPassword, ...data } = registerForm
      const response = await register(data)

      // 保存token和用户信息
      userStore.setToken(response.token)
      userStore.setUserInfo(response.userInfo)

      ElMessage.success('注册成功')
      router.push('/admin/dashboard')
    } catch (error: any) {
      ElMessage.error(error.message || '注册失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.register-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.register-container {
  position: relative;
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.register-form-wrapper {
  width: 100%;
  max-width: 520px;
  padding: 40px;
  position: relative;
  z-index: 10;

  h1 {
    margin: 0 0 12px 0;
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);

    a {
      color: var(--accent);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-input__wrapper) {
    background-color: var(--background-elevated);
    box-shadow: none;
  }

  :deep(.el-input__inner) {
    color: var(--foreground);
  }

  :deep(.el-input__placeholder) {
    color: var(--foreground-muted);
  }
}

.register-footer {
  margin-top: 16px;
  text-align: center;

  p {
    margin: 16px 0 0 0;
    font-size: 13px;
    color: var(--text-secondary);

    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
        color: var(--accent-bright);
      }
    }
  }
}

@media (max-width: 768px) {
  .register-form-wrapper {
    padding: 30px 24px;
  }
}
</style>
