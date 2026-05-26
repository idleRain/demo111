// 工单编号生成工具
// 格式：WO-YYYYMMDD-XXXX（日期+四位序号）

import dayjs from 'dayjs'
import { db } from '~/composables/database'

let lastGeneratedDate = ''
let sequenceCounter = 0

/**
 * 生成唯一工单编号
 * 同一天内序号递增，跨天重置
 */
export const generateOrderNo = async (): Promise<string> => {
  const today = dayjs().format('YYYYMMDD')

  // 日期变更时重新计算当日序号
  if (today !== lastGeneratedDate) {
    lastGeneratedDate = today
    const prefix = `WO-${today}-`

    // 查询当日已有工单数量，作为序号基数
    const todayOrders = await db.workOrders
      .where('orderNo')
      .startsWith(prefix)
      .count()
    sequenceCounter = todayOrders
  }

  sequenceCounter++
  return `WO-${today}-${String(sequenceCounter).padStart(4, '0')}`
}

/** 格式化时间戳为可读日期 */
export const formatDate = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
}

/** 格式化时间戳为简短日期 */
export const formatDateShort = (timestamp: number): string => {
  return dayjs(timestamp).format('MM-DD')
}

/** 工单状态映射 */
export const statusMap: Record<string, { label: string; color: string; tagType: string }> = {
  pending: { label: '待加工', color: '#E6A23C', tagType: 'warning' },
  processing: { label: '加工中', color: '#409EFF', tagType: '' },
  completed: { label: '已完成', color: '#67C23A', tagType: 'success' }
}

/** 获取工单状态显示信息 */
export const getStatusInfo = (status: string) => {
  return statusMap[status] || { label: '未知', color: '#909399', tagType: 'info' }
}
