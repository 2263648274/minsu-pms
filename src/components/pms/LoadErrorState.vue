<template>
  <div v-if="error" class="load-error-state" role="alert">
    <el-result icon="warning" title="数据加载失败" :sub-title="error">
      <template #extra>
        <el-button type="primary" :loading="retrying" @click="$emit('retry')">重试</el-button>
      </template>
    </el-result>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
/**
 * 页面级加载失败状态（issue #1）。
 * error 非空时展示失败原因（含后端请求标识，由 describeError 生成）与重试入口；
 * 否则渲染默认插槽。loading 仍由各页面的 v-loading 负责。
 * 仅在多个页面出现相同失败模式后才抽的公共组件，勿为单页问题引入。
 */
defineProps<{
  error: string | null
  retrying?: boolean
}>()

defineEmits<{ retry: [] }>()
</script>

<style scoped lang="scss">
.load-error-state {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
