// Element Plus 消息提示的统一封装
// 避免在每个组件中重复 import ElMessage/ElMessageBox

import { ElMessage, ElMessageBox } from 'element-plus'

/** 成功提示 */
export const msgSuccess = (message: string) => {
  ElMessage({ message, type: 'success', duration: 2000 })
}

/** 错误提示 */
export const msgError = (message: string) => {
  ElMessage({ message, type: 'error', duration: 3000 })
}

/** 警告提示 */
export const msgWarning = (message: string) => {
  ElMessage({ message, type: 'warning', duration: 2500 })
}

/** 确认对话框 - 用于删除等危险操作前的二次确认 */
export const msgConfirm = (message: string, title = '确认操作'): Promise<boolean> => {
  return ElMessageBox.confirm(message, title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => true).catch(() => false)
}
