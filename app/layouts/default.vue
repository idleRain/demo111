<!-- 默认布局 - 深色侧边栏 + 浅灰工作区 -->
<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo区域 -->
      <div class="sidebar-logo" @click="navigateTo('/dashboard')">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="8" fill="#409EFF" />
          <path d="M10 14h20v2H10zm0 6h15v2H10zm0 6h18v2H10z" fill="#fff" />
        </svg>
        <span v-show="!sidebarCollapsed" class="logo-text">博信达云工单</span>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
          <span v-show="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- 底部折叠按钮 -->
      <div class="sidebar-footer">
        <div class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <el-icon :size="18">
            <Fold v-if="!sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-area" :class="{ expanded: sidebarCollapsed }">
      <!-- 顶部栏 -->
      <header class="top-bar">
        <div class="top-bar-left">
          <h2 class="page-title">{{ currentPageTitle }}</h2>
        </div>
        <div class="top-bar-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" class="user-avatar">
                {{ currentUser?.name?.charAt(0) || 'U' }}
              </el-avatar>
              <span class="user-name">{{ currentUser?.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <el-tag size="small" :type="currentUser?.role === 'admin' ? undefined : 'info'">
                    {{ currentUser?.role === 'admin' ? '管理员' : '操作员' }}
                  </el-tag>
                </el-dropdown-item>
                <el-dropdown-item divided command="settings">
                  <el-icon><Setting /></el-icon>系统设置
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="content-area">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DataBoard,
  Goods,
  Document,
  Box,
  Setting,
  Fold,
  Expand,
  ArrowDown,
  SwitchButton
} from '@element-plus/icons-vue'
import { useAuth } from '~/composables/useAuth'

const { currentUser, logout } = useAuth()
const route = useRoute()
const router = useRouter()
const sidebarCollapsed = ref(false)

/** 侧边栏菜单配置 */
const menuItems = [
  { path: '/dashboard', label: '数据大屏', icon: DataBoard },
  { path: '/products', label: '产品管理', icon: Goods },
  { path: '/work-orders', label: '工单管理', icon: Document },
  { path: '/inventory', label: '库存管理', icon: Box },
  { path: '/settings', label: '系统设置', icon: Setting }
]

/** 当前页面标题映射 */
const pageTitleMap: Record<string, string> = {
  '/dashboard': '数据大屏',
  '/products': '产品管理',
  '/products/add': '新增产品',
  '/work-orders': '工单管理',
  '/inventory': '库存管理',
  '/settings': '系统设置'
}

/** 计算当前页面标题 */
const currentPageTitle = computed(() => {
  return pageTitleMap[route.path] || pageTitleMap[route.matched[0]?.path] || '博信达云工单'
})

/** 判断菜单项是否激活 */
const isActive = (path: string): boolean => {
  return route.path.startsWith(path)
}

/** 下拉菜单命令处理 */
const handleCommand = (command: string) => {
  if (command === 'logout') {
    logout()
  } else if (command === 'settings') {
    router.push('/settings')
  }
}
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

// ==================== 侧边栏 ====================
.sidebar {
  width: 220px;
  background: $sidebar-bg;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;

  &.collapsed {
    width: 64px;
  }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  svg {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
  }
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: $sidebar-text;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background: $sidebar-hover-bg;
    color: $sidebar-active-text;
  }

  &.active {
    background: rgba(64, 158, 255, 0.15);
    color: #409EFF;

    .el-icon {
      color: #409EFF;
    }
  }

  .nav-label {
    font-size: 14px;
  }
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  color: $sidebar-text;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: $sidebar-hover-bg;
    color: $sidebar-active-text;
  }
}

// ==================== 主内容区 ====================
.main-area {
  flex: 1;
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s ease;

  &.expanded {
    margin-left: 64px;
  }
}

// 顶部栏
.top-bar {
  height: 56px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid $border-lighter;
  flex-shrink: 0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: #f5f7fa;
  }

  .user-avatar {
    background: #409EFF;
    color: #fff;
    font-size: 14px;
  }

  .user-name {
    font-size: 14px;
    color: $text-regular;
  }
}

// 内容区域
.content-area {
  flex: 1;
  padding: 24px;
  background: $workspace-bg;
}
</style>
