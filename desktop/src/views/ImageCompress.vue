<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import imageCompression from 'browser-image-compression'
import UploadZone from '@/components/common/UploadZone.vue'
import Icon from '@/components/common/Icon.vue'

interface Result {
  file: string
  originalSize: number
  compressedSize: number
  savedPercent: number
  blob: Blob | null
  status: 'processing' | 'success' | 'error'
  error?: string
}

const results = ref<Result[]>([])
const isProcessing = ref(false)

// 压缩选项
const maxSizeMB = ref(1)
const maxWidthOrHeight = ref(1920)
const quality = ref(0.8)

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const totalSaved = computed(() => formatSize(
  results.value.filter(r => r.status === 'success').reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0)
))

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

const handleFileSelect = async (files: File[]) => {
  results.value = files.map(f => ({
    file: f.name,
    originalSize: f.size,
    compressedSize: 0,
    savedPercent: 0,
    blob: null,
    status: 'processing'
  }))
  isProcessing.value = true

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const options = {
        maxSizeMB: maxSizeMB.value,
        maxWidthOrHeight: maxWidthOrHeight.value,
        useWebWorker: true,
        initialQuality: quality.value,
        alwaysKeepResolution: true
      }
      const compressedBlob = await imageCompression(file, options)

      // 如果压缩后反而变大，使用原图
      const finalBlob = compressedBlob.size >= file.size ? file : compressedBlob
      const savedBytes = file.size - finalBlob.size
      const savedPercent = Math.round((savedBytes / file.size) * 100)

      results.value[i] = {
        ...results.value[i],
        compressedSize: finalBlob.size,
        savedPercent,
        blob: finalBlob,
        status: 'success'
      }
    } catch (e: any) {
      results.value[i] = {
        ...results.value[i],
        status: 'error',
        error: e.message || '压缩失败'
      }
    }
  }

  isProcessing.value = false
}

const downloadResult = async (r: Result) => {
  if (!r.blob) return

  const filename = r.file.replace(/\.[^.]+$/, '_compressed.' + r.file.split('.').pop())

  if (window.electronAPI?.saveFile) {
    const savePath = await window.electronAPI.saveFile(filename)
    if (!savePath) return

    try {
      const base64 = await blobToBase64(r.blob)
      await window.electronAPI.saveFileWithPath(savePath, base64)
      ElMessage.success(`已保存: ${filename}`)
    } catch (e: any) {
      ElMessage.error(e.message || '保存失败')
    }
  } else {
    const url = URL.createObjectURL(r.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success(`已下载: ${filename}`)
  }
}

const downloadAll = async () => {
  const successResults = results.value.filter(r => r.status === 'success' && r.blob)
  if (successResults.length === 0) return

  if (window.electronAPI?.selectFolder) {
    const folderPath = await window.electronAPI.selectFolder()
    if (!folderPath) return

    try {
      const files = await Promise.all(
        successResults.map(async r => {
          const filename = r.file.replace(/\.[^.]+$/, '_compressed.' + r.file.split('.').pop())
          return {
            name: filename,
            data: await blobToBase64(r.blob!)
          }
        })
      )
      await window.electronAPI.saveFilesToFolder(folderPath, files)
      ElMessage.success(`已保存 ${files.length} 张图片到: ${folderPath}`)
    } catch (e: any) {
      ElMessage.error(e.message || '保存失败')
    }
  } else {
    for (const r of successResults) {
      await downloadResult(r)
    }
  }
}

const clearResults = () => results.value = []

/**
 * 处理从悬浮球传来的文件数据
 * 优先从全局变量读取（导航时保存），然后监听 IPC 事件
 */
onMounted(() => {
  // 从全局变量读取悬浮球传递的文件数据
  const globalData = (window as any).__floatingFileData
  if (globalData?.value?.route === '/image/compress' && globalData.value.fileData) {
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
    if (data.route === '/image/compress') {
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
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-4 title-line" style="font-size: var(--font-size-title)">图片压缩</h1>

    <!-- 压缩参数 -->
    <div class="theme-card p-4 mb-4">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-muted text-xs">最大大小</span>
          <input v-model.number="maxSizeMB" type="number" min="0.1" max="10" step="0.1" class="theme-input w-16 px-2 py-1 text-xs text-center">
          <span class="text-muted text-xs">MB</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-muted text-xs">最大尺寸</span>
          <input v-model.number="maxWidthOrHeight" type="number" min="100" max="4096" step="100" class="theme-input w-20 px-2 py-1 text-xs text-center">
          <span class="text-muted text-xs">px</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-muted text-xs">质量</span>
          <input v-model.number="quality" type="number" min="0.1" max="1" step="0.1" class="theme-input w-16 px-2 py-1 text-xs text-center">
        </div>
      </div>
    </div>

    <!-- 上传区域 -->
    <UploadZone @select="handleFileSelect" />

    <!-- 处理中 -->
    <div v-if="isProcessing" class="mt-4 text-center">
      <div class="theme-card inline-flex items-center gap-2 px-4 py-2">
        <div class="w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin"></div>
        <span class="text-secondary text-sm">压缩中...</span>
      </div>
    </div>

    <!-- 结果 -->
    <div v-if="results.length > 0" class="mt-4">
      <div class="theme-card p-3 mb-3 flex items-center justify-between">
        <span class="text-muted text-xs">{{ results.filter(r => r.status !== 'processing').length }} 个文件</span>
        <div class="flex items-center gap-3">
          <span class="text-accent text-sm font-medium">节省 {{ totalSaved }}</span>
          <button
            v-if="results.some(r => r.status === 'success')"
            @click="downloadAll"
            class="theme-button-primary px-3 py-1.5 text-xs"
          >
            下载全部
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <div v-for="r in results" :key="r.file" class="theme-card p-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="theme-icon-box w-8 h-8">
              <span v-if="r.status === 'success'" class="text-accent text-sm">OK</span>
              <span v-else-if="r.status === 'error'" class="text-red-400 text-sm">!</span>
              <span v-else class="text-muted text-xs animate-spin">...</span>
            </div>
            <div>
              <p class="text-primary text-sm">{{ r.file }}</p>
              <p v-if="r.error" class="text-red-400 text-xs">{{ r.error }}</p>
            </div>
          </div>
          <div v-if="r.status === 'success'" class="flex items-center gap-3">
            <p class="text-muted text-xs">{{ formatSize(r.originalSize) }} → {{ formatSize(r.compressedSize) }}</p>
            <span v-if="r.savedPercent > 0" class="text-accent text-sm font-medium">-{{ r.savedPercent }}%</span>
            <span v-else-if="r.savedPercent < 0" class="text-red-400 text-sm font-medium">+{{ Math.abs(r.savedPercent) }}%</span>
            <span v-else class="text-muted text-sm font-medium">0%</span>
            <button @click="downloadResult(r)" class="theme-button px-2 py-1 text-xs">
              <Icon name="download-line" :size="14" />
            </button>
          </div>
        </div>
      </div>

      <div class="mt-3 flex justify-end">
        <button @click="clearResults" class="theme-button px-3 py-1.5 text-xs text-muted">清空</button>
      </div>
    </div>

    <!-- 说明 -->
    <div v-if="results.length === 0 && !isProcessing" class="mt-4 theme-card p-4">
      <p class="text-muted text-xs">支持 JPG、PNG、WebP 格式，本地压缩，压缩可达 50-70%。</p>
    </div>
  </div>
</template>