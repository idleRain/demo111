<!-- 工单管理 - 看板模式/表格模式双视图，支持拖拽改变状态 -->
<template>
  <div class="work-orders-page">
    <!-- 页面工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索工单编号或负责人..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable class="status-filter">
          <el-option label="待加工" value="pending" />
          <el-option label="加工中" value="processing" />
          <el-option label="已完成" value="completed" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="kanban">
            <el-icon><Grid /></el-icon> 看板
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon> 表格
          </el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 新建工单
        </el-button>
      </div>
    </div>

    <!-- 看板视图 -->
    <div v-if="viewMode === 'kanban'" class="kanban-view">
      <div
        v-for="column in kanbanColumns"
        :key="column.status"
        class="kanban-column"
        @dragover.prevent
        @drop="handleDrop($event, column.status)"
      >
        <div class="column-header" :style="{ borderTopColor: column.color }">
          <span class="column-title">{{ column.label }}</span>
          <el-tag size="small" round>{{ column.count }}</el-tag>
        </div>
        <div class="column-body">
          <div
            v-for="order in column.orders"
            :key="order.id"
            class="kanban-card"
            draggable="true"
            @dragstart="handleDragStart($event, order)"
            @click="navigateTo(`/work-orders/${order.id}`)"
          >
            <div class="kanban-card-header">
              <span class="order-no">{{ order.orderNo }}</span>
              <el-tag :type="getStatusInfo(order.status).tagType" size="small">
                {{ getStatusInfo(order.status).label }}
              </el-tag>
            </div>
            <div class="kanban-card-body">
              <div class="card-product">
                <el-icon><Goods /></el-icon>
                {{ getProductName(order.productId) }}
              </div>
              <div class="card-info">
                <span>数量：{{ order.quantity }}</span>
                <span>{{ order.assignee }}</span>
              </div>
            </div>
            <div class="kanban-card-footer">
              <span class="card-time">{{ formatDate(order.createdAt) }}</span>
            </div>
          </div>
          <div v-if="column.orders.length === 0" class="kanban-empty">
            暂无工单
          </div>
        </div>
      </div>
    </div>

    <!-- 表格视图 -->
    <div v-if="viewMode === 'table'" class="table-view">
      <el-table :data="filteredOrders" style="width: 100%">
        <el-table-column prop="orderNo" label="工单编号" width="180" />
        <el-table-column label="关联产品" min-width="140">
          <template #default="{ row }">
            {{ getProductName(row.productId) }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusInfo(row.status).tagType" size="small">
              {{ getStatusInfo(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assignee" label="负责人" width="120" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="navigateTo(`/work-orders/${row.id}`)">详情</el-button>
            <el-button text size="small" type="primary" @click="handleStatusChange(row)">变更状态</el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新建工单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新建工单"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="orderFormRef" :model="orderForm" :rules="orderRules" label-width="80px">
        <el-form-item label="关联产品" prop="productId">
          <el-select v-model="orderForm.productId" placeholder="请选择产品" filterable style="width: 100%">
            <el-option
              v-for="p in productList"
              :key="p.id"
              :label="`${p.code} - ${p.name}`"
              :value="p.id!"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="orderForm.quantity" :min="1" :max="99999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="负责人" prop="assignee">
          <el-input v-model="orderForm.assignee" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="orderForm.remark" type="textarea" :rows="3" placeholder="可选备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Search, Grid, List, Plus, Goods } from '@element-plus/icons-vue'
import { db, type WorkOrder, type Product } from '~/composables/database'
import { msgSuccess, msgError, msgConfirm } from '~/composables/useMessage'
import { generateOrderNo, getStatusInfo, formatDate, statusMap } from '~/composables/useUtils'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { currentUser } = useAuth()

// ==================== 数据与状态 ====================

const workOrders = ref<WorkOrder[]>([])
const productList = ref<Product[]>([])
const searchKeyword = ref('')
const statusFilter = ref('')
const viewMode = ref<'kanban' | 'table'>('kanban')
const dialogVisible = ref(false)
const saving = ref(false)
const orderFormRef = ref()

const orderForm = reactive({
  productId: null as number | null,
  quantity: 1,
  assignee: '',
  remark: ''
})

const orderRules = {
  productId: [{ required: true, message: '请选择关联产品', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  assignee: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
}

// ==================== 数据加载 ====================

const loadData = async () => {
  workOrders.value = await db.workOrders.toArray()
  productList.value = await db.products.toArray()
}

onMounted(() => {
  loadData()
})

/** 根据产品ID获取产品名称 */
const getProductName = (productId: number): string => {
  return productList.value.find(p => p.id === productId)?.name || '未知产品'
}

// ==================== 搜索与筛选 ====================

const filteredOrders = computed(() => {
  let result = [...workOrders.value]
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword) {
    result = result.filter(o =>
      o.orderNo.toLowerCase().includes(keyword) ||
      o.assignee.toLowerCase().includes(keyword)
    )
  }
  if (statusFilter.value) {
    result = result.filter(o => o.status === statusFilter.value)
  }
  return result.sort((a, b) => b.createdAt - a.createdAt)
})

// ==================== 看板视图数据 ====================

const kanbanColumns = computed(() => [
  {
    status: 'pending' as const,
    label: '待加工',
    color: '#E6A23C',
    count: filteredOrders.value.filter(o => o.status === 'pending').length,
    orders: filteredOrders.value.filter(o => o.status === 'pending')
  },
  {
    status: 'processing' as const,
    label: '加工中',
    color: '#409EFF',
    count: filteredOrders.value.filter(o => o.status === 'processing').length,
    orders: filteredOrders.value.filter(o => o.status === 'processing')
  },
  {
    status: 'completed' as const,
    label: '已完成',
    color: '#67C23A',
    count: filteredOrders.value.filter(o => o.status === 'completed').length,
    orders: filteredOrders.value.filter(o => o.status === 'completed')
  }
])

// ==================== 拖拽状态变更 ====================

let draggedOrder: WorkOrder | null = null

const handleDragStart = (_event: DragEvent, order: WorkOrder) => {
  draggedOrder = order
}

/** 拖拽放置后更新工单状态 */
const handleDrop = async (_event: DragEvent, newStatus: WorkOrder['status']) => {
  if (!draggedOrder || draggedOrder.status === newStatus) return

  const oldStatus = draggedOrder.status
  const now = Date.now()
  const updateData: any = {
    status: newStatus,
    updatedAt: now
  }

  // 完工时记录完成时间
  if (newStatus === 'completed') {
    updateData.completedAt = now
  }

  await db.workOrders.update(draggedOrder.id!, updateData)

  // 记录操作日志
  await db.operationLogs.add({
    workOrderId: draggedOrder.id!,
    action: `状态变更：${statusMap[oldStatus]?.label} → ${statusMap[newStatus]?.label}`,
    operator: currentUser.value?.name || '未知',
    fromStatus: oldStatus,
    toStatus: newStatus,
    createdAt: now
  })

  msgSuccess(`工单 ${draggedOrder.orderNo} 已移至「${statusMap[newStatus]?.label}」`)
  draggedOrder = null
  await loadData()
}

// ==================== 工单操作 ====================

/** 打开新建工单对话框 */
const showAddDialog = () => {
  Object.assign(orderForm, { productId: null, quantity: 1, assignee: '', remark: '' })
  dialogVisible.value = true
}

/** 保存新工单 */
const handleSave = async () => {
  const valid = await orderFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const orderNo = await generateOrderNo()
    const now = Date.now()

    const newId = await db.workOrders.add({
      orderNo,
      productId: orderForm.productId!,
      quantity: orderForm.quantity,
      status: 'pending',
      assignee: orderForm.assignee,
      remark: orderForm.remark,
      createdAt: now,
      updatedAt: now
    })

    // 记录操作日志
    await db.operationLogs.add({
      workOrderId: newId as number,
      action: '创建工单',
      operator: currentUser.value?.name || '未知',
      toStatus: 'pending',
      createdAt: now
    })

    msgSuccess(`工单 ${orderNo} 创建成功`)
    dialogVisible.value = false
    await loadData()
  } catch (e: any) {
    msgError(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

/** 变更工单状态（表格视图） */
const handleStatusChange = async (order: WorkOrder) => {
  const statusFlow: Record<string, string> = {
    pending: 'processing',
    processing: 'completed',
    completed: 'pending'
  }
  const newStatus = statusFlow[order.status] as WorkOrder['status']
  const oldStatus = order.status
  const now = Date.now()

  const updateData: any = { status: newStatus, updatedAt: now }
  if (newStatus === 'completed') updateData.completedAt = now

  await db.workOrders.update(order.id!, updateData)

  await db.operationLogs.add({
    workOrderId: order.id!,
    action: `状态变更：${statusMap[oldStatus]?.label} → ${statusMap[newStatus]?.label}`,
    operator: currentUser.value?.name || '未知',
    fromStatus: oldStatus,
    toStatus: newStatus,
    createdAt: now
  })

  msgSuccess(`工单 ${order.orderNo} 状态已更新`)
  await loadData()
}

/** 删除工单 */
const handleDelete = async (order: WorkOrder) => {
  const confirmed = await msgConfirm(`确定删除工单「${order.orderNo}」吗？此操作不可恢复。`)
  if (!confirmed) return

  await db.workOrders.delete(order.id!)
  // 同时删除关联的操作日志
  await db.operationLogs.where('workOrderId').equals(order.id!).delete()
  msgSuccess('工单已删除')
  await loadData()
}
</script>

<style lang="scss" scoped>
.work-orders-page {
  .page-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .toolbar-left {
    display: flex;
    gap: 12px;

    .search-input {
      width: 260px;
    }

    .status-filter {
      width: 140px;
    }
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

// ==================== 看板视图 ====================
.kanban-view {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  min-height: 500px;
}

.kanban-column {
  background: #fff;
  border-radius: 10px;
  box-shadow: $card-shadow;
  display: flex;
  flex-direction: column;
  border-top: 3px solid transparent;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid $border-lighter;

  .column-title {
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
  }
}

.column-body {
  flex: 1;
  padding: 8px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: grab;
  transition: all 0.2s;
  border: 1px solid transparent;

  &:hover {
    border-color: #409EFF;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  }

  &:active {
    cursor: grabbing;
  }
}

.kanban-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .order-no {
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
  }
}

.kanban-card-body {
  .card-product {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: $text-regular;
    margin-bottom: 4px;
  }

  .card-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: $text-secondary;
  }
}

.kanban-card-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid $border-lighter;

  .card-time {
    font-size: 11px;
    color: $text-placeholder;
  }
}

.kanban-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: $text-placeholder;
  font-size: 13px;
  border: 2px dashed $border-lighter;
  border-radius: 8px;
}

// ==================== 表格视图 ====================
.table-view {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: $card-shadow;
}
</style>
