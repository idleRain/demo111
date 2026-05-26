// 数据库客户端插件
// 仅在浏览器端运行，确保 IndexedDB 可用时初始化数据库

import { db } from '~/composables/database'

export default defineNuxtPlugin(() => {
  // 数据库实例已在 database.ts 中通过模块级代码初始化
  // 此插件确保 Nuxt 生命周期中正确加载数据库模块
  return {
    provide: {
      db
    }
  }
})
