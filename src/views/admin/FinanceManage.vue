<template>
  <ModulePlaceholder
    title="财务对账"
    subtitle="收入日报、月报、渠道佣金、退款、发票"
    icon="Wallet"
    :phase="'Phase 4 待接入'"
    :active-step="1"
    :features="features"
  />
</template>

<script setup lang="ts">
import ModulePlaceholder from '@/components/pms/ModulePlaceholder.vue'

const features = [
  { label: '收入日报', description: '按渠道拆分的当日营收、订单数、入住率', icon: 'DataLine' },
  { label: '渠道佣金', description: '各 OTA 平台佣金自动计提、对账差异告警', icon: 'Money' },
  { label: '退款管理', description: '原路退回、线下转账、凭证留档', icon: 'RefreshLeft' },
  { label: '电子发票', description: '对接税控系统，自动开具增值税普票/专票', icon: 'Tickets' }
]
</script>