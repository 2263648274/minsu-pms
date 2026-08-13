<template>
  <ModulePlaceholder
    title="营业报表"
    subtitle="入住率、ADR、RevPAR、渠道占比、复购率"
    icon="TrendCharts"
    :phase="'Phase 4 待接入'"
    :active-step="1"
    :features="features"
  />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/pms/ModulePlaceholder.vue'

const features = [
  { label: '核心指标', description: '入住率、ADR、RevPAR 三指标时间趋势', icon: 'TrendCharts' },
  { label: '渠道占比', description: '各 OTA 平台订单量、营收占比饼图', icon: 'PieChart' },
  { label: '客户分析', description: '新客/老客比例、复购率、客单价分布', icon: 'User' },
  { label: '报表导出', description: '日/周/月报 PDF/Excel 导出，支持邮件订阅', icon: 'Download' }
]
</script>