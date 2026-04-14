<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
import UploadZone from '@/components/common/UploadZone.vue'
import Icon from '@/components/common/Icon.vue'

interface Result {
  file: string
  url: string
  status: 'processing' | 'success' | 'error'
  error?: string
}

const settingsStore = useSettingsStore()
const results = ref<Result[]>([])
const isProcessing = ref(false)
const showConfig = ref(false)

onMounted(() => settingsStore.loadSettings())

const handleFileSelect = async (files: File[]) => {
  if (!settingsStore.githubToken || !settingsStore.githubRepo) {
    showConfig.value = true
    ElMessage.warning('请先配置 GitHub Token 和仓库')
    return
  }

  files.forEach(f => results.value.push({ file: f.name, url: '', status: 'processing' }))
  isProcessing.value = true

  for (const file of files) {
    const idx = results.value.findIndex(r => r.file === file.name && r.status === 'processing')
    try {
      const filePath = await window.electronAPI.selectFile([{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }])
      const res = await window.electronAPI.uploadImage(filePath[0], {
        repo: settingsStore.githubRepo,
        branch: settingsStore.githubBranch,
        token: settingsStore.githubToken,
        path: settingsStore.githubPath
      })
      results.value[idx] = { ...results.value[idx], url: res.url || '', status: res.success ? 'success' : 'error', error: res.error }
    } catch (e: any) {
      results.value[idx] = { ...results.value[idx], status: 'error', error: e.message }
    }
  }

  isProcessing.value = false
}

const copyUrl = (url: string) => {
  navigator.clipboard.writeText(url)
  ElMessage.success('已复制')
}

const clearResults = () => results.value = []

const saveConfig = async () => {
  await settingsStore.saveSettings()
  ElMessage.success('配置已保存')
  showConfig.value = false
}

const isConfigured = () => settingsStore.githubToken && settingsStore.githubRepo
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-4 title-line" style="font-size: var(--font-size-title)">图床上传</h1>

    <!-- 配置区域 -->
    <div class="theme-card p-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="github-line" :size="16" class="text-accent" />
          <span class="text-secondary text-sm">GitHub 配置</span>
          <span v-if="isConfigured()" class="text-xs text-green-400">已配置</span>
          <span v-else class="text-xs text-red-400">未配置</span>
        </div>
        <button @click="showConfig = !showConfig" class="theme-button px-2 py-1 text-xs">
          <Icon :name="showConfig ? 'arrow-up-s-line' : 'arrow-down-s-line'" :size="14" />
        </button>
      </div>

      <!-- 配置表单 -->
      <div v-if="showConfig" class="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3">
        <div>
          <label class="block text-muted text-xs mb-1.5">Token</label>
          <input v-model="settingsStore.githubToken" type="password" placeholder="Personal Access Token" class="w-full theme-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-muted text-xs mb-1.5">仓库</label>
          <input v-model="settingsStore.githubRepo" type="text" placeholder="用户名/仓库名" class="w-full theme-input px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-muted text-xs mb-1.5">分支</label>
            <input v-model="settingsStore.githubBranch" type="text" placeholder="main" class="w-full theme-input px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-muted text-xs mb-1.5">路径</label>
            <input v-model="settingsStore.githubPath" type="text" placeholder="images" class="w-full theme-input px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="flex items-center justify-between">
          <a href="https://github.com/settings/tokens" target="_blank" class="text-accent hover:underline text-xs">
            创建 Token · 需要 repo 权限
          </a>
          <button @click="saveConfig" class="theme-button-primary px-3 py-1.5 text-xs">
            保存配置
          </button>
        </div>
      </div>
    </div>

    <!-- 上传 -->
    <UploadZone @select="handleFileSelect" />

    <!-- 处理中 -->
    <div v-if="isProcessing" class="mt-4 text-center">
      <div class="theme-card inline-flex items-center gap-2 px-4 py-2">
        <div class="w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin"></div>
        <span class="text-secondary text-sm">上传中...</span>
      </div>
    </div>

    <!-- 结果 -->
    <div v-if="results.length > 0" class="mt-4 space-y-2">
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
          <p class="text-muted text-xs truncate max-w-xs">{{ r.url }}</p>
          <button @click="copyUrl(r.url)" class="theme-button-primary px-3 py-1.5 text-xs">复制</button>
        </div>
      </div>

      <div class="flex justify-end">
        <button @click="clearResults" class="theme-button px-3 py-1.5 text-xs text-muted">清空</button>
      </div>
    </div>

    <!-- 说明 -->
    <div v-if="results.length === 0 && !isProcessing" class="mt-4 theme-card p-4">
      <p class="text-muted text-xs">将图片上传到 GitHub 仓库，获取公开访问链接。支持 JPG、PNG、WebP、GIF 格式。</p>
    </div>
  </div>
</template>