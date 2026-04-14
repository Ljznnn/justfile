<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import UploadZone from '@/components/common/UploadZone.vue'
import Icon from '@/components/common/Icon.vue'
import ImageEditorCore from './ImageEditorCore.vue'

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

const handleSave = (blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = originalFile.value?.name || 'edited-image.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('图片已保存')
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