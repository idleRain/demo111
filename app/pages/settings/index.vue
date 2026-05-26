<!-- 系统设置 - 账号管理与权限信息 -->
<template>
  <div class="settings-page">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
      <p class="page-subtitle">管理账号信息与系统权限</p>
    </div>

    <!-- 当前登录信息 -->
    <div class="current-user-card minimal-card">
      <h3 class="section-title">当前登录信息</h3>
      <div class="user-profile">
        <div class="user-avatar-large">
          {{ currentUser?.name?.charAt(0) || '?' }}
        </div>
        <div class="user-meta">
          <div class="user-name-large">{{ currentUser?.name }}</div>
          <div class="user-role">
            <el-tag :type="currentUser?.role === 'admin' ? 'primary' : 'info'" size="small">
              {{ currentUser?.role === 'admin' ? '管理员' : '操作员' }}
            </el-tag>
          </div>
          <div class="user-detail">
            <span>账号：{{ currentUser?.username }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 账号列表 -->
    <div class="accounts-card minimal-card">
      <h3 class="section-title">系统账号</h3>
      <el-table :data="users" style="width: 100%; margin-top: 12px;">
        <el-table-column prop="username" label="账号" width="140" />
        <el-table-column prop="name" label="显示名称" width="140" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'primary' : 'info'" size="small">
              {{ row.role === 'admin' ? '管理员' : '操作员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 权限矩阵 -->
    <div class="permission-card minimal-card">
      <h3 class="section-title">权限矩阵</h3>
      <el-table :data="permissionMatrix" style="width: 100%; margin-top: 12px;">
        <el-table-column prop="module" label="功能模块" width="140" />
        <el-table-column prop="action" label="操作" min-width="200" />
        <el-table-column label="管理员" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.admin" color="#67C23A"><Check /></el-icon>
            <el-icon v-else color="#F56C6C"><Close /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="操作员" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.operator" color="#67C23A"><Check /></el-icon>
            <el-icon v-else color="#F56C6C"><Close /></el-icon>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Close } from '@element-plus/icons-vue'
import { db, type User } from '~/composables/database'
import { useAuth } from '~/composables/useAuth'
import { formatDate } from '~/composables/useUtils'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { currentUser } = useAuth()
const users = ref<User[]>([])

// 权限矩阵数据
const permissionMatrix = [
  { module: '首页大屏', action: '查看数据概览', admin: true, operator: true },
  { module: '产品管理', action: '查看/搜索产品', admin: true, operator: true },
  { module: '产品管理', action: '新增/编辑/删除产品', admin: true, operator: false },
  { module: '工单管理', action: '查看/创建工单', admin: true, operator: true },
  { module: '工单管理', action: '变更工单状态', admin: true, operator: true },
  { module: '工单管理', action: '删除工单', admin: true, operator: false },
  { module: '系统设置', action: '查看/修改系统配置', admin: true, operator: false },
  { module: '系统设置', action: '管理账号', admin: true, operator: false }
]

/** 加载用户列表 */
const loadUsers = async () => {
  users.value = await db.users.toArray()
}

onMounted(() => {
  loadUsers()
})
</script>

<style lang="scss" scoped>
.settings-page {
  .page-header {
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: $text-primary;
  }

  .page-subtitle {
    font-size: 13px;
    color: $text-secondary;
    margin-top: 4px;
  }
}

// 各卡片间距
.minimal-card {
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
}

// 当前用户信息
.user-profile {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 16px;
}

.user-avatar-large {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #409EFF;
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-meta {
  .user-name-large {
    font-size: 18px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 6px;
  }

  .user-detail {
    font-size: 13px;
    color: $text-secondary;
    margin-top: 4px;
  }
}
</style>
