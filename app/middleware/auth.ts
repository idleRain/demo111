// 路由鉴权中间件
// 拦截未登录状态下的页面访问，重定向至登录页
// 已登录用户访问 /login 时自动跳转至首页
//
// 关键：现在基于 Cookie 判断登录状态，SSR 也能正确读取
// 不再需要 import.meta.server 跳过逻辑

import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth()

  // 不需要鉴权的白名单路由
  const publicRoutes = ['/login', '/']

  if (!isLoggedIn.value && !publicRoutes.includes(to.path)) {
    // 未登录且访问受保护页面 → 重定向到登录页
    return navigateTo('/login')
  }

  if (isLoggedIn.value && to.path === '/login') {
    // 已登录但访问登录页 → 重定向到首页
    return navigateTo('/dashboard')
  }
})
