<template>
  <div class="login-page linear-bg">
    <!-- Animated gradient blobs for Linear design -->
    <div class="linear-blob linear-blob--primary"></div>
    <div class="linear-blob linear-blob--secondary"></div>
    <div class="linear-blob linear-blob--tertiary"></div>
    <div class="linear-blob linear-blob--bottom"></div>

    <div class="login-container linear-content" ref="containerRef">
      <div class="login-form-wrapper linear-card">
        <div class="login-header linear-card-content">
          <h1>{{ title }}</h1>
          <p>管理后台登录</p>
        </div>

        <el-form ref="formRef" :model="loginForm" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              clearable
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="linear-btn linear-btn--primary linear-btn--full"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <el-divider />
          <p>还没有账号？<router-link to="/admin/register">立即注册</router-link></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store'
import { getPendingRoute, clearPendingRoute } from '@/router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import gsap from 'gsap'

const router = useRouter()
const userStore = useUserStore()

const title = import.meta.env.VITE_APP_TITLE
const loading = ref(false)
const formRef = ref<FormInstance>()
const containerRef = ref<HTMLElement>()

const loginForm = reactive({
  username: '',
  password: ''
})

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

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }]
}

// 保存 GSAP 动画引用以便清理
let animations: gsap.core.Tween[] = []

// GSAP动画
onMounted(() => {
  if (containerRef.value) {
    const formWrapper = containerRef.value.querySelector('.login-form-wrapper')

    gsap.from(formWrapper, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    })
  }
})

onUnmounted(() => {
  // 清理所有无限循环动画
  animations.forEach(anim => anim.kill())
  animations = []
})

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true

    try {
      await userStore.login(loginForm)

      ElMessage.success('登录成功')

      // 跳转到待跳转的路由或默认到仪表盘
      const pendingRoute = getPendingRoute()
      clearPendingRoute()
      router.push(pendingRoute || '/admin/dashboard')
    } catch (error: any) {
      ElMessage.error(error.message || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.login-container {
  position: relative;
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-form-wrapper {
  width: 100%;
  max-width: 420px;
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
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 24px;
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

.login-footer {
  margin-top: 24px;
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
  .login-form-wrapper {
    padding: 30px 24px;
  }
}
</style>
