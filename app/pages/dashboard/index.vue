<!-- 首页数据大屏 - 浅色背景 + 高对比度数据展示 -->
<template>
  <div class="dashboard">
    <!-- KPI 指标卡片行 -->
    <div class="kpi-row">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="kpi-card"
      >
        <div class="kpi-icon" :style="{ background: kpi.iconBg }">
          <el-icon :size="24" :color="kpi.iconColor"><component :is="kpi.icon" /></el-icon>
        </div>
        <div class="kpi-info">
          <div class="kpi-value">{{ kpi.value }}</div>
          <div class="kpi-label">{{ kpi.label }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 工单状态分布 - 环形图 -->
      <div class="chart-card">
        <h3 class="chart-title">工单状态分布</h3>
        <div class="chart-container">
          <ClientOnly>
            <v-chart :option="statusChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- 近7日工单完成趋势 - 折线图 -->
      <div class="chart-card chart-card-wide">
        <h3 class="chart-title">近7日工单完成趋势</h3>
        <div class="chart-container">
          <ClientOnly>
            <v-chart :option="trendChartOption" autoresize />
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="charts-row charts-row-reverse">
      <!-- 产品热度 TOP5 - 横向柱状图 -->
      <div class="chart-card chart-card-wide">
        <h3 class="chart-title">产品热度 TOP 5</h3>
        <div class="chart-container">
          <ClientOnly>
            <v-chart :option="productRankOption" autoresize />
          </ClientOnly>
        </div>
      </div>

      <!-- 最近工单动态 -->
      <div class="chart-card">
        <h3 class="chart-title">最近工单动态</h3>
        <div class="recent-orders">
          <div
            v-for="order in recentOrders"
            :key="order.id"
            class="recent-order-item"
            @click="navigateTo(`/work-orders/${order.id}`)"
          >
            <div
              class="order-status-dot"
              :style="{ background: getStatusInfo(order.status).color }"
            />
            <div class="order-info">
              <span class="order-no">{{ order.orderNo }}</span>
              <span class="order-assignee">{{ order.assignee }}</span>
            </div>
          </div>
          <div v-if="recentOrders.length === 0" class="empty-state">
            <span class="empty-text">暂无工单数据</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clock, Loading, CircleCheck, Goods } from '@element-plus/icons-vue'
import { db, type WorkOrder, type Product } from '~/composables/database'
import { getStatusInfo } from '~/composables/useUtils'
import dayjs from 'dayjs'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// ==================== 数据加载 ====================

const workOrders = ref<WorkOrder[]>([])
const products = ref<Product[]>([])

/** 加载所有工单和产品数据 */
const loadData = async () => {
  workOrders.value = await db.workOrders.toArray()
  products.value = await db.products.toArray()
}

onMounted(() => {
  loadData()
})

// ==================== KPI 指标计算 ====================

const kpiCards = computed(() => {
  const today = dayjs().startOf('day')
  const thisMonth = dayjs().startOf('month')

  const pendingCount = workOrders.value.filter(o => o.status === 'pending').length
  const processingCount = workOrders.value.filter(o => o.status === 'processing').length
  const completedThisMonth = workOrders.value.filter(
    o => o.status === 'completed' && o.completedAt && o.completedAt >= thisMonth.valueOf()
  ).length

  return [
    {
      label: '今日待办工单',
      value: pendingCount,
      icon: Clock,
      iconBg: 'rgba(230, 162, 60, 0.15)',
      iconColor: '#E6A23C'
    },
    {
      label: '进行中工单',
      value: processingCount,
      icon: Loading,
      iconBg: 'rgba(64, 158, 255, 0.15)',
      iconColor: '#409EFF'
    },
    {
      label: '本月完工量',
      value: completedThisMonth,
      icon: CircleCheck,
      iconBg: 'rgba(103, 194, 58, 0.15)',
      iconColor: '#67C23A'
    },
    {
      label: '产品总数',
      value: products.value.length,
      icon: Goods,
      iconBg: 'rgba(144, 147, 153, 0.15)',
      iconColor: '#909399'
    }
  ]
})

// ==================== 最近工单动态 ====================

const recentOrders = computed(() => {
  return [...workOrders.value]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)
})

// ==================== ECharts 图表配置 ====================

