<!-- 库存管理 - 录入、分类、查询、修改（TailwindCSS样式） -->
<template>
  <div class="p-0">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-text-primary">库存管理</h2>
        <p class="text-sm text-text-secondary mt-1">管理物料库存、分类与库位信息</p>
      </div>
      <div class="flex gap-3">
        <el-button @click="showCategoryDialog = true">
          <el-icon><Folder /></el-icon> 分类管理
        </el-button>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon> 录入库存
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg p-4 shadow-card">
        <div class="text-text-secondary text-xs mb-1">物料种类</div>
        <div class="text-2xl font-bold text-text-primary">{{ inventories.length }}</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-card">
        <div class="text-text-secondary text-xs mb-1">库存总量</div>
        <div class="text-2xl font-bold text-brand-primary">{{ totalQuantity }}</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-card">
        <div class="text-text-secondary text-xs mb-1">分类数量</div>
        <div class="text-2xl font-bold text-brand-success">{{ categories.length }}</div>
      </div>
      <div class="bg-white rounded-lg p-4 shadow-card">
        <div class="text-text-secondary text-xs mb-1">库存预警</div>
        <div class="text-2xl font-bold text-brand-danger">{{ warningCount }}</div>
      </div>
    </div>

    <!-- 搜索与筛选栏 -->
    <div class="bg-white rounded-lg p-4 shadow-card mb-6">
      <div class="flex items-center gap-4 flex-wrap">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索产品名称、编号、批次号..."
          :prefix-icon="Search"
          clearable
          class="!w-72"
        />
        <el-select v-model="filterCategory" placeholder="按分类筛选" clearable class="!w-48">
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-select v-model="filterWarning" placeholder="库存状态" clearable class="!w-40">
          <el-option label="正常" value="normal" />
          <el-option label="低于安全库存" value="warning" />
        </el-select>
        <el-button @click="resetFilters" text>
          <el-icon><RefreshRight /></el-icon> 重置
        </el-button>
      </div>
    </div>

    <!-- 库存表格 -->
    <div class="bg-white rounded-lg shadow-card overflow-hidden">
      <el-table :data="filteredList" style="width: 100%" :row-class-name="rowClassName">
        <el-table-column label="产品信息" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-image
                v-if="row.imageUrl"
                :src="row.imageUrl"
                fit="cover"
                class="!w-10 !h-10 !rounded-md !flex-shrink-0"
              />
              <div v-else class="w-10 h-10 rounded-md bg-workspace flex items-center justify-center flex-shrink-0">
                <el-icon :size="18" color="#C0C4CC"><Goods /></el-icon>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-text-primary truncate">{{ row.productName }}</div>
                <div class="text-xs text-text-secondary">{{ row.productCode }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="categoryTagType(row.categoryId)">
              {{ row.categoryName }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="库存/安全库存" width="160">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span :class="row.quantity <= row.safetyStock ? 'text-brand-danger font-semibold' : 'text-text-primary'">
                {{ row.quantity }}
              </span>
              <span class="text-text-placeholder">/</span>
              <span class="text-text-secondary">{{ row.safetyStock }}</span>
              <span class="text-text-placeholder text-xs">{{ row.unit }}</span>
              <el-icon v-if="row.quantity <= row.safetyStock" color="#F56C6C" :size="14"><Warning /></el-icon>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="warehouse" label="库位" width="140" />

        <el-table-column prop="batchNo" label="批次号" width="140">
          <template #default="{ row }">
            <span class="text-text-secondary font-mono text-xs">{{ row.batchNo || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-2">
              <el-button size="small" text type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button size="small" text type="warning" @click="openStockDialog(row)">调拨</el-button>
              <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="filteredList.length === 0" class="flex flex-col items-center justify-center py-16 text-text-secondary">
        <el-icon :size="48" class="opacity-40 mb-3"><Box /></el-icon>
        <span class="text-sm">暂无库存数据</span>
      </div>
    </div>

    <!-- ==================== 录入/编辑库存对话框 ==================== -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑库存' : '录入库存'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="关联产品" prop="productId">
          <el-select
            v-model="form.productId"
            placeholder="选择产品"
            filterable
            class="!w-full"
            :disabled="isEditing"
          >
            <el-option
              v-for="p in productList"
              :key="p.id"
              :label="`${p.code} - ${p.name}`"
              :value="p.id!"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="库存分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="选择分类" class="!w-full">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id!"
            />
          </el-select>
        </el-form-item>

        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="库存数量" prop="quantity">
            <el-input-number v-model="form.quantity" :min="0" class="!w-full" />
          </el-form-item>
          <el-form-item label="计量单位" prop="unit">
            <el-select v-model="form.unit" placeholder="单位" class="!w-full">
              <el-option v-for="u in unitOptions" :key="u" :label="u" :value="u" />
            </el-select>
          </el-form-item>
        </div>

        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="安全库存" prop="safetyStock">
            <el-input-number v-model="form.safetyStock" :min="0" class="!w-full" />
          </el-form-item>
          <el-form-item label="库位" prop="warehouse">
            <el-input v-model="form.warehouse" placeholder="如 A区-01架" />
          </el-form-item>
        </div>

        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" placeholder="选填，支持批次追溯" />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 库存调拨对话框 ==================== -->
    <el-dialog
      v-model="stockDialogVisible"
      title="库存调拨"
      width="440px"
      :close-on-click-modal="false"
    >
      <div class="mb-4" v-if="stockTarget">
        <div class="text-sm text-text-secondary mb-1">产品：{{ stockTarget.productName }}</div>
        <div class="text-sm text-text-secondary">当前库存：<span class="font-semibold text-text-primary">{{ stockTarget.quantity }} {{ stockTarget.unit }}</span></div>
      </div>

      <el-form ref="stockFormRef" :model="stockForm" :rules="stockFormRules" label-width="80px">
        <el-form-item label="调拨类型" prop="type">
          <el-radio-group v-model="stockForm.type">
            <el-radio-button value="in">入库 (+)</el-radio-button>
            <el-radio-button value="out">出库 (-)</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数量" prop="amount">
          <el-input-number v-model="stockForm.amount" :min="1" class="!w-full" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockForm.remark" placeholder="调拨原因" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockSaving" @click="handleStockChange">确认调拨</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 分类管理对话框 ==================== -->
    <el-dialog v-model="showCategoryDialog" title="分类管理" width="600px">
      <div class="flex justify-between items-center mb-4">
        <span class="text-sm text-text-secondary">共 {{ categories.length }} 个分类</span>
        <el-button size="small" type="primary" @click="openCategoryForm(null)">
          <el-icon><Plus /></el-icon> 新增分类
        </el-button>
      </div>

      <el-table :data="categories" size="small">
        <el-table-column prop="code" label="编码" width="100">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="分类名称" width="140" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openCategoryForm(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDeleteCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 内嵌分类编辑表单 -->
      <div v-if="categoryFormVisible" class="mt-4 pt-4 border-t border-border-lighter">
        <h4 class="text-sm font-semibold text-text-primary mb-3">
          {{ editingCategory ? '编辑分类' : '新增分类' }}
        </h4>
        <el-form :model="categoryForm" :rules="categoryFormRules" ref="categoryFormRef" label-width="80px" size="small">
          <div class="grid grid-cols-2 gap-x-4">
            <el-form-item label="分类名称" prop="name">
              <el-input v-model="categoryForm.name" placeholder="如：原材料" />
            </el-form-item>
            <el-form-item label="分类编码" prop="code">
              <el-input v-model="categoryForm.code" placeholder="如：RAW" />
            </el-form-item>
          </div>
          <div class="grid grid-cols-2 gap-x-4">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="categoryForm.sort" :min="0" class="!w-full" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="categoryForm.remark" placeholder="选填" />
            </el-form-item>
          </div>
          <div class="flex justify-end gap-2">
            <el-button size="small" @click="categoryFormVisible = false">取消</el-button>
            <el-button size="small" type="primary" :loading="categorySaving" @click="handleSaveCategory">保存</el-button>
          </div>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 库存管理页面 - 支持录入、分类、查询、修改、调拨
// 样式使用 TailwindCSS 工具类，与 Element Plus 组件配合

import { Search, Plus, Folder, Goods, Warning, Box, RefreshRight } from '@element-plus/icons-vue'
import { db, type Inventory, type InventoryCategory, type Product } from '~/composables/database'
import { msgSuccess, msgError, msgConfirm } from '~/composables/useMessage'
import { formatDate } from '~/composables/useUtils'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// ==================== 数据加载 ====================

const inventories = ref<Inventory[]>([])
const categories = ref<InventoryCategory[]>([])
const productList = ref<Product[]>([])
const productImageUrls = ref<Record<number, string>>({})

/** 加载所有基础数据 */
const loadData = async () => {
  inventories.value = await db.inventories.toArray()
  categories.value = await db.inventoryCategories.orderBy('sort').toArray()
  productList.value = await db.products.toArray()

  // 为产品生成图片 URL（Blob → ObjectURL）
  const urlMap: Record<number, string> = {}
  for (const p of productList.value) {
    if (p.image) {
      urlMap[p.id!] = URL.createObjectURL(p.image)
    }
  }
  productImageUrls.value = urlMap
}

onMounted(() => loadData())

// ==================== 搜索与筛选 ====================

const searchKeyword = ref('')
const filterCategory = ref<number | ''>('')
const filterWarning = ref<'' | 'normal' | 'warning'>('')

/** 重置所有筛选条件 */
const resetFilters = () => {
  searchKeyword.value = ''
  filterCategory.value = ''
  filterWarning.value = ''
}

/** 辅助：根据分类ID获取分类名称 */
const getCategoryName = (categoryId: number): string => {
  return categories.value.find(c => c.id === categoryId)?.name || '未分类'
}

/** 辅助：根据产品ID获取产品信息 */
const getProductInfo = (productId: number): { name: string; code: string } => {
  const p = productList.value.find(item => item.id === productId)
  return { name: p?.name || '未知产品', code: p?.code || '' }
}

/** 分类标签颜色映射 */
const categoryTagType = (categoryId: number): string => {
  const code = categories.value.find(c => c.id === categoryId)?.code || ''
  const map: Record<string, string> = {
    RAW: 'warning',    // 原材料 - 橙色
    SEMI: '',          // 半成品 - 蓝色
    FINISHED: 'success', // 成品 - 绿色
    AUX: 'info',       // 辅料 - 灰色
    PKG: 'danger'      // 包装 - 红色
  }
  return map[code] || 'info'
}

/** 筛选后的列表（合并产品名称、分类名称、图片URL） */
const filteredList = computed(() => {
  let result = inventories.value.map(inv => {
    const product = getProductInfo(inv.productId)
    return {
      ...inv,
      productName: product.name,
      productCode: product.code,
      categoryName: getCategoryName(inv.categoryId),
      imageUrl: productImageUrls.value[inv.productId] || ''
    }
  })

  // 关键词搜索
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword) {
    result = result.filter(item =>
      item.productName.toLowerCase().includes(keyword) ||
      item.productCode.toLowerCase().includes(keyword) ||
      (item.batchNo && item.batchNo.toLowerCase().includes(keyword))
    )
  }

  // 分类筛选
  if (filterCategory.value) {
    result = result.filter(item => item.categoryId === filterCategory.value)
  }

  // 库存预警筛选
  if (filterWarning.value === 'warning') {
    result = result.filter(item => item.quantity <= item.safetyStock)
  } else if (filterWarning.value === 'normal') {
    result = result.filter(item => item.quantity > item.safetyStock)
  }

  return result
})

// ==================== 统计指标 ====================

const totalQuantity = computed(() => inventories.value.reduce((sum, inv) => sum + inv.quantity, 0))
const warningCount = computed(() => inventories.value.filter(inv => inv.quantity <= inv.safetyStock).length)

/** 表格行样式：低于安全库存的行高亮 */
const rowClassName = ({ row }: { row: any }): string => {
  return row.quantity <= row.safetyStock ? 'bg-red-50' : ''
}

// ==================== 录入/编辑库存 ====================

const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref()

const unitOptions = ['个', '件', 'kg', '箱', '片', '块', '套', '米', '升']

const form = reactive({
  productId: null as number | null,
  categoryId: null as number | null,
  quantity: 0,
  unit: '个',
  warehouse: '',
  safetyStock: 0,
  batchNo: '',
  remark: ''
})

const formRules = {
  productId: [{ required: true, message: '请选择产品', trigger: 'change' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请选择计量单位', trigger: 'change' }],
  warehouse: [{ required: true, message: '请输入库位', trigger: 'blur' }]
}

/** 打开新增对话框 */
const openAddDialog = () => {
  isEditing.value = false
  editingId.value = null
  Object.assign(form, {
    productId: null, categoryId: null, quantity: 0, unit: '个',
    warehouse: '', safetyStock: 0, batchNo: '', remark: ''
  })
  dialogVisible.value = true
}

/** 打开编辑对话框 */
const openEditDialog = (row: any) => {
  isEditing.value = true
  editingId.value = row.id
  Object.assign(form, {
    productId: row.productId,
    categoryId: row.categoryId,
    quantity: row.quantity,
    unit: row.unit,
    warehouse: row.warehouse,
    safetyStock: row.safetyStock,
    batchNo: row.batchNo || '',
    remark: row.remark || ''
  })
  dialogVisible.value = true
}

/** 保存库存记录 */
const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const now = Date.now()
    if (isEditing.value && editingId.value) {
      await db.inventories.update(editingId.value, {
        categoryId: form.categoryId,
        quantity: form.quantity,
        unit: form.unit,
        warehouse: form.warehouse,
        safetyStock: form.safetyStock,
        batchNo: form.batchNo || undefined,
        remark: form.remark,
        updatedAt: now
      })
      msgSuccess('库存信息已更新')
    } else {
      await db.inventories.add({
        productId: form.productId!,
        categoryId: form.categoryId!,
        quantity: form.quantity,
        unit: form.unit,
        warehouse: form.warehouse,
        safetyStock: form.safetyStock,
        batchNo: form.batchNo || undefined,
        remark: form.remark,
        createdAt: now,
        updatedAt: now
      })
      msgSuccess('库存录入成功')
    }
    dialogVisible.value = false
    await loadData()
  } catch (e: any) {
    msgError(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/** 删除库存记录 */
const handleDelete = async (row: any) => {
  const confirmed = await msgConfirm(`确定删除「${row.productName}」的库存记录吗？`)
  if (!confirmed) return
  await db.inventories.delete(row.id)
  msgSuccess('已删除')
  await loadData()
}

// ==================== 库存调拨 ====================

const stockDialogVisible = ref(false)
const stockSaving = ref(false)
const stockTarget = ref<any>(null)
const stockFormRef = ref()

const stockForm = reactive({
  type: 'in' as 'in' | 'out',
  amount: 1,
  remark: ''
})

const stockFormRules = {
  type: [{ required: true, message: '请选择调拨类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

/** 打开调拨对话框 */
const openStockDialog = (row: any) => {
  stockTarget.value = row
  stockForm.type = 'in'
  stockForm.amount = 1
  stockForm.remark = ''
  stockDialogVisible.value = true
}

/** 执行库存调拨 */
const handleStockChange = async () => {
  const valid = await stockFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const inv = await db.inventories.get(stockTarget.value.id)
  if (!inv) return

  // 出库时检查库存是否充足
  if (stockForm.type === 'out' && inv.quantity < stockForm.amount) {
    msgError('出库数量不能超过当前库存')
    return
  }

  stockSaving.value = true
  try {
    const newQuantity = stockForm.type === 'in'
      ? inv.quantity + stockForm.amount
      : inv.quantity - stockForm.amount

    await db.inventories.update(inv.id!, {
      quantity: newQuantity,
      remark: stockForm.remark ? `${inv.remark ? inv.remark + '；' : ''}${stockForm.type === 'in' ? '入库' : '出库'}${stockForm.amount}${inv.unit}${stockForm.remark ? '：' + stockForm.remark : ''}` : inv.remark,
      updatedAt: Date.now()
    })

    msgSuccess(stockForm.type === 'in' ? `入库 ${stockForm.amount} ${inv.unit}，当前库存 ${newQuantity}` : `出库 ${stockForm.amount} ${inv.unit}，当前库存 ${newQuantity}`)
    stockDialogVisible.value = false
    await loadData()
  } catch (e: any) {
    msgError(e.message || '调拨失败')
  } finally {
    stockSaving.value = false
  }
}

// ==================== 分类管理 ====================

const showCategoryDialog = ref(false)
const categoryFormVisible = ref(false)
const editingCategory = ref<InventoryCategory | null>(null)
const categorySaving = ref(false)
const categoryFormRef = ref()

const categoryForm = reactive({
  name: '',
  code: '',
  sort: 0,
  remark: ''
})

const categoryFormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }]
}

/** 打开分类编辑表单 */
const openCategoryForm = (cat: InventoryCategory | null) => {
  editingCategory.value = cat
  if (cat) {
    Object.assign(categoryForm, { name: cat.name, code: cat.code, sort: cat.sort, remark: cat.remark })
  } else {
    Object.assign(categoryForm, { name: '', code: '', sort: categories.value.length + 1, remark: '' })
  }
  categoryFormVisible.value = true
}

/** 保存分类 */
const handleSaveCategory = async () => {
  const valid = await categoryFormRef.value?.validate().catch(() => false)
  if (!valid) return

  categorySaving.value = true
  try {
    const now = Date.now()
    if (editingCategory.value) {
      await db.inventoryCategories.update(editingCategory.value.id!, {
        name: categoryForm.name,
        code: categoryForm.code,
        sort: categoryForm.sort,
        remark: categoryForm.remark,
        updatedAt: now
      })
      msgSuccess('分类已更新')
    } else {
      await db.inventoryCategories.add({
        name: categoryForm.name,
        code: categoryForm.code,
        sort: categoryForm.sort,
        remark: categoryForm.remark,
        createdAt: now,
        updatedAt: now
      })
      msgSuccess('分类已创建')
    }
    categoryFormVisible.value = false
    await loadData()
  } catch (e: any) {
    msgError(e.message || '保存失败')
  } finally {
    categorySaving.value = false
  }
}

/** 删除分类（需检查是否有库存关联） */
const handleDeleteCategory = async (cat: InventoryCategory) => {
  const linked = inventories.value.filter(inv => inv.categoryId === cat.id).length
  if (linked > 0) {
    msgError(`该分类下有 ${linked} 条库存记录，无法删除`)
    return
  }
  const confirmed = await msgConfirm(`确定删除分类「${cat.name}」吗？`)
  if (!confirmed) return
  await db.inventoryCategories.delete(cat.id!)
  msgSuccess('分类已删除')
  await loadData()
}
</script>
