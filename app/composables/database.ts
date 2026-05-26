// Dexie.js 数据库定义与初始化
// 使用 IndexedDB 模拟全量数据库，支持图片 Blob 存储
// 所有数据操作均在客户端完成，实现零延迟本地 ERP 体验
//
// 重要：此文件会被 SSR 服务端导入，因此数据库实例化必须延迟到客户端执行
// 类型定义可以安全地在服务端使用

import Dexie, { type Table } from 'dexie'

// ==================== 数据模型定义 ====================

/** 用户表 - 支持管理员/操作员两级角色 */
export interface User {
  id?: number
  username: string
  password: string       // Demo阶段明文存储，生产环境需替换为bcrypt哈希
  role: 'admin' | 'operator'
  name: string           // 显示名称
  avatar?: string        // 头像 Blob URL
  createdAt: number      // 创建时间戳
}

/** 产品表 - 含图片Blob存储 */
export interface Product {
  id?: number
  code: string           // 产品编号，唯一标识
  name: string           // 产品名称
  spec: string           // 规格型号
  image?: Blob           // 产品图片，直接存入IndexedDB
  remark: string         // 备注
  createdAt: number
  updatedAt: number
}

/** 工单表 - 核心业务流转 */
export interface WorkOrder {
  id?: number
  orderNo: string        // 工单编号，自动生成（格式：WO-YYYYMMDD-XXXX）
  productId: number      // 关联产品ID
  quantity: number       // 加工数量
  status: 'pending' | 'processing' | 'completed'  // 待加工/加工中/已完成
  assignee: string       // 负责人
  remark: string         // 工单备注
  createdAt: number
  updatedAt: number
  completedAt?: number   // 完工时间
}

/** 操作日志表 - 记录工单状态变更 */
export interface OperationLog {
  id?: number
  workOrderId: number    // 关联工单ID
  action: string         // 操作描述
  operator: string       // 操作人
  fromStatus?: string    // 变更前状态
  toStatus?: string      // 变更后状态
  createdAt: number
}

// ==================== 数据库类 ====================

class ErpDatabase extends Dexie {
  users!: Table<User, number>
  products!: Table<Product, number>
  workOrders!: Table<WorkOrder, number>
  operationLogs!: Table<OperationLog, number>

  constructor() {
    super('MinimalErpDB')

    // 定义数据库版本和表结构
    // ++id 表示自增主键，后续字段为索引
    this.version(1).stores({
      users: '++id, username, role',
      products: '++id, code, name',
      workOrders: '++id, orderNo, productId, status, assignee',
      operationLogs: '++id, workOrderId'
    })

    // 数据库首次创建时注入种子数据
    this.on('populate', (transaction) => {
      const now = Date.now()
      // 日期格式化辅助函数，用于生成工单编号中的日期部分
      const dateStr = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}${m}${day}`
      }
      const today = new Date()

      // 注入默认用户（admin + operator 两级角色）
      const usersTable = transaction.table('users')
      usersTable.bulkAdd([
        {
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          name: '系统管理员',
          createdAt: now
        },
        {
          username: 'operator',
          password: 'oper123',
          role: 'operator',
          name: '生产操作员',
          createdAt: now
        }
      ])

      // 注入示例产品（覆盖轴承、齿轮、密封件、电路板、铝合金等典型制造品类）
      const productsTable = transaction.table('products')
      productsTable.bulkAdd([
        { code: 'P-001', name: '精密轴承', spec: '6205-2RS', remark: '标准深沟球轴承', createdAt: now, updatedAt: now },
        { code: 'P-002', name: '齿轮组件', spec: 'M2-Z20', remark: '直齿轮模数2齿数20', createdAt: now, updatedAt: now },
        { code: 'P-003', name: '密封垫片', spec: 'DN50-EPDM', remark: '法兰密封用', createdAt: now, updatedAt: now },
        { code: 'P-004', name: '电路板', spec: 'PCB-A04', remark: '四层板控制模块', createdAt: now, updatedAt: now },
        { code: 'P-005', name: '铝合金外壳', spec: 'AL-6061-T6', remark: '航空级铝合金', createdAt: now, updatedAt: now }
      ])

      // 注入示例工单（模拟不同状态：待加工/加工中/已完成）
      const workOrdersTable = transaction.table('workOrders')
      workOrdersTable.bulkAdd([
        {
          orderNo: `WO-${dateStr(today)}-0001`,
          productId: 1,
          quantity: 50,
          status: 'processing',
          assignee: '生产操作员',
          remark: '加急订单，本周交付',
          createdAt: now - 86400000,
          updatedAt: now
        },
        {
          orderNo: `WO-${dateStr(today)}-0002`,
          productId: 2,
          quantity: 100,
          status: 'pending',
          assignee: '生产操作员',
          remark: '常规批量生产',
          createdAt: now - 43200000,
          updatedAt: now - 43200000
        },
        {
          orderNo: `WO-${dateStr(today)}-0003`,
          productId: 3,
          quantity: 30,
          status: 'completed',
          assignee: '系统管理员',
          remark: '已完工入库',
          createdAt: now - 172800000,
          updatedAt: now - 86400000,
          completedAt: now - 86400000
        },
        {
          orderNo: `WO-${dateStr(today)}-0004`,
          productId: 4,
          quantity: 200,
          status: 'processing',
          assignee: '生产操作员',
          remark: '电子客户订单',
          createdAt: now - 3600000,
          updatedAt: now
        },
        {
          orderNo: `WO-${dateStr(today)}-0005`,
          productId: 5,
          quantity: 80,
          status: 'pending',
          assignee: '系统管理员',
          remark: '航空配件，需质检报告',
          createdAt: now,
          updatedAt: now
        }
      ])
    })
  }
}

// ==================== 数据库单例 ====================
// 使用懒初始化模式，仅在客户端首次访问时创建实例
// 避免在 SSR 服务端执行时访问 IndexedDB 导致报错

let _db: ErpDatabase | null = null

/** 获取数据库实例（仅客户端可用） */
export const getDb = (): ErpDatabase => {
  if (!_db) {
    if (!import.meta.client) {
      throw new Error('IndexedDB is not available in server-side rendering')
    }
    _db = new ErpDatabase()
  }
  return _db
}

// 为了向后兼容，导出 db 作为懒加载代理
// 在组件中使用时，确保只在 onMounted 或客户端逻辑中访问
export const db = new Proxy({} as ErpDatabase, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  }
})
