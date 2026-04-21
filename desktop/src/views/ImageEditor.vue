<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import UploadZone from '@/components/common/UploadZone.vue'
import Icon from '@/components/common/Icon.vue'
import ImageEditorCore from './ImageEditorCore.vue'

const route = useRoute()

const originalFile = ref<File | null>(null)
const originalUrl = ref('')
const editorKey = ref(0)
const editorRef = ref<any>(null)
const isReady = ref(false)

const handleFileSelect = async (files: File[]) => {
  if (files.length === 0) return

  const file = files[0]
  originalFile.value = file

  if (originalUrl.value) {
    URL.revokeObjectURL(originalUrl.value)
  }
  originalUrl.value = URL.createObjectURL(file)

  editorKey.value++
  isReady.value = true
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

const handleSave = async (blob: Blob) => {
  const filename = originalFile.value?.name || 'edited-image.png'

  if (window.electronAPI?.saveFile) {
    // Electron 环境：让用户选择保存位置
    const savePath = await window.electronAPI.saveFile(filename)
    if (!savePath) return

    try {
      const base64 = await blobToBase64(blob)
      await window.electronAPI.saveFileWithPath(savePath, base64)
      ElMessage.success(`已保存: ${filename}`)
    } catch (e: any) {
      console.error('保存失败:', e)
      ElMessage.error(e.message || '保存失败')
    }
  } else {
    // 非 Electron 环境
    const url = URL.createObjectURL(blob)
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

const reset = () => {
  if (originalUrl.value) {
    URL.revokeObjectURL(originalUrl.value)
  }
  originalFile.value = null
  originalUrl.value = ''
  isReady.value = false
  editorKey.value++
}

/**
 * 处理从悬浮球传来的文件
 * 从全局变量读取文件路径，然后读取文件
 */
async function handleFloatingFile() {
  const globalPath = (window as any).__floatingFilePath
  if (globalPath?.value) {
    const filePath = globalPath.value
    globalPath.value = null

    try {
      const uint8Array = await window.electronAPI.readFileAsArrayBuffer(filePath)
      if (uint8Array) {
        const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`

        const blob = new Blob([uint8Array], { type: mimeType })
        const fileName = filePath.split(/[/\\]/).pop() || 'image.' + ext
        const file = new File([blob], fileName, { type: mimeType })
        handleFileSelect([file])
      }
    } catch (e) {
      console.error('Failed to load file from path:', e)
    }
  }
}

onMounted(() => {
  handleFloatingFile()
})

// 监听文件路径变化（从悬浮球）
watch(() => (window as any).__filePathChanged?.value, () => {
  handleFloatingFile()
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-4 title-line" style="font-size: var(--font-size-title)">图片编辑</h1>

    <!-- 上传区域 -->
    <div v-if="!isReady">
      <UploadZone @select="handleFileSelect" />

      <!-- 说明 -->
      <div class="mt-4 theme-card p-4">
        <p class="text-muted text-xs">
          支持图片裁剪、旋转、画笔标注、形状标注、文字标注、滤镜等功能。
        </p>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div v-else class="space-y-4">
      <!-- 工具栏 -->
      <div class="theme-card p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name="image-line" :size="16" class="text-accent" />
            <span class="text-secondary text-sm">{{ originalFile?.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="editorRef?.save()" class="theme-button-primary px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Icon name="download-line" :size="14" />
              保存图片
            </button>
            <button @click="reset" class="theme-button px-3 py-1.5 text-xs text-muted">
              重选图片
            </button>
          </div>
        </div>
      </div>

      <!-- 编辑器容器 -->
      <div class="theme-card editor-wrapper">
        <ImageEditorCore
          ref="editorRef"
          :key="editorKey"
          :imgUrl="originalUrl"
          @save="handleSave"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-wrapper {
  height: 500px;
  overflow: hidden;
}

.text-accent {
  color: var(--accent);
}
</style>