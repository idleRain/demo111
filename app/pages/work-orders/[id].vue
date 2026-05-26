<!-- 工单详情页 - 左侧产品大图 + 右侧工单进度和操作日志 -->
<template>
  <div class="work-order-detail">
    <!-- 返回导航 -->
    <div class="detail-nav">
      <el-button text @click="navigateTo('/work-orders')">
        <el-icon><ArrowLeft /></el-icon> 返回工单列表
      </el-button>
    </div>

    <div v-if="order" class="detail-content">
      <!-- 左侧：产品信息与图片 -->
      <div class="detail-left">
        <div class="product-image-card">
          <el-image
            v-if="productImageUrl"
            :src="productImageUrl"
            fit="contain"
            class="product-large-img"
          />
          <div v-else class="no-image">
            <el-icon :size="48" color="#C0C4CC"><Picture /></el-icon>
            <span>暂无产品图片</span>
          </div>
        </div>

        <div class="product-info-card minimal-card">
          <h3 class="section-title">关联产品信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">产品编号</span>
              <span class="info-value">{{ product?.code || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">产品名称</span>
              <span class="info-value">{{ product?.name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">规格型号</span>
              <span class="info-value">{{ product?.spec || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">备注</span>
              <span class="info-value">{{ product?.remark || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：工单详情与操作日志 -->
      <div class="detail-right">
        <!-- 工单基本信息 -->
        <div class="order-info-card minimal-card">
          <div class="card-header-row">
            <h3 class="section-title">工单信息</h3>
            <el-tag :type="getStatusInfo(order.status).tagType">
              {{ getStatusInfo(order.status).label }}
            </el-tag>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">工单编号</span>
              <span class="info-value highlight">{{ order.orderNo }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">加工数量</span>
              <span class="info-value">{{ order.quantity }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">负责人</span>
              <span class="info-value">{{ order.assignee }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">更新时间</span>
              <span class="info-value">{{ formatDate(order.updatedAt) }}</span>
            </div>
            <div class="info-item" v-if="order.completedAt">
              <span class="info-label">完工时间</span>
              <span class="info-value">{{ formatDate(order.completedAt) }}</span>
            </div>
          </div>

          <!-- 工单备注 -->
          <div v-if="order.remark" class="order-remark">
            <span class="info-label">备注</span>
            <p>{{ order.remark }}</p>
          </div>

          <!-- 状态操作按钮 -->
          <div class="status-actions">
            <el-button
              v-if="order.status === 'pending'"
              type="primary"
              @click="changeStatus('processing')"
            >
              开始加工
            </el-button>
            <el-button
              v-if="order.status === 'processing'"
              type="success"
              @click="changeStatus('completed')"
            >
              标记完成
            </el-button>
            <el-button
              v-if="order.status === 'completed'"
              @click="changeStatus('pending')"
            >
              重新打开
            </el-button>
            <el-button type="danger" plain @click="handleDelete">删除工单</el-button>
          </div>
        </div>

        <!-- 操作日志 -->
        <div class="log-card minimal-card">
          <h3 class="section-title">操作日志</h3>
          <el-timeline v-if="logs.length > 0">
            <el-timeline-item
              v-for="log in logs"
              :key="log.id"
              :timestamp="formatDate(log.createdAt)"
              placement="top"
            >
              <div class="log-content">
                <span class="log-action">{{ log.action }}</span>
                <span class="log-operator">{{ log.operator }}</span>
              </div>
            </el-timeline-item>
          </el-timeline>
          <div v-else class="empty-logs">暂无操作记录</div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else class="loading-state">
      <el-icon :size="32" class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Picture, Loading } from '@element-plus/icons-vue'
import { db, type WorkOrder, type Product, type OperationLog } from '~/composables/database'
import { getStatusInfo, formatDate, statusMap } from '~/composables/useUtils'
import { msgSuccess, msgConfirm } from '~/composables/useMessage'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const { currentUser } = useAuth()

const order = ref<WorkOrder | null>(null)
const product = ref<Product | null>(null)
const productImageUrl = ref('')
const logs = ref<OperationLog[]>([])

/** 加载工单详情、关联产品和操作日志 */
const loadDetail = async () => {
  const id = Number(route.params.id)
  if (!id) return

  order.value = await db.workOrders.get(id) || null
  if (!order.value) return

  // 加载关联产品
  product.value = await db.products.get(order.value.productId) || null
  if (product.value?.image) {
    productImageUrl.value = URL.createObjectURL(product.value.image)
  }

  // 加载操作日志，按时间倒序
  logs.value = (await db.operationLogs.where('workOrderId').equals(id).toArray())
    .sort((a, b) => b.createdAt - a.createdAt)
}

onMounted(() => {
  loadDetail()
})

// 组件卸载时释放Blob URL
onUnmounted(() => {
  if (productImageUrl.value) {
    URL.revokeObjectURL(productImageUrl.value)
  }
})

/** 变更工单状态 */
const changeStatus = async (newStatus: WorkOrder['status']) => {
  if (!order.value) return
  const oldStatus = order.value.status
  const now = Date.now()

  const updateData: any = { status: newStatus, updatedAt: now }
  if (newStatus === 'completed') updateData.completedAt = now

  await db.workOrders.update(order.value.id!, updateData)

  // 记录操作日志
  await db.operationLogs.add({
    workOrderId: order.value.id!,
    action: `状态变更：${statusMap[oldStatus]?.label} → ${statusMap[newStatus]?.label}`,
    operator: currentUser.value?.name || '未知',
    fromStatus: oldStatus,
    toStatus: newStatus,
    createdAt: now
  })

  msgSuccess('工单状态已更新')
  await loadDetail()
}

/** 删除工单 */
const handleDelete = async () => {
  if (!order.value) return
  const confirmed = await msgConfirm(`确定删除工单「${order.value.orderNo}」吗？此操作不可恢复。`)
  if (!confirmed) return

  await db.workOrders.delete(order.value.id!)
  await db.operationLogs.where('workOrderId').equals(order.value.id!).delete()
  msgSuccess('工单已删除')
  navigateTo('/work-orders')
}
</script>

<style lang="scss" scoped>
.work-order-detail {
  .detail-nav {
    margin-bottom: 16px;
  }
}

.detail-content {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
}

// ==================== 左侧产品区域 ====================
.detail-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-image-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: $card-shadow;
  overflow: hidden;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;

  .product-large-img {
    width: 100%;
    height: 100%;
  }
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: $text-placeholder;
  font-size: 13px;
}

// ==================== 右侧工单区域 ====================
.detail-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// 通用信息网格
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 12px;
}

.info-item {
  .info-label {
    display: block;
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 4px;
  }

  .info-value {
    font-size: 14px;
    color: $text-primary;
    font-weight: 500;

    &.highlight {
      color: #409EFF;
      font-weight: 600;
    }
  }
}

// 卡片头部行
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

// 工单备注
.order-remark {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid $border-lighter;

  p {
    font-size: 13px;
    color: $text-regular;
    margin-top: 4px;
    line-height: 1.6;
  }
}

// 状态操作按钮
.status-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid $border-lighter;
  display: flex;
  gap: 8px;
}

// 操作日志
.log-content {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .log-action {
    font-size: 13px;
    color: $text-primary;
  }

  .log-operator {
    font-size: 12px;
    color: $text-secondary;
  }
}

.empty-logs {
  text-align: center;
  padding: 24px;
  color: $text-placeholder;
  font-size: 13px;
}

// 加载状态
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 12px;
  color: $text-secondary;
}
</style>
