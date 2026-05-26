<!-- 登录页 - 居中白卡片 + 极简背景 -->
<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-bg">
      <div class="bg-circle bg-circle-1" />
      <div class="bg-circle bg-circle-2" />
      <div class="bg-circle bg-circle-3" />
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="#409EFF" />
            <path d="M10 14h20v2H10zm0 6h15v2H10zm0 6h18v2H10z" fill="#fff" />
          </svg>
        </div>
        <h1 class="login-title">博信达云工单</h1>
        <p class="login-subtitle">极简风轻量级 ERP 系统</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入账号"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <el-divider>演示账号</el-divider>
        <div class="demo-accounts">
          <el-tag type="info" size="small" @click="fillAccount('admin')">
            管理员：admin / admin123
          </el-tag>
          <el-tag type="info" size="small" @click="fillAccount('operator')">
            操作员：operator / oper123
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { User, Lock } from '@element-plus/icons-vue'
import { useAuth } from '~/composables/useAuth'
import { msgError } from '~/composables/useMessage'

definePageMeta({
  layout: 'blank',
  middleware: 'auth'
})

const { login } = useAuth()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

/** 快速填充演示账号 */
const fillAccount = (type: 'admin' | 'operator') => {
  if (type === 'admin') {
    form.username = 'admin'
    form.password = 'admin123'
  } else {
    form.username = 'operator'
    form.password = 'oper123'
  }
}

/** 执行登录 */
const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await login(form.username, form.password)
    navigateTo('/dashboard')
  } catch (e: any) {
    msgError(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  position: relative;
  overflow: hidden;
}

// 背景装饰圆
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.06;
  background: #409EFF;
}

.bg-circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -80px;
}

.bg-circle-2 {
  width: 300px;
  height: 300px;
  bottom: -60px;
  left: -60px;
}

.bg-circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 10%;
  opacity: 0.03;
}

// 登录卡片
.login-card {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px 32px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;

  svg {
    width: 48px;
    height: 48px;
  }
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.login-subtitle {
  font-size: 13px;
  color: #909399;
}

// 表单样式
.login-form {
  :deep(.el-input__wrapper) {
    border-radius: 8px;
  }
}

.login-btn {
  width: 100%;
  border-radius: 8px;
  font-size: 15px;
  letter-spacing: 2px;
}

// 底部演示账号
.login-footer {
  margin-top: 8px;

  :deep(.el-divider__text) {
    font-size: 12px;
    color: #C0C4CC;
    background: #fff;
  }
}

.demo-accounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;

  .el-tag {
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;

    &:hover {
      color: #409EFF;
      border-color: #409EFF;
    }
  }
}
</style>
