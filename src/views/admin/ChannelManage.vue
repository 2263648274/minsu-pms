<template>
  <div class="channel-manage">
    <ModulePlaceholder
      title="OTA 渠道管理"
      subtitle="5 平台统一接入：携程 · 飞猪 · 美团 · 抖音 · 淘宝"
      icon="Connection"
      :phase="'Phase 4 待接入'"
      :active-step="2"
      :features="features"
    />

    <!-- Phase 1 骨架：5 平台适配器入口卡片 -->
    <el-card shadow="never" class="channels-grid">
      <template #header>
        <div class="card-header">
          <span>平台适配器入口</span>
          <el-tag type="info" size="small">Phase 1 骨架</el-tag>
        </div>
      </template>
      <el-row :gutter="16">
        <el-col v-for="ch in channelsWithStatus" :key="ch.id" :xs="24" :sm="12" :md="8" :lg="4">
          <el-card shadow="hover" class="channel-card" :body-style="{ padding: '16px' }">
            <div class="channel-logo" :style="{ background: ch.color }">{{ ch.short }}</div>
            <div class="channel-info">
              <div class="channel-name">{{ ch.displayName }}</div>
              <div class="channel-meta">
                <el-tag
                  size="small"
                  :type="ch.status === 'connected' ? 'success' : 'info'"
                  effect="plain"
                >
                  {{ statusLabel(ch.status) }}
                </el-tag>
              </div>
              <div class="channel-protocol">{{ ch.protocolLabel }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-alert
        title="Phase 4 实施说明"
        type="warning"
        :closable="false"
        show-icon
      >
        当前所有平台适配器为骨架实现，Phase 4 将按真实平台 API 文档接入：携程 PMS API、飞猪 OpenAPI、美团 PMS、抖音民宿 OpenAPI、淘宝飞猪接口。
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ModulePlaceholder from '@/components/pms/ModulePlaceholder.vue'
import { channelList, statusLabel } from '@/channels/adapters/registry'
import type { ChannelStatus } from '@/types/domain/channel'

// Phase 1：每个平台暂时展示一个 mock 状态，Phase 2 接入 ChannelConfig 后从后端拉
const mockStatuses: Record<string, ChannelStatus> = {
  ctrip: 'disconnected',
  fliggy: 'disconnected',
  meituan: 'disconnected',
  douyin: 'disconnected',
  taobao: 'disconnected'
}

const channelsWithStatus = computed(() =>
  channelList.map(c => ({ ...c, status: mockStatuses[c.id] || 'disconnected' }))
)

const features = [
  { label: 'API 凭证管理', description: 'AppKey / Secret / Token 安全存储与自动刷新', icon: 'Key' },
  { label: '库存/价格推送', description: '批量推送到指定渠道，失败自动重试', icon: 'Upload' },
  { label: '订单聚合', description: '统一拉取各渠道订单，自动转内部订单', icon: 'Download' },
  { label: '佣金对账', description: '按平台费率自动计算应收应付', icon: 'Wallet' }
]
</script>

<style scoped lang="scss">
.channel-manage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.channels-grid {
  .channel-card {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .channel-logo {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    color: #fff;
    font-weight: 700;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .channel-info {
    flex: 1;
    min-width: 0;

    .channel-name {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .channel-meta {
      margin-bottom: 4px;
    }

    .channel-protocol {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
}
</style>