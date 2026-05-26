// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  app: {
    head: {
      title: '博信达云工单',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '博信达云工单 - 极简风轻量级ERP系统' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  // Element Plus 模块配置，按需引入组件
  modules: ['@element-plus/nuxt'],

  elementPlus: {
    importStyle: 'scss',
    themes: ['dark']
  },

  css: [
    '~/assets/styles/index.scss',
    'element-plus/theme-chalk/dark/css-vars.css'
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "~/assets/styles/variables.scss" as *;`
        }
      }
    }
  },

  // 路由守卫中间件全局注册
  runtimeConfig: {
    public: {
      appName: '博信达云工单'
    }
  }
})
