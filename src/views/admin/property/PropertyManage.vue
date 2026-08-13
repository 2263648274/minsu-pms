<template>
  <ModulePlaceholder
    title="房源管理"
    subtitle="管理物业、房型、图集、配套设施"
    icon="HomeFilled"
    :phase="'Phase 2 计划中'"
    :active-step="1"
    :features="features"
  />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/pms/ModulePlaceholder.vue'

const features = [
  { label: '物业档案', description: '地址、营业执照、发票主体、合同到期提醒', icon: 'OfficeBuilding' },
  { label: '房型管理', description: '房型分类、床型、面积、可住人数、配套设施', icon: 'House' },
  { label: '图集维护', description: '封面、轮播图、详情图，支持分房型上传', icon: 'Picture' },
  { label: '入住政策', description: '最早入住、最晚退房、是否允许加床、宠物政策', icon: 'Clock' }
]
</script>