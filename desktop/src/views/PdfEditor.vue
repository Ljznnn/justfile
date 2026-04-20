<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { ElMessage } from 'element-plus'
import Icon from '@/components/common/Icon.vue'

// 配置 PDF.js worker (v3 版本)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface PdfPage {
  id: string
  index: number
  originalIndex: number
  rotation: number // 0, 90, 180, 270
  thumbnailUrl: string
  selected: boolean
}

const pdfFile = ref<File | null>(null)
const pdfDoc = ref<PDFDocument | null>(null)
// 使用 shallowRef 避免 Vue 响应式代理破坏 pdf.js 的私有字段
const pdfJsDoc = shallowRef<any>(null)
const pages = ref<PdfPage[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const selectedPages = computed(() => pages.value.filter(p => p.selected))
const selectedCount = computed(() => selectedPages.value.length)

// 处理文件上传
const handleFileSelect = async (files: File[]) => {
  if (files.length === 0) return
  const file = files[0]
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    ElMessage.warning('请选择 PDF 文件')
    return
  }

  pdfFile.value = file
  isLoading.value = true

  try {
    const arrayBuffer = await file.arrayBuffer()

    // 使用 pdf-lib 加载（用于编辑和保存）
    pdfDoc.value = await PDFDocument.load(new Uint8Array(arrayBuffer))

    // 使用 pdf.js 加载（用于渲染缩略图）
    pdfJsDoc.value = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    // 生成页面缩略图
    await generateThumbnails()
  } catch (e: any) {
    console.error('PDF 加载失败:', e)
    ElMessage.error('PDF 加载失败: ' + (e.message || '未知错误'))
    reset()
  }

  isLoading.value = false
}

// 生成缩略图
const generateThumbnails = async () => {
  if (!pdfJsDoc.value || !pdfDoc.value) return

  pages.value = []
  const pageCount = pdfDoc.value.getPageCount()

  for (let i = 0; i < pageCount; i++) {
    const thumbnailUrl = await renderPageThumbnail(i)

    pages.value.push({
      id: `page-${i}-${Date.now()}`,
      index: i,
      originalIndex: i,
      rotation: 0,
      thumbnailUrl,
      selected: false
    })
  }
}

// 使用 pdf.js 渲染页面缩略图
const renderPageThumbnail = async (pageIndex: number): Promise<string> => {
  if (!pdfJsDoc.value) return ''

  try {
    const page = await pdfJsDoc.value.getPage(pageIndex + 1) // pdf.js 从 1 开始索引

    // 计算缩略图尺寸
    const viewport = page.getViewport({ scale: 0.5 })

    // 创建 canvas
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const context = canvas.getContext('2d')
    if (!context) return ''

    // 渲染页面
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // 转为图片 URL
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch (e) {
    console.error('渲染缩略图失败:', e)
    return ''
  }
}

// 选择页面
const toggleSelect = (page: PdfPage) => {
  page.selected = !page.selected
}

// 全选/取消全选
const toggleSelectAll = () => {
  const allSelected = pages.value.every(p => p.selected)
  pages.value.forEach(p => p.selected = !allSelected)
}

// 删除选中页面
const deleteSelected = () => {
  if (selectedCount.value === 0) {
    ElMessage.warning('请先选择要删除的页面')
    return
  }

  pages.value = pages.value.filter(p => !p.selected)
  pages.value.forEach((p, i) => p.index = i)
  ElMessage.success(`已删除 ${selectedCount.value} 页`)
}

// 删除单个页面
const deletePage = (page: PdfPage) => {
  pages.value = pages.value.filter(p => p.id !== page.id)
  pages.value.forEach((p, i) => p.index = i)
}

// 旋转页面
const rotatePage = (page: PdfPage, direction: 'left' | 'right') => {
  const delta = direction === 'right' ? 90 : -90
  page.rotation = ((page.rotation + delta) % 360 + 360) % 360
}

// 批量旋转选中页面
const rotateSelected = (direction: 'left' | 'right') => {
  if (selectedCount.value === 0) {
    ElMessage.warning('请先选择要旋转的页面')
    return
  }

  selectedPages.value.forEach(p => rotatePage(p, direction))
  ElMessage.success(`已旋转 ${selectedCount.value} 页`)
}

// 拖拽开始
const handleDragStart = (e: DragEvent, index: number) => {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

// 拖拽经过
const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

// 拖拽结束
const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 拖拽放置
const handleDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) return

  const draggedPage = pages.value[draggedIndex.value]
  const newPages = [...pages.value]

  newPages.splice(draggedIndex.value, 1)
  newPages.splice(targetIndex, 0, draggedPage)

  newPages.forEach((p, i) => p.index = i)
  pages.value = newPages

  draggedIndex.value = null
  dragOverIndex.value = null
}

