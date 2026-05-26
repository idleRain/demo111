<!-- 根路由 - 自动重定向到登录页或首页 -->
<template>
  <div />
</template>

<script setup lang="ts">
// 根路由不做任何渲染，直接根据登录状态重定向
definePageMeta({
  layout: 'blank'
})

onMounted(() => {
  const authToken = useCookie('auth_token')
  if (authToken.value) {
    navigateTo('/dashboard', { replace: true })
  } else {
    navigateTo('/login', { replace: true })
  }
})
</script>
