<script setup lang="ts">
import { ref, computed } from 'vue'
import UploadZone from '@/components/common/UploadZone.vue'
import Icon from '@/components/common/Icon.vue'
import { splitImage, formatFileSize, downloadFile } from '@/utils/imageProcessor'

interface SplitPiece {
  url: string
  index: number
  row: number
  col: number
}

const originalFile = ref<File | null>(null)
const originalUrl = ref('')
const originalSize = ref({ width: 0, height: 0 })

const rows = ref(3)
const cols = ref(3)
const pieces = ref<SplitPiece[]>([])
const isProcessing = ref(false)

// 预览网格样式
const gridStyle = computed(() => ({
  gridTemplateRows: `repeat(${rows.value}, 1fr)`,
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`
}))

// 处理文件选择
const handleFileSelect = async (files: File[]) => {
  if (files.length === 0) return

  const file = files[0]
  originalFile.value = file

  // 先释放旧的 URL
  if (originalUrl.value) {
    URL.revokeObjectURL(originalUrl.value)
  }
  originalUrl.value = URL.createObjectURL(file)

  // 获取图片尺寸并执行切分
  const img = new Image()
  img.onload = async () => {
    originalSize.value = { width: img.naturalWidth, height: img.naturalHeight }
    await doSplit()
  }
  img.onerror = (e) => {
    console.error('图片加载失败:', e)
  }
  img.src = originalUrl.value
}

// 执行切分
const doSplit = async () => {
  if (!originalFile.value) return

  isProcessing.value = true
  pieces.value = []

  try {
    const results = await splitImage(originalFile.value, {
      rows: rows.value,
      cols: cols.value
    })

    pieces.value = results.map(r => ({
      url: r.url,
      index: r.index,
      row: r.row,
      col: r.col
    }))
  } catch (e) {
    console.error('切分失败:', e)
  }

  isProcessing.value = false
}

// 下载单个
const downloadOne = (piece: SplitPiece) => {
  const ext = originalFile.value?.name.split('.').pop() || 'png'
  downloadFile(piece.url, `piece_${piece.row + 1}_${piece.col + 1}.${ext}`)
}

// 下载全部
const downloadAll = () => {
  pieces.value.forEach(piece => {
    setTimeout(() => downloadOne(piece), piece.index * 100)
  })
}

// 重置
const reset = () => {
  // 释放所有 URL
  if (originalUrl.value) {
    URL.revokeObjectURL(originalUrl.value)
  }
  pieces.value.forEach(p => URL.revokeObjectURL(p.url))

  originalFile.value = null
  originalUrl.value = ''
  pieces.value = []
  originalSize.value = { width: 0, height: 0 }
}

// 预设
const presets = [
  { label: '2×2', rows: 2, cols: 2 },
  { label: '3×3', rows: 3, cols: 3 },
  { label: '4×4', rows: 4, cols: 4 },
  { label: '2×3', rows: 2, cols: 3 },
  { label: '3×4', rows: 3, cols: 4 },
]
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-4 title-line" style="font-size: var(--font-size-title)">图片切分</h1>

    <!-- 上传区域 -->
    <div v-if="!originalFile">
      <UploadZone @select="handleFileSelect" />
    </div>

    <!-- 编辑区域 -->
    <div v-else class="space-y-4">
      <!-- 控制栏 -->
      <div class="theme-card p-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- 原图信息 -->
          <div class="flex items-center gap-2">
            <Icon name="image-line" :size="16" class="text-accent" />
            <span class="text-secondary text-sm">{{ originalFile.name }}</span>
            <span class="text-muted text-xs">({{ originalSize.width }} × {{ originalSize.height }})</span>
          </div>

          <div class="flex-1"></div>

          <!-- 预设 -->
          <div class="flex items-center gap-1">
            <span class="text-muted text-xs mr-1">预设:</span>
            <button
              v-for="p in presets"
              :key="p.label"
              @click="rows = p.rows; cols = p.cols; doSplit()"
              class="theme-button px-2 py-1 text-xs"
              :class="{ 'border-accent text-accent': rows === p.rows && cols === p.cols }"
            >
              {{ p.label }}
            </button>
          </div>

          <!-- 自定义行列 -->
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1">
              <span class="text-muted text-xs">行</span>
              <input v-model.number="rows" type="number" min="1" max="10" class="theme-input w-14 px-2 py-1 text-xs text-center" @change="doSplit">
            </div>
            <span class="text-muted">×</span>
            <div class="flex items-center gap-1">
              <span class="text-muted text-xs">列</span>
              <input v-model.number="cols" type="number" min="1" max="10" class="theme-input w-14 px-2 py-1 text-xs text-center" @change="doSplit">
            </div>
          </div>

          <!-- 重选 -->
          <button @click="reset" class="theme-button px-3 py-1.5 text-xs text-muted">
            重选图片
          </button>
        </div>
      </div>

      <!-- 处理中 -->
      <div v-if="isProcessing" class="text-center py-8">
        <div class="theme-card inline-flex items-center gap-2 px-4 py-2">
          <div class="w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin"></div>
          <span class="text-secondary text-sm">切分中...</span>
        </div>
      </div>

      <!-- 切分结果 -->
      <div v-else class="space-y-4">
        <!-- 切分结果 -->
        <div v-if="pieces.length > 0" class="theme-card p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-secondary text-sm">切分结果 ({{ pieces.length }} 张)</span>
            <button @click="downloadAll" class="theme-button-primary px-3 py-1.5 text-xs">
              下载全部
            </button>
          </div>

          <div class="grid gap-2" :style="gridStyle">
            <div
              v-for="piece in pieces"
              :key="piece.index"
              class="relative group cursor-pointer"
              @click="downloadOne(piece)"
            >
              <img :src="piece.url" class="w-full h-auto rounded border border-transparent group-hover:border-accent transition-all">
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                <Icon name="download-line" :size="20" class="text-white" />
              </div>
            </div>
          </div>
        </div>

        <!-- 切分失败提示 -->
        <div v-else class="theme-card p-4 text-center">
          <Icon name="error-warning-line" :size="20" class="text-muted mb-2" />
          <p class="text-muted text-sm">切分失败，请尝试其他图片</p>
        </div>

        <!-- 原图预览 -->
        <div class="theme-card p-4">
          <span class="text-muted text-xs">原图</span>
          <img :src="originalUrl" class="mt-2 max-w-full rounded" :style="{ maxWidth: '100%', maxHeight: '300px' }">
        </div>
      </div>
    </div>

    <!-- 说明 -->
    <div v-if="!originalFile" class="mt-4 theme-card p-4">
      <p class="text-muted text-xs">
        将图片分割成四宫格、九宫格、十六宫格等，支持自定义行与列。
        常用于微信朋友圈、微博等社交媒体的九宫格图片。
      </p>
    </div>
  </div>
</template>

<style scoped>
.text-accent {
  color: var(--accent);
}
</style>
