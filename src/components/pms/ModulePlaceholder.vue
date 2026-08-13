<template>
  <div class="module-placeholder">
    <el-card shadow="never" class="hero-card">
      <div class="hero-content">
        <el-icon :size="48" color="var(--primary-color)">
          <component :is="iconComponent" />
        </el-icon>
        <div class="hero-text">
          <h2>{{ title }}</h2>
          <p class="subtitle">{{ subtitle }}</p>
        </div>
        <el-tag v-if="phase" type="warning" effect="plain" size="large">{{ phase }}</el-tag>
      </div>
    </el-card>

    <el-row :gutter="20" class="info-row">
      <el-col :xs="24" :md="12" v-for="item in features" :key="item.label">
        <el-card shadow="hover" class="feature-card">
          <div class="feature-title">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
          <div class="feature-desc">{{ item.description }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="roadmap-card">
      <template #header>
        <span>实施路线</span>
      </template>
      <el-steps :active="activeStep" align-center finish-status="success">
        <el-step title="Phase 1" description="业务抽象 + 路由骨架" />
        <el-step :title="`Phase ${currentPhase}`" description="本模块功能实现" />
        <el-step title="OTA 对接" description="5 平台适配器接入" />
        <el-step title="上线" description="数据联调与验收" />
      </el-steps>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as ElIcons from '@element-plus/icons-vue'

interface Props {
  /** 模块标题 */
  title: string
  /** 模块副标题 */
  subtitle?: string
  /** 主图标（Element Plus 图标名） */
  icon?: string
  /** 当前模块所属阶段标签（如 "Phase 2 计划中"） */
  phase?: string
  /** 当前激活到第几步（1-based） */
  activeStep?: number
  /** 功能特性卡片 */
  features?: Array<{
    label: string
    description: string
    icon: string
  }>
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'Document',
  phase: 'Phase 2 计划中',
  activeStep: 1,
  features: () => [],
  subtitle: ''
})

const iconComponent = computed(() => {
  return (ElIcons as any)[props.icon] || ElIcons.Document
})

const currentPhase = computed(() => {
  // 解析 "Phase N 计划中" 这样的标签
  const match = props.phase.match(/Phase (\d+)/)
  return match ? match[1] : '?'
})
</script>

<style scoped lang="scss">
.module-placeholder {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card {
  :deep(.el-card__body) {
    padding: 24px;
  }
}

.hero-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.hero-text {
  flex: 1;

  h2 {
    margin: 0 0 4px;
    font-size: 22px;
    color: var(--text-primary);
  }

  .subtitle {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.info-row {
  margin: 0 !important;
}

.feature-card {
  margin-bottom: 20px;

  .feature-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;

    .el-icon {
      color: var(--primary-color);
    }
  }

  .feature-desc {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
}

.roadmap-card {
  margin-top: 4px;
}
</style>