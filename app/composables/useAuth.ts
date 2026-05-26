// 鉴权组合式函数
// 处理登录验证、Token管理、用户状态、权限判断
// 采用客户端 IndexedDB 验证 + Cookie 存储 Token 的伪全栈模式

import { db, type User } from '~/composables/database'

/** Cookie中存储的用户信息结构 */
interface AuthUserInfo {
  id: number
  username: string
  role: 'admin' | 'operator'
  name: string
}

export const useAuth = () => {
  // 使用Cookie持久化登录态，支持SSR时读取
  const authToken = useCookie('auth_token', { maxAge: 60 * 60 * 24 })     // 1天过期
  const authUser = useCookie('auth_user', { maxAge: 60 * 60 * 24 })

  /** 当前登录用户信息（响应式） */
  const currentUser = useState<AuthUserInfo | null>('auth-current-user', () => {
    if (import.meta.client && authUser.value) {
      try {
        return JSON.parse(authUser.value as string)
      } catch {
        return null
      }
    }
    return null
  })

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!currentUser.value)

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

    // 写入 Cookie 持久化
    authToken.value = token
    authUser.value = JSON.stringify(userInfo)
    currentUser.value = userInfo

    return userInfo
  }

  /** 退出登录，清除所有认证状态 */
  const logout = () => {
    authToken.value = null
    authUser.value = null
    currentUser.value = null
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
