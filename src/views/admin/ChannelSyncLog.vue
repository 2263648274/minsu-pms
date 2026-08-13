<template>
  <ModulePlaceholder
    title="渠道同步日志"
    subtitle="库存推送、价格同步、订单拉取的执行轨迹与失败重试"
    icon="Document"
    :phase="'Phase 4 待接入'"
    :active-step="1"
    :features="features"
  />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/pms/ModulePlaceholder.vue'

const features = [
  { label: '推送记录', description: '库存/价格每次推送的目标、成功/失败、耗时', icon: 'Upload' },
  { label: '拉取记录', description: '从各渠道拉取订单的时间、数量、转换结果', icon: 'Download' },
  { label: '失败重试', description: '可配置的重试策略与人工干预入口', icon: 'Refresh' },
  { label: '审计追溯', description: '操作人、时间戳、原始 payload、响应', icon: 'View' }
]
</script>