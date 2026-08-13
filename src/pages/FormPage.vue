<template>
  <div class="form-page">
    <el-card class="form-card" shadow="never">
      <!-- 头部 -->
      <div class="form-header">
        <h2 class="form-title">{{ title }}</h2>
        <p v-if="description" class="form-description">{{ description }}</p>
      </div>

      <el-divider />

      <!-- 表单内容 -->
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :label-width="labelWidth"
        :label-position="labelPosition"
      >
        <slot name="form" />
      </el-form>

      <el-divider />

      <!-- 操作按钮 -->
      <div class="form-footer">
        <slot name="footer">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
        </slot>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  title: string
  description?: string
  labelWidth?: string | number
  labelPosition?: 'left' | 'right' | 'top'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  labelWidth: '120px',
  labelPosition: 'right',
  loading: false
})
void props

const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const formRef = ref<FormInstance>()

const formData = defineModel<any>('formData', { default: () => ({}) })
const formRules = defineModel<FormRules>('formRules', { default: () => ({}) })

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (valid) {
      emit('submit')
    }
  })
}

const handleCancel = () => {
  emit('cancel')
}

defineExpose({
  formRef,
  validate: () => formRef.value?.validate(),
  resetFields: () => formRef.value?.resetFields()
})
</script>

<style scoped lang="scss">
.form-page {
  .form-card {
    max-width: 800px;
    margin: 0 auto;

    .form-header {
      .form-title {
        margin: 0 0 10px 0;
        font-size: 20px;
        font-weight: bold;
        color: var(--text-primary);
      }

      .form-description {
        margin: 0;
        font-size: 14px;
        color: var(--text-secondary);
      }
    }

    .form-footer {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 20px 0 0 0;
    }
  }
}
</style>
