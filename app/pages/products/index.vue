<!-- 产品管理 - 卡片视图/列表视图切换，支持图片上传至IndexedDB -->
<template>
  <div class="products-page">
    <!-- 页面头部操作栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索产品编号或名称..."
          :prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>
      <div class="toolbar-right">
        <!-- 视图切换 -->
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="card">
            <el-icon><Grid /></el-icon> 卡片
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon> 列表
          </el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon> 新增产品
        </el-button>
      </div>
    </div>

    <!-- 卡片视图 -->
    <div v-if="viewMode === 'card'" class="product-cards">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card hover-float"
      >
        <div class="card-image">
          <el-image
            v-if="product.imageUrl"
            :src="product.imageUrl"
            fit="cover"
            class="product-img"
          />
          <div v-else class="image-placeholder">
            <el-icon :size="32" color="#C0C4CC"><Picture /></el-icon>
          </div>
        </div>
        <div class="card-body">
          <h4 class="product-name">{{ product.name }}</h4>
          <p class="product-code">{{ product.code }}</p>
          <p class="product-spec">{{ product.spec || '暂无规格' }}</p>
          <div class="card-actions">
            <el-button text size="small" @click="handleEdit(product)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button text size="small" @click="handleGenerateOrder(product)">
              <el-icon><Document /></el-icon> 生成工单
            </el-button>
            <el-button text size="small" type="danger" @click="handleDelete(product)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredProducts.length === 0" class="empty-state">
        <el-icon :size="48" color="#C0C4CC"><Box /></el-icon>
        <span class="empty-text">暂无产品数据，点击右上角新增</span>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-if="viewMode === 'table'" class="product-table minimal-card">
      <el-table :data="filteredProducts" style="width: 100%">
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.imageUrl"
              :src="row.imageUrl"
              fit="cover"
              class="table-img"
            />
            <div v-else class="table-image-placeholder">
              <el-icon :size="20" color="#C0C4CC"><Picture /></el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="产品编号" width="140" />
        <el-table-column prop="name" label="产品名称" min-width="160" />
        <el-table-column prop="spec" label="规格型号" width="160" />
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text size="small" type="primary" @click="handleGenerateOrder(row)">生成工单</el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑产品对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑产品' : '新增产品'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="productFormRef" :model="productForm" :rules="productRules" label-width="80px">
        <el-form-item label="产品编号" prop="code">
          <el-input v-model="productForm.code" placeholder="如：P-001" />
        </el-form-item>
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="productForm.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="规格型号" prop="spec">
          <el-input v-model="productForm.spec" placeholder="请输入规格型号" />
        </el-form-item>
        <el-form-item label="产品图片">
          <el-upload
            class="upload-area"
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleImageChange"
          >
            <div v-if="!previewUrl" class="upload-placeholder">
              <el-icon :size="28" color="#C0C4CC"><Plus /></el-icon>
              <span>点击或拖拽上传</span>
            </div>
            <div v-else class="preview-wrapper">
              <el-image :src="previewUrl" fit="cover" class="preview-image" />
              <div class="preview-overlay">
                <el-icon :size="20" color="#fff"><RefreshRight /></el-icon>
                <span>更换图片</span>
              </div>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="productForm.remark" type="textarea" :rows="3" placeholder="可选备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Search, Grid, List, Plus, Edit, Delete, Document, Picture, Box, RefreshRight } from '@element-plus/icons-vue'
import { db, type Product } from '~/composables/database'
import { msgSuccess, msgError, msgConfirm } from '~/composables/useMessage'
import { generateOrderNo } from '~/composables/useUtils'
import imageCompression from 'browser-image-compression'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// ==================== 数据与状态 ====================

const products = ref<Array<Product & { imageUrl?: string }>>([])
const searchKeyword = ref('')
const viewMode = ref<'card' | 'table'>('card')
const dialogVisible = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const previewUrl = ref('')
const imageBlob = ref<Blob | null>(null)
const productFormRef = ref()

const productForm = reactive({
  code: '',
  name: '',
  spec: '',
  remark: ''
})

const productRules = {
  code: [{ required: true, message: '请输入产品编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }]
}

// ==================== 数据加载 ====================

/** 加载产品列表，将Blob图片转为临时URL用于预览 */
const loadProducts = async () => {
  const list = await db.products.toArray()
  products.value = list.map(p => {
    let imageUrl = ''
    if (p.image) {
      imageUrl = URL.createObjectURL(p.image)
    }
    return { ...p, imageUrl }
  })
}

/** 搜索过滤 */
const filteredProducts = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return products.value
  return products.value.filter(p =>
    p.code.toLowerCase().includes(keyword) ||
    p.name.toLowerCase().includes(keyword)
  )
})

onMounted(() => {
  loadProducts()
})

// 组件卸载时释放所有Blob URL，避免内存泄漏
onUnmounted(() => {
  products.value.forEach(p => {
    if (p.imageUrl) URL.revokeObjectURL(p.imageUrl)
  })
})

