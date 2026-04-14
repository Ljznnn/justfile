<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
import UploadZone from '@/components/common/UploadZone.vue'
import Icon from '@/components/common/Icon.vue'

interface Result {
  file: string
  originalSize: number
  compressedSize: number
  savedPercent: number
  outputPath: string
  status: 'processing' | 'success' | 'error'
  error?: string
}

const settingsStore = useSettingsStore()
const results = ref<Result[]>([])
const isProcessing = ref(false)
const showConfig = ref(false)

onMounted(() => settingsStore.loadSettings())

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const totalSaved = computed(() => formatSize(
  results.value.filter(r => r.status === 'success').reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0)
))

const handleFileSelect = async (files: File[]) => {
  if (!settingsStore.tinifyKey) {
    showConfig.value = true
    ElMessage.warning('请先配置 TinyPNG API Key')
    return
  }

  files.forEach(f => results.value.push({ file: f.name, originalSize: f.size, compressedSize: 0, savedPercent: 0, outputPath: '', status: 'processing' }))
  isProcessing.value = true

  for (const file of files) {
    const idx = results.value.findIndex(r => r.file === file.name && r.status === 'processing')
    try {
      const filePath = await window.electronAPI.selectFile([{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }])
      const res = await window.electronAPI.compressImage(filePath[0], settingsStore.tinifyKey)
      results.value[idx] = { ...results.value[idx], ...res, status: res.success ? 'success' : 'error', error: res.error }
    } catch (e: any) {
      results.value[idx] = { ...results.value[idx], status: 'error', error: e.message }
    }
  }

  isProcessing.value = false
}

const clearResults = () => results.value = []

const saveConfig = async () => {
  await settingsStore.saveSetting('tinifyKey', settingsStore.tinifyKey)
  ElMessage.success('配置已保存')
  showConfig.value = false
}
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

    <!-- 配置区域 -->
    <div class="theme-card p-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="settings-3-line" :size="16" class="text-accent" />
          <span class="text-secondary text-sm">API 配置</span>
          <span v-if="settingsStore.tinifyKey" class="text-xs text-green-400">已配置</span>
          <span v-else class="text-xs text-red-400">未配置</span>
        </div>
        <button @click="showConfig = !showConfig" class="theme-button px-2 py-1 text-xs">
          <Icon :name="showConfig ? 'arrow-up-s-line' : 'arrow-down-s-line'" :size="14" />
        </button>
      </div>

      <!-- 配置表单 -->
      <div v-if="showConfig" class="mt-3 pt-3 border-t border-[var(--border-color)]">
        <label class="block text-muted text-xs mb-1.5">TinyPNG API Key</label>
        <input
          v-model="settingsStore.tinifyKey"
          type="password"
          placeholder="输入 API Key"
          class="w-full theme-input px-3 py-2 text-sm mb-2"
        />
        <div class="flex items-center justify-between">
          <a href="https://tinify.com/developers" target="_blank" class="text-accent hover:underline text-xs">
            获取 API Key
          </a>
          <button @click="saveConfig" class="theme-button-primary px-3 py-1.5 text-xs">
            保存配置
          </button>
        </div>
      </div>
    </div>

    <!-- 上传区域 -->
    <UploadZone @select="handleFileSelect" />

    <!-- 处理中 -->
    <div v-if="isProcessing" class="mt-4 text-center">
      <div class="theme-card inline-flex items-center gap-2 px-4 py-2">
        <div class="w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin"></div>
        <span class="text-secondary text-sm">处理中...</span>
      </div>
    </div>

    <!-- 结果 -->
    <div v-if="results.length > 0" class="mt-4">
      <div class="theme-card p-3 mb-3 flex items-center justify-between">
        <span class="text-muted text-xs">{{ results.filter(r => r.status !== 'processing').length }} 个文件</span>
        <span class="text-accent text-sm font-medium">节省 {{ totalSaved }}</span>
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
            <span class="text-accent text-sm font-medium">-{{ r.savedPercent }}%</span>
          </div>
        </div>
      </div>

      <div class="mt-3 flex justify-end">
        <button @click="clearResults" class="theme-button px-3 py-1.5 text-xs text-muted">清空</button>
      </div>
    </div>

    <!-- 说明 -->
    <div v-if="results.length === 0 && !isProcessing" class="mt-4 theme-card p-4">
      <p class="text-muted text-xs">支持 JPG、PNG、WebP 格式，压缩可达 50-70%。使用 TinyPNG API 进行无损压缩。</p>
    </div>
  </div>
</template>