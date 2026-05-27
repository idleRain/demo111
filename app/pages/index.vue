<!-- 根路由 - 自动重定向到登录页或首页 -->
<template>
  <div />
</template>

<script setup lang="ts">
// 根路由不做任何渲染，直接根据登录状态重定向
definePageMeta({
  layout: 'blank'
})

// 使用 useAuth 的 isLoggedIn（基于 Cookie），SSR 时也能正确判断
const { isLoggedIn } = useAuth()

if (import.meta.server) {
  // SSR 时直接服务端重定向，避免页面闪烁
  if (isLoggedIn.value) {
    navigateTo('/dashboard', { redirectCode: 302 })
  } else {
    navigateTo('/login', { redirectCode: 302 })
  }
} else {
  // 客户端也做一次兜底
  onMounted(() => {
    if (isLoggedIn.value) {
      navigateTo('/dashboard', { replace: true })
    } else {
      navigateTo('/login', { replace: true })
    }
  })
}
</script>
