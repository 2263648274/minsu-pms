<template>
  <ModulePlaceholder
    title="房价管理"
    subtitle="基础价、节假日价、渠道价、会员价、连住优惠"
    icon="Money"
    :phase="'Phase 2 计划中'"
    :active-step="1"
    :features="features"
  />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/pms/ModulePlaceholder.vue'

const features = [
  { label: '基础价日历', description: '按日期/房型设定每晚价格，支持批量调整', icon: 'Calendar' },
  { label: '节假日价', description: '周末、法定节假日、寒暑假自动套用差价', icon: 'Star' },
  { label: '渠道价', description: '为不同 OTA 平台设置不同结算价、卖价', icon: 'Connection' },
  { label: '会员价', description: '按 VIP 等级自动匹配折扣价', icon: 'Medal' }
]
</script>