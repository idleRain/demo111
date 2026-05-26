// 数据库客户端插件
// 仅在浏览器端运行，确保 IndexedDB 可用时初始化数据库

import { db } from '~/composables/database'

export default defineNuxtPlugin(async () => {
  // 数据库实例已在 database.ts 中通过模块级代码初始化
  // 异步补充产品图片（populate 事务内不能发网络请求）
  try {
    await db.initProductImages()
  } catch (e) {
    console.warn('产品图片加载失败:', e)
  }
  return {
    provide: {
      db
    }
  }
})
