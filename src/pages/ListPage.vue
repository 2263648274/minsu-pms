<template>
  <div class="list-page">
    <!-- 搜索表单插槽 -->
    <el-card class="search-card" shadow="never" v-if="$slots.search">
      <slot name="search" />
    </el-card>

    <!-- 操作栏 -->
    <div class="action-bar" v-if="$slots.actions">
      <slot name="actions" />
    </div>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="tableData"
        :border="border"
        :stripe="stripe"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="showSelection" type="selection" width="55" />
        <el-table-column v-if="showIndex" type="index" label="序号" width="60" />

        <!-- 动态列 -->
        <template v-for="column in columns" :key="column.prop">
          <el-table-column
            :prop="column.prop"
            :label="column.label"
            :width="column.width"
            :min-width="column.minWidth"
            :formatter="column.formatter"
          >
            <template #default="scope" v-if="column.slot">
              <slot :name="column.slot" :row="scope.row" :index="scope.$index" />
            </template>
          </el-table-column>
        </template>

        <!-- 操作列 -->
        <el-table-column v-if="showActions" label="操作" :width="actionWidth" fixed="right">
          <template #default="{ row }">
            <slot name="rowActions" :row="row" />
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="showPagination" class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSizeValue"
          :total="total"
          :page-sizes="pageSizes"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Column {
  prop: string
  label: string
  width?: number
  minWidth?: number
  formatter?: (row: any, column: any, cellValue: any, index: number) => string
  slot?: string
}

interface Props {
  columns: Column[]
  data: any[]
  loading?: boolean
  border?: boolean
  stripe?: boolean
  showSelection?: boolean
  showIndex?: boolean
  showActions?: boolean
  showPagination?: boolean
  actionWidth?: number
  total?: number
  page?: number
  pageSize?: number
  pageSizes?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  border: true,
  stripe: true,
  showSelection: false,
  showIndex: true,
  showActions: true,
  showPagination: true,
  actionWidth: 150,
  total: 0,
  page: 1,
  pageSize: 10,
  pageSizes: () => [10, 20, 50, 100]
})

const emit = defineEmits<{
  selectionChange: [selection: any[]]
  pageChange: [page: number]
  sizeChange: [pageSize: number]
}>()

const tableData = ref<any[]>([])
const currentPage = ref(props.page)
const pageSizeValue = ref(props.pageSize)
const totalValue = ref(props.total)

watch(() => props.data, (val) => {
  tableData.value = val
}, { immediate: true })

watch(() => props.total, (val) => {
  totalValue.value = val
})

watch(() => props.page, (val) => {
  currentPage.value = val
})

watch(() => props.pageSize, (val) => {
  pageSizeValue.value = val
})

watch(currentPage, (val) => {
  emit('pageChange', val)
})

watch(pageSizeValue, (val) => {
  emit('sizeChange', val)
})

const handleSelectionChange = (selection: any[]) => {
  emit('selectionChange', selection)
}
</script>

<style scoped lang="scss">
.list-page {
  .search-card {
    margin-bottom: 20px;
  }

  .action-bar {
    margin-bottom: 15px;
  }

  .pagination-section {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
