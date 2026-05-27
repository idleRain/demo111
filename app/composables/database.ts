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

/** 库存分类表 - 对物料进行分门别类管理 */
export interface InventoryCategory {
  id?: number
  name: string           // 分类名称，如"原材料"、"半成品"、"成品"、"辅料"
  code: string           // 分类编码，如"RAW"、"SEMI"、"FINISHED"、"AUX"
  parentId?: number      // 父级分类ID，支持多级分类树
  sort: number           // 排序权重，越小越靠前
  remark: string         // 分类备注
  createdAt: number
  updatedAt: number
}

/** 库存表 - 记录物料在仓库中的实时存量 */
export interface Inventory {
  id?: number
  productId: number      // 关联产品ID
  categoryId: number     // 关联分类ID
  quantity: number       // 当前库存数量
  unit: string           // 计量单位，如"个"、"件"、"kg"、"箱"
  warehouse: string      // 仓库名称/库位，如"A区-01架"
  safetyStock: number    // 安全库存量，低于此值触发预警
  batchNo?: string       // 批次号，支持批次追溯
  remark: string         // 库存备注
  createdAt: number
  updatedAt: number
}

// ==================== 数据库类 ====================

class ErpDatabase extends Dexie {
  users!: Table<User, number>
  products!: Table<Product, number>
  workOrders!: Table<WorkOrder, number>
  operationLogs!: Table<OperationLog, number>
  inventoryCategories!: Table<InventoryCategory, number>
  inventories!: Table<Inventory, number>