// ==================== 图片处理 ====================

/** 处理图片选择，压缩后存为Blob */
const handleImageChange = async (uploadFile: any) => {
  const file = uploadFile.raw as File
  if (!file) return

  try {
    // 使用 browser-image-compression 压缩图片，限制宽度800px
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 800,
      maxSizeMB: 0.5,
      useWebWorker: true
    })
    imageBlob.value = compressed
    previewUrl.value = URL.createObjectURL(compressed)
  } catch {
    msgError('图片压缩失败，请重试')
  }
}

// ==================== CRUD 操作 ====================

/** 打开新增对话框 */
const showAddDialog = () => {
  isEditing.value = false
  editingId.value = null
  Object.assign(productForm, { code: '', name: '', spec: '', remark: '' })
  previewUrl.value = ''
  imageBlob.value = null
  dialogVisible.value = true
}

/** 打开编辑对话框 */
const handleEdit = (product: Product & { imageUrl?: string }) => {
  isEditing.value = true
  editingId.value = product.id!
  Object.assign(productForm, {
    code: product.code,
    name: product.name,
    spec: product.spec,
    remark: product.remark
  })
  previewUrl.value = product.imageUrl || ''
  imageBlob.value = null  // 编辑时若未更换图片则保留原Blob
  dialogVisible.value = true
}

/** 保存产品（新增或编辑） */
const handleSave = async () => {
  const valid = await productFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const now = Date.now()
    const data: any = {
      code: productForm.code,
      name: productForm.name,
      spec: productForm.spec,
      remark: productForm.remark,
      updatedAt: now
    }

    // 仅在用户更换了图片时更新image字段
    if (imageBlob.value) {
      data.image = imageBlob.value
    }

    if (isEditing.value && editingId.value) {
      await db.products.update(editingId.value, data)
      msgSuccess('产品更新成功')
    } else {
      data.createdAt = now
      if (imageBlob.value) data.image = imageBlob.value
      await db.products.add(data)
      msgSuccess('产品创建成功')
    }

    dialogVisible.value = false
    await loadProducts()
  } catch (e: any) {
    msgError(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/** 删除产品 */
const handleDelete = async (product: Product) => {
  const confirmed = await msgConfirm(`确定删除产品「${product.name}」吗？关联的工单不会被删除。`)
  if (!confirmed) return

  await db.products.delete(product.id!)
  msgSuccess('产品已删除')
  await loadProducts()
}

/** 从产品快速生成工单 */
const handleGenerateOrder = async (product: Product) => {
  const orderNo = await generateOrderNo()
  const now = Date.now()

  await db.workOrders.add({
    orderNo,
    productId: product.id!,
    quantity: 1,
    status: 'pending',
    assignee: '待分配',
    remark: `由产品「${product.name}」快速生成`,
    createdAt: now,
    updatedAt: now
  })

  // 记录操作日志
  await db.operationLogs.add({
    workOrderId: (await db.workOrders.where('orderNo').equals(orderNo).first())!.id!,
    action: '创建工单',
    operator: '当前用户',
    toStatus: 'pending',
    createdAt: now
  })

  msgSuccess(`工单 ${orderNo} 已生成`)
  navigateTo('/work-orders')
}
</script>

<style lang="scss" scoped>
.products-page {
  .page-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .toolbar-left {
    display: flex;
    gap: 12px;

    .search-input {
      width: 280px;
    }
  }

  .toolbar-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

// ==================== 卡片视图 ====================
.product-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.product-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: $card-shadow;
}

.card-image {
  height: 180px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  .product-img {
    width: 100%;
    height: 100%;
  }

  .image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.card-body {
  padding: 14px 16px;

  .product-name {
    font-size: 15px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 4px;
  }

  .product-code {
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 2px;
  }

  .product-spec {
    font-size: 12px;
    color: $text-placeholder;
    margin-bottom: 10px;
  }
}

.card-actions {
  display: flex;
  gap: 4px;
  border-top: 1px solid $border-lighter;
  padding-top: 10px;
}

// ==================== 列表视图 ====================
.product-table {
  .table-img {
    width: 48px;
    height: 48px;
    border-radius: 6px;
  }

  .table-image-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// ==================== 图片上传 ====================
.upload-area {
  width: 100%;

  :deep(.el-upload) {
    width: 100%;
  }
}

.upload-placeholder {
  width: 200px;
  height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s;

  span {
    font-size: 12px;
    color: #C0C4CC;
  }

  &:hover {
    border-color: #409EFF;
  }
}

.preview-wrapper {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;

  .preview-image {
    width: 100%;
    height: 100%;
  }

  .preview-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;

    span {
      font-size: 12px;
      color: #fff;
    }
  }

  &:hover .preview-overlay {
    opacity: 1;
  }
}

// 空状态
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;

  .empty-text {
    font-size: 14px;
    color: $text-secondary;
    margin-top: 12px;
  }
}
</style>