/** 工单状态分布 - 环形图 */
const statusChartOption = computed(() => {
  const pending = workOrders.value.filter(o => o.status === 'pending').length
  const processing = workOrders.value.filter(o => o.status === 'processing').length
  const completed = workOrders.value.filter(o => o.status === 'completed').length

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#E4E7ED', textStyle: { color: '#303133' } },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, color: '#606266', fontSize: 12 },
      labelLine: { lineStyle: { color: '#C0C4CC' } },
      data: [
        { value: pending, name: '待加工', itemStyle: { color: '#E6A23C' } },
        { value: processing, name: '加工中', itemStyle: { color: '#409EFF' } },
        { value: completed, name: '已完成', itemStyle: { color: '#67C23A' } }
      ]
    }]
  }
})

/** 近7日工单完成趋势 - 折线图 */
const trendChartOption = computed(() => {
  const days: string[] = []
  const completedData: number[] = []
  const createdData: number[] = []

  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day')
    days.push(date.format('MM-DD'))
    const dayStart = date.startOf('day').valueOf()
    const dayEnd = date.endOf('day').valueOf()

    createdData.push(workOrders.value.filter(o => o.createdAt >= dayStart && o.createdAt <= dayEnd).length)
    completedData.push(workOrders.value.filter(o => o.completedAt && o.completedAt >= dayStart && o.completedAt <= dayEnd).length)
  }

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#E4E7ED', textStyle: { color: '#303133' } },
    legend: { data: ['新建工单', '完成工单'], textStyle: { color: '#606266' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#DCDFE6' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#EBEEF5' } },
      axisLabel: { color: '#909399' }
    },
    series: [
      {
        name: '新建工单',
        type: 'line',
        smooth: true,
        data: createdData,
        lineStyle: { color: '#409EFF', width: 2 },
        itemStyle: { color: '#409EFF' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(64,158,255,0.3)' }, { offset: 1, color: 'rgba(64,158,255,0.02)' }] } }
      },
      {
        name: '完成工单',
        type: 'line',
        smooth: true,
        data: completedData,
        lineStyle: { color: '#67C23A', width: 2 },
        itemStyle: { color: '#67C23A' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(103,194,58,0.3)' }, { offset: 1, color: 'rgba(103,194,58,0.02)' }] } }
      }
    ]
  }
})

/** 产品热度 TOP5 - 横向柱状图 */
const productRankOption = computed(() => {
  // 统计每个产品关联的工单数量
  const productOrderCount: Record<number, number> = {}
  workOrders.value.forEach(o => {
    productOrderCount[o.productId] = (productOrderCount[o.productId] || 0) + 1
  })

  const top5 = Object.entries(productOrderCount)
    .map(([productId, count]) => ({
      name: products.value.find(p => p.id === Number(productId))?.name || '未知产品',
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .reverse()

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#E4E7ED', textStyle: { color: '#303133' } },
    grid: { left: '3%', right: '8%', bottom: '3%', top: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#EBEEF5' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: {
      type: 'category',
      data: top5.map(t => t.name),
      axisLine: { lineStyle: { color: '#DCDFE6' } },
      axisLabel: { color: '#606266', fontSize: 12 }
    },
    series: [{
      type: 'bar',
      data: top5.map(t => t.count),
      barWidth: 16,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#409EFF' }, { offset: 1, color: '#67C23A' }] }
      }
    }]
  }
})
</script>

<style lang="scss" scoped>
.dashboard {
  background: $dashboard-bg;
  border-radius: 12px;
  padding: 24px;
  min-height: calc(100vh - 104px);
}

// KPI 指标卡片
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.kpi-card {
  background: $dashboard-card-bg;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-info {
  .kpi-value {
    font-size: 28px;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.2;
  }

  .kpi-label {
    font-size: 13px;
    color: $text-secondary;
    margin-top: 2px;
  }
}

// 图表区域
.charts-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-bottom: 16px;

  &.charts-row-reverse {
    grid-template-columns: 2fr 1fr;
  }
}

.chart-card {
  background: $dashboard-card-bg;
  border-radius: 12px;
  padding: 20px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: $dashboard-text;
  margin-bottom: 12px;
}

.chart-container {
  height: 280px;

  :deep(.v-chart) {
    width: 100%;
    height: 100%;
  }
}

// 最近工单动态
.recent-orders {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
}

.recent-order-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.order-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.order-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;

  .order-no {
    font-size: 13px;
    color: $text-regular;
    font-weight: 500;
  }

  .order-assignee {
    font-size: 12px;
    color: $text-secondary;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;

  .empty-text {
    color: $text-secondary;
    font-size: 13px;
  }
}
</style>