// 保存 PDF
const savePdf = async () => {
  if (pages.value.length === 0) {
    ElMessage.warning('没有页面可保存')
    return
  }

  isSaving.value = true

  try {
    const newDoc = await PDFDocument.create()

    if (!pdfDoc.value) throw new Error('原始 PDF 未加载')

    for (const page of pages.value) {
      const [copiedPage] = await newDoc.copyPages(pdfDoc.value, [page.originalIndex])

      if (page.rotation !== 0) {
        copiedPage.setRotation(degrees(page.rotation))
      }

      newDoc.addPage(copiedPage)
    }

    const pdfBytesToSave = await newDoc.save()
    const blob = new Blob([pdfBytesToSave], { type: 'application/pdf' })

    const filename = pdfFile.value?.name.replace('.pdf', '_edited.pdf') || 'edited.pdf'

    if (window.electronAPI?.saveFile) {
      const savePath = await window.electronAPI.saveFile(filename)
      if (savePath) {
        const base64 = await blobToBase64(blob)
        await window.electronAPI.saveFileWithPath(savePath, base64)
        ElMessage.success(`已保存: ${filename}`)
      }
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success(`已下载: ${filename}`)
    }
  } catch (e: any) {
    console.error('保存失败:', e)
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  }

  isSaving.value = false
}

// Blob 转 Base64
const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 重置
const reset = () => {
  pdfFile.value = null
  pdfDoc.value = null
  pdfJsDoc.value = null
  pages.value = []
}

/**
 * 处理从悬浮球传来的文件数据
 * 优先从全局变量读取（导航时保存），然后监听 IPC 事件
 */
onMounted(() => {
  // 从全局变量读取悬浮球传递的文件数据
  const globalData = (window as any).__floatingFileData
  if (globalData?.value?.route === '/pdf/editor' && globalData.value.fileData) {
    const fileData = globalData.value.fileData
    const file = new File([fileData.data], fileData.name, {
      type: fileData.type
    })
    handleFileSelect([file])
    // 清空全局数据
    globalData.value = null
  }

  // 同时监听 IPC 事件（如果页面已经打开）
  window.electronAPI?.onMainNavigateWithData?.((data) => {
    if (data.route === '/pdf/editor') {
      const file = new File([data.fileData.data], data.fileData.name, {
        type: data.fileData.type
      })
      handleFileSelect([file])
    }
  })
})

onUnmounted(() => {
  window.electronAPI?.removeMainNavigateWithDataListener?.()
})

