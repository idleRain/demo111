import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './app/**/*.{vue,ts,tsx}',
  ],
  theme: {
    extend: {
      // 极简后台风色彩体系，与 SCSS variables 保持一致
      colors: {
        sidebar: {
          bg: '#1D1E1F',
          hover: '#2D2E2F',
          text: '#A0A4A8',
          active: '#FFFFFF',
        },
        workspace: '#F5F7FA',
        brand: {
          primary: '#409EFF',
          success: '#67C23A',
          warning: '#E6A23C',
          danger: '#F56C6C',
          info: '#909399',
        },
        text: {
          primary: '#303133',
          regular: '#606266',
          secondary: '#909399',
          placeholder: '#C0C4CC',
        },
        border: {
          light: '#E4E7ED',
          lighter: '#EBEEF5',
        },
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 20px 0 rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
