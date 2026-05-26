// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  // 指定源码目录为 app/，使 Nuxt 正确解析 ~ 和 @ 别名
  srcDir: 'app/',

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
    '~/assets/styles/index.scss'
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // 全局注入变量文件，使所有组件可直接使用 $sidebar-bg 等变量
          additionalData: `@use "~/assets/styles/variables.scss" as *;\n`,
          api: 'modern-compiler'
        }
      }
    }
  },

  runtimeConfig: {
    public: {
      appName: '博信达云工单'
    }
  }
})
