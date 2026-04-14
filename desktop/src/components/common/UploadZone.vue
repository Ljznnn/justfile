<script setup lang="ts">
import { ref } from 'vue'
import Icon from '@/components/common/Icon.vue'

const emit = defineEmits<{ (e: 'select', files: File[]): void }>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => isDragging.value = false

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) emit('select', files)
}

const handleClick = () => fileInput.value?.click()

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) emit('select', files)
  target.value = ''
}
</script>

<template>
  <div
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
    class="theme-upload p-10 flex flex-col items-center justify-center cursor-pointer"
  >
    <!-- 上传图标 -->
    <div class="theme-icon-box w-14 h-14 mb-3">
      <Icon name="upload-cloud-2-line" :size="28" class="icon-accent" />
    </div>

    <!-- 提示文字 -->
    <p class="text-primary text-sm mb-1">
      {{ isDragging ? '松开上传' : '拖拽文件到这里' }}
    </p>
    <p class="text-muted text-xs mb-3">或点击选择</p>

    <!-- 支持格式 -->
    <div class="flex gap-1.5">
      <span class="theme-button px-2 py-0.5 text-xs text-muted">JPG</span>
      <span class="theme-button px-2 py-0.5 text-xs text-muted">PNG</span>
      <span class="theme-button px-2 py-0.5 text-xs text-muted">WebP</span>
      <span class="theme-button px-2 py-0.5 text-xs text-muted">GIF</span>
    </div>

    <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileChange" />
  </div>
</template>

<style scoped>
.icon-accent {
  color: var(--accent);
}
</style>