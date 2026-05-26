// 路由鉴权中间件
// 拦截未登录状态下的页面访问，重定向至登录页
// 已登录用户访问 /login 时自动跳转至首页

import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware((to) => {
  // 仅在客户端执行，因为认证状态依赖 Cookie 和 IndexedDB
  if (import.meta.server) return

  const { isLoggedIn } = useAuth()

  // 不需要鉴权的白名单路由
  const publicRoutes = ['/login']

  if (!isLoggedIn.value && !publicRoutes.includes(to.path)) {
    // 未登录且访问受保护页面 → 重定向到登录页
    return navigateTo('/login')
  }

  if (isLoggedIn.value && to.path === '/login') {
    // 已登录但访问登录页 → 重定向到首页
    return navigateTo('/dashboard')
  }
})
