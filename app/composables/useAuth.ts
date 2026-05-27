// 鉴权组合式函数
// 处理登录验证、Token管理、用户状态、权限判断
// 采用客户端 IndexedDB 验证 + Cookie 存储 Token 的伪全栈模式
//
// 关键设计：登录态持久化依赖 Cookie，而非 useState
// useState 在 SSR 时无法读取客户端 Cookie，导致刷新后状态丢失
// 因此 currentUser 的初始化必须在客户端水合后从 Cookie 恢复

import { db, type User } from '~/composables/database'

/** Cookie中存储的用户信息结构 */
interface AuthUserInfo {
  id: number
  username: string
  role: 'admin' | 'operator'
  name: string
}

export const useAuth = () => {
  // 使用Cookie持久化登录态，Cookie 在 SSR 和客户端都可读取
  const authToken = useCookie('auth_token', { maxAge: 60 * 60 * 24 })     // 1天过期
  const authUser = useCookie<AuthUserInfo | null>('auth_user', { maxAge: 60 * 60 * 24 })

  /**
   * 当前登录用户信息（响应式）
   *
   * 核心修复：不再使用 useState 初始化（SSR 时无法读 Cookie 导致 null）
   * 改为直接从 authUser Cookie 派生，Cookie 在 SSR/CSR 都可读
   */
  const currentUser = computed(() => authUser.value ?? null)

  /** 是否已登录 — 基于 Cookie 是否存在判断，刷新不丢失 */
  const isLoggedIn = computed(() => !!authToken.value && !!authUser.value)

  /** 是否为管理员 */
  const isAdmin = computed(() => currentUser.value?.role === 'admin')

  /**
   * 登录验证
   * 从 IndexedDB 查询用户，比对密码后签发 Token
   */
  const login = async (username: string, password: string): Promise<AuthUserInfo> => {
    // 从本地 IndexedDB 查询用户
    const user = await db.users.where('username').equals(username).first()

    if (!user || user.password !== password) {
      throw new Error('账号或密码错误')
    }

    // 生成简易 Token（Base64编码，Demo阶段，生产环境应使用JWT）
    const token = btoa(`${user.username}:${user.id}:${Date.now()}`)
    const userInfo: AuthUserInfo = {
      id: user.id!,
      username: user.username,
      role: user.role,
      name: user.name
    }

    // 写入 Cookie 持久化（SSR/CSR 均可读取）
    authToken.value = token
    authUser.value = userInfo

    return userInfo
  }

  /** 退出登录，清除所有认证状态 */
  const logout = () => {
    authToken.value = null
    authUser.value = null
    navigateTo('/login')
  }

  /**
   * 权限检查
   * 用于按钮级别的权限控制（对应 v-permission 指令）
   */
  const hasPermission = (requiredRole: 'admin' | 'operator'): boolean => {
    if (!currentUser.value) return false
    if (requiredRole === 'operator') return true  // 管理员和操作员都能访问操作员权限
    return currentUser.value.role === 'admin'      // 仅管理员能访问管理员权限
  }

  return {
    currentUser,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    hasPermission
  }
}