  constructor() {
    super('MinimalErpDB')

    // V1: 初始版本（users / products / workOrders / operationLogs）
    this.version(1).stores({
      users: '++id, username, role',
      products: '++id, code, name',
      workOrders: '++id, orderNo, productId, status, assignee',
      operationLogs: '++id, workOrderId'
    })

    // V2: 新增库存分类表和库存表
    this.version(2).stores({
      users: '++id, username, role',
      products: '++id, code, name',
      workOrders: '++id, orderNo, productId, status, assignee',
      operationLogs: '++id, workOrderId',
      inventoryCategories: '++id, code, name, parentId',
      inventories: '++id, productId, categoryId, warehouse, batchNo'
    })

    // V3: 库存分类表新增 sort 索引（支持 orderBy('sort') 查询）
    this.version(3).stores({
      users: '++id, username, role',
      products: '++id, code, name',
      workOrders: '++id, orderNo, productId, status, assignee',
      operationLogs: '++id, workOrderId',
      inventoryCategories: '++id, code, name, parentId, sort',
      inventories: '++id, productId, categoryId, warehouse, batchNo'
    })

    // 数据库首次创建时注入种子数据（图片在 open 后异步补充）
    this.on('populate', (transaction) => {
      const now = Date.now()
      const dateStr = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}${m}${day}`
      }
      const today = new Date()

      const usersTable = transaction.table('users')
      usersTable.bulkAdd([
        { username: 'admin', password: 'admin123', role: 'admin', name: '系统管理员', createdAt: now },
        { username: 'operator', password: 'oper123', role: 'operator', name: '生产操作员', createdAt: now }
      ])

      const productsTable = transaction.table('products')
      productsTable.bulkAdd([
        { code: 'P-001', name: '精密轴承', spec: '6205-2RS', remark: '标准深沟球轴承', createdAt: now, updatedAt: now },
        { code: 'P-002', name: '齿轮组件', spec: 'M2-Z20', remark: '直齿轮模数2齿数20', createdAt: now, updatedAt: now },
        { code: 'P-003', name: '密封垫片', spec: 'DN50-EPDM', remark: '法兰密封用', createdAt: now, updatedAt: now },
        { code: 'P-004', name: '电路板', spec: 'PCB-A04', remark: '四层板控制模块', createdAt: now, updatedAt: now },
        { code: 'P-005', name: '铝合金外壳', spec: 'AL-6061-T6', remark: '航空级铝合金', createdAt: now, updatedAt: now }
      ])

      const workOrdersTable = transaction.table('workOrders')
      workOrdersTable.bulkAdd([
        {
          orderNo: `WO-${dateStr(today)}-0001`, productId: 1, quantity: 50,
          status: 'processing', assignee: '生产操作员', remark: '加急订单，本周交付',
          createdAt: now - 86400000, updatedAt: now
        },
        {
          orderNo: `WO-${dateStr(today)}-0002`, productId: 2, quantity: 100,
          status: 'pending', assignee: '生产操作员', remark: '常规批量生产',
          createdAt: now - 43200000, updatedAt: now - 43200000
        },
        {
          orderNo: `WO-${dateStr(today)}-0003`, productId: 3, quantity: 30,
          status: 'completed', assignee: '系统管理员', remark: '已完工入库',
          createdAt: now - 172800000, updatedAt: now - 86400000, completedAt: now - 86400000
        },
        {
          orderNo: `WO-${dateStr(today)}-0004`, productId: 4, quantity: 200,
          status: 'processing', assignee: '生产操作员', remark: '电子客户订单',
          createdAt: now - 3600000, updatedAt: now
        },
        {
          orderNo: `WO-${dateStr(today)}-0005`, productId: 5, quantity: 80,
          status: 'pending', assignee: '系统管理员', remark: '航空配件，需质检报告',
          createdAt: now, updatedAt: now
        }
      ])

      // 注入库存分类种子数据（两级分类结构）
      const categoriesTable = transaction.table('inventoryCategories')
      categoriesTable.bulkAdd([
        { name: '原材料', code: 'RAW', sort: 1, remark: '生产用原材料', createdAt: now, updatedAt: now },
        { name: '半成品', code: 'SEMI', sort: 2, remark: '加工中的半成品', createdAt: now, updatedAt: now },
        { name: '成品', code: 'FINISHED', sort: 3, remark: '完工产成品', createdAt: now, updatedAt: now },
        { name: '辅料', code: 'AUX', sort: 4, remark: '辅助材料', createdAt: now, updatedAt: now },
        { name: '包装材料', code: 'PKG', sort: 5, remark: '包装用材料', createdAt: now, updatedAt: now }
      ])

      // 注入库存种子数据（关联产品和分类）
      const inventoriesTable = transaction.table('inventories')
      inventoriesTable.bulkAdd([
        { productId: 1, categoryId: 1, quantity: 500, unit: '个', warehouse: 'A区-01架', safetyStock: 100, batchNo: 'B20260501', remark: '常规库存', createdAt: now, updatedAt: now },
        { productId: 2, categoryId: 2, quantity: 200, unit: '件', warehouse: 'A区-02架', safetyStock: 50, batchNo: 'B20260502', remark: '待组装', createdAt: now, updatedAt: now },
        { productId: 3, categoryId: 4, quantity: 1000, unit: '片', warehouse: 'B区-01架', safetyStock: 200, batchNo: 'B20260503', remark: '辅料区存放', createdAt: now, updatedAt: now },
        { productId: 4, categoryId: 1, quantity: 30, unit: '块', warehouse: 'C区-电子仓', safetyStock: 50, batchNo: 'B20260504', remark: '⚠️低于安全库存', createdAt: now, updatedAt: now },
        { productId: 5, categoryId: 3, quantity: 150, unit: '个', warehouse: 'A区-03架', safetyStock: 30, batchNo: 'B20260505', remark: '成品区', createdAt: now, updatedAt: now }
      ])
    })
  }

  /** 为产品补充图片（需在数据库 open 之后异步调用） */
  async initProductImages() {
    const products = await this.products.toArray()
    if (products.length > 0 && !products[0].image) {
      const imageUrls = [
        import('~/assets/images/P-001.png'),
        import('~/assets/images/P-002.png'),
        import('~/assets/images/P-003.png'),
        import('~/assets/images/P-004.png'),
        import('~/assets/images/P-005.png')
      ]
      const modules = await Promise.all(imageUrls)
      const blobs = await Promise.all(
        modules.map(async (mod) => {
          const resp = await fetch(mod.default)
          return await resp.blob()
        })
      )
      await Promise.all(
        products.map((p, i) => this.products.update(p.id!, { image: blobs[i] }))
      )
    }
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