// 文件拖拽上传
const isDraggingFile = ref(false)
const handleFileDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDraggingFile.value = true
}
const handleFileDragLeave = () => isDraggingFile.value = false
const handleFileDrop = (e: DragEvent) => {
  e.preventDefault()
  isDraggingFile.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  handleFileSelect(files)
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-4 title-line" style="font-size: var(--font-size-title)">PDF 编辑</h1>

    <!-- 上传区域 -->
    <div v-if="!pdfFile" class="space-y-4">
      <div
        @dragover="handleFileDragOver"
        @dragleave="handleFileDragLeave"
        @drop="handleFileDrop"
        @click="() => $refs.fileInput?.click()"
        class="theme-upload p-10 flex flex-col items-center justify-center cursor-pointer"
      >
        <div class="theme-icon-box w-14 h-14 mb-3">
          <Icon name="file-pdf-2-line" :size="28" class="icon-accent" />
        </div>
        <p class="text-primary text-sm mb-1">
          {{ isDraggingFile ? '松开上传' : '拖拽 PDF 文件到这里' }}
        </p>
        <p class="text-muted text-xs mb-3">或点击选择</p>
        <span class="theme-button px-2 py-0.5 text-xs text-muted">PDF</span>
        <input ref="fileInput" type="file" accept=".pdf" class="hidden" @change="(e: any) => handleFileSelect(Array.from(e.target.files || []))" />
      </div>

      <!-- 说明 -->
      <div class="theme-card p-4">
        <p class="text-muted text-xs">
          支持 PDF 页面预览、排序、删除、旋转等操作，无需上传服务器，本地处理更安全。
        </p>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else-if="isLoading" class="text-center py-8">
      <div class="theme-card inline-flex items-center gap-2 px-4 py-2">
        <div class="w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin"></div>
        <span class="text-secondary text-sm">加载 PDF...</span>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div v-else class="space-y-4">
      <!-- 控制栏 -->
      <div class="theme-card p-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- 文件信息 -->
          <div class="flex items-center gap-2">
            <Icon name="file-pdf-2-line" :size="16" class="text-accent" />
            <span class="text-secondary text-sm">{{ pdfFile?.name }}</span>
            <span class="text-muted text-xs">({{ pages.length }} 页)</span>
          </div>

          <div class="flex-1"></div>

          <!-- 选择状态 -->
          <div v-if="selectedCount > 0" class="text-secondary text-sm">
            已选 {{ selectedCount }} 页
          </div>

          <!-- 全选 -->
          <button @click="toggleSelectAll" class="theme-button px-3 py-1.5 text-xs">
            {{ pages.every(p => p.selected) ? '取消全选' : '全选' }}
          </button>

          <!-- 批量操作 -->
          <div class="flex items-center gap-1">
            <button
              @click="rotateSelected('left')"
              class="theme-button px-2 py-1.5 text-xs"
              :disabled="selectedCount === 0"
              title="左旋90°"
            >
              <Icon name="anticlockwise-line" :size="14" />
            </button>
            <button
              @click="rotateSelected('right')"
              class="theme-button px-2 py-1.5 text-xs"
              :disabled="selectedCount === 0"
              title="右旋90°"
            >
              <Icon name="clockwise-line" :size="14" />
            </button>
            <button
              @click="deleteSelected"
              class="theme-button px-2 py-1.5 text-xs text-red-500"
              :disabled="selectedCount === 0"
              title="删除"
            >
              <Icon name="delete-bin-line" :size="14" />
            </button>
          </div>

          <!-- 重选 -->
          <button @click="reset" class="theme-button px-3 py-1.5 text-xs text-muted">
            重选文件
          </button>

          <!-- 保存 -->
          <button @click="savePdf" class="theme-button-primary px-3 py-1.5 text-xs" :disabled="isSaving">
            {{ isSaving ? '保存中...' : '保存 PDF' }}
          </button>
        </div>
      </div>

      <!-- 页面网格 -->
      <div class="theme-card p-4">
        <p class="text-muted text-xs mb-3">拖拽排序 | 点击选择 | 右键操作</p>

        <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
          <div
            v-for="(page, index) in pages"
            :key="page.id"
            draggable="true"
            @dragstart="(e) => handleDragStart(e, index)"
            @dragover="(e) => handleDragOver(e, index)"
            @dragend="handleDragEnd"
            @drop="(e) => handleDrop(e, index)"
            class="relative group cursor-pointer rounded border-2 transition-all"
            :class="{
              'border-accent bg-accent/10': page.selected,
              'border-transparent hover:border-secondary': !page.selected,
              'opacity-50': dragOverIndex === index && draggedIndex !== index
            }"
            @click="toggleSelect(page)"
          >
            <!-- 缩略图 -->
            <div
              class="aspect-[3/4] bg-gray-100 rounded overflow-hidden flex items-center justify-center"
              :style="{ transform: `rotate(${page.rotation}deg)` }"
            >
              <img
                v-if="page.thumbnailUrl"
                :src="page.thumbnailUrl"
                class="w-full h-full object-cover"
                alt="页面缩略图"
              />
              <div v-else class="text-muted">
                <Icon name="file-text-line" :size="24" />
              </div>
            </div>

            <!-- 页码 -->
            <div class="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              {{ index + 1 }}
            </div>

            <!-- 旋转指示 -->
            <div
              v-if="page.rotation !== 0"
              class="absolute top-1 right-1 bg-accent text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
            >
              {{ page.rotation }}°
            </div>

            <!-- 操作按钮 -->
            <div class="absolute bottom-1 left-1 right-1 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                @click.stop="rotatePage(page, 'left')"
                class="bg-black/60 text-white p-1 rounded hover:bg-black/80"
                title="左旋90°"
              >
                <Icon name="anticlockwise-line" :size="12" />
              </button>
              <button
                @click.stop="rotatePage(page, 'right')"
                class="bg-black/60 text-white p-1 rounded hover:bg-black/80"
                title="右旋90°"
              >
                <Icon name="clockwise-line" :size="12" />
              </button>
              <button
                @click.stop="deletePage(page)"
                class="bg-red-500/80 text-white p-1 rounded hover:bg-red-500"
                title="删除"
              >
                <Icon name="delete-bin-line" :size="12" />
              </button>
            </div>
          </div>
        </div>

        <!-- 空提示 -->
        <div v-if="pages.length === 0" class="text-center py-8 text-muted">
          <Icon name="file-text-line" :size="32" class="mb-2" />
          <p class="text-sm">没有页面</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-accent {
  color: var(--accent);
}
</style>