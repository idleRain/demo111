// v-permission 自定义指令
// 根据用户角色控制按钮/元素的显隐，实现按钮级权限控制
// 用法：v-permission="'admin'" 或 v-permission="['admin', 'operator']"

import { useAuth } from '~/composables/useAuth'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('permission', {
    mounted(el: HTMLElement, binding) {
      const { currentUser } = useAuth()
      const requiredRoles: string[] = Array.isArray(binding.value)
        ? binding.value
        : [binding.value]

      if (!currentUser.value) {
        el.style.display = 'none'
        return
      }

      // operator 权限最低，admin 拥有所有权限
      const hasAccess = requiredRoles.includes(currentUser.value.role) ||
        (currentUser.value.role === 'admin' && requiredRoles.includes('operator'))

      if (!hasAccess) {
        el.style.display = 'none'
      }
    }
  })
})
