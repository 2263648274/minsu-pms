<template>
  <div class="detail-page">
    <el-card class="detail-card" shadow="never">
      <!-- 头部操作栏 -->
      <div class="detail-header">
        <h2 class="detail-title">{{ title }}</h2>
        <div class="detail-actions">
          <slot name="actions" />
        </div>
      </div>

      <el-divider />

      <!-- 详情内容 -->
      <div class="detail-content">
        <slot />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<style scoped lang="scss">
.detail-page {
  .detail-card {
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .detail-title {
        margin: 0;
        font-size: 20px;
        font-weight: bold;
        color: var(--text-primary);
      }

      .detail-actions {
        display: flex;
        gap: 12px;
      }
    }

    .detail-content {
      padding: 20px 0;
    }
  }
}
</style>
