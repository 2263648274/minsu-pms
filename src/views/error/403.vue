<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-icon">🚫</div>
      <h1 class="error-code">403</h1>
      <h2 class="error-title">权限不足</h2>
      <p class="error-description">抱歉，您没有权限访问该页面</p>
      <el-button type="primary" @click="goBack">返回上一页</el-button>
      <el-button @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push('/admin/dashboard')
}
</script>

<style scoped lang="scss">
.error-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.error-content {
  text-align: center;
  color: white;
  padding: 4040px;

  .error-icon {
    font-size: 80px;
    margin-bottom: 20px;
  }

  .error-code {
    font-size: 120px;
    font-weight: bold;
    margin: 0 0 20px 0;
    text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);
  }

  .error-title {
    font-size: 32px;
    margin: 0 0 20px 0;
    text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
  }

  .error-description {
    font-size: 18px;
    margin: 0 0 40px 0;
    opacity: 0.9;
  }

  .el-button {
    margin: 0 10px;
  }
}
</style>
