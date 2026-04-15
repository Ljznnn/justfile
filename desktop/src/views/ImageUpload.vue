<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
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
const isDragging = ref(false)

// 点击上传区域
const handleUploadClick = async () => {
  if (!settingsStore.upload.githubToken || !settingsStore.upload.githubRepo) {
    showConfig.value = true
    ElMessage.warning('请先配置 GitHub Token 和仓库')
    return
  }

  // Electron 环境：直接调用系统文件选择器
  const filePaths = await window.electronAPI.selectFile([{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }])
  if (!filePaths || filePaths.length === 0) return

  await uploadFiles(filePaths)
}

// 拖拽上传
const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  if (!settingsStore.upload.githubToken || !settingsStore.upload.githubRepo) {
    showConfig.value = true
    ElMessage.warning('请先配置 GitHub Token 和仓库')
    return
  }

  // 拖拽的文件需要先保存到本地再上传
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length === 0) return

  ElMessage.info('拖拽上传暂不支持，请点击选择文件')
}

// 上传文件
const uploadFiles = async (filePaths: string[]) => {
  isProcessing.value = true

  for (const filePath of filePaths) {
    const fileName = filePath.split(/[/\\]/).pop() || ''
    results.value.push({ file: fileName, url: '', status: 'processing' })

    const idx = results.value.findIndex(r => r.file === fileName && r.status === 'processing')
    try {
      const res = await window.electronAPI.uploadImage(filePath, {
        repo: settingsStore.upload.githubRepo,
        branch: settingsStore.upload.githubBranch,
        token: settingsStore.upload.githubToken,
        path: settingsStore.upload.githubPath,
        timestampRename: settingsStore.upload.timestampRename,
        customDomain: settingsStore.upload.customDomain,
        allowOverwrite: settingsStore.upload.allowOverwrite
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

const isConfigured = () => settingsStore.upload.githubToken && settingsStore.upload.githubRepo
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
    <div class="theme-card mb-4">
      <div
        class="flex items-center justify-between p-4 cursor-pointer select-none"
        @click="showConfig = !showConfig"
      >
        <div class="flex items-center gap-2">
          <Icon name="github-line" :size="16" class="text-accent" />
          <span class="text-secondary text-sm">GitHub 配置</span>
          <span v-if="isConfigured()" class="text-xs text-green-400">已配置</span>
          <span v-else class="text-xs text-red-400">未配置</span>
        </div>
        <Icon :name="showConfig ? 'arrow-up-s-line' : 'arrow-down-s-line'" :size="16" class="text-muted" />
      </div>

      <!-- 配置表单 -->
      <div v-if="showConfig" class="px-4 pb-4 pt-3 space-y-3 border-t border-[var(--border-color)]">
        <div>
          <label class="block text-muted text-xs mb-1.5">Token</label>
          <input v-model="settingsStore.upload.githubToken" type="password" placeholder="Personal Access Token" class="w-full theme-input px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-muted text-xs mb-1.5">仓库</label>
          <input v-model="settingsStore.upload.githubRepo" type="text" placeholder="用户名/仓库名" class="w-full theme-input px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-muted text-xs mb-1.5">分支</label>
            <input v-model="settingsStore.upload.githubBranch" type="text" placeholder="main" class="w-full theme-input px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-muted text-xs mb-1.5">路径</label>
            <input v-model="settingsStore.upload.githubPath" type="text" placeholder="images" class="w-full theme-input px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="timestampRename"
            v-model="settingsStore.upload.timestampRename"
            class="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
          <label for="timestampRename" class="text-secondary text-sm cursor-pointer">时间戳重命名</label>
        </div>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowOverwrite"
            v-model="settingsStore.upload.allowOverwrite"
            class="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
          <label for="allowOverwrite" class="text-secondary text-sm cursor-pointer">允许覆盖</label>
        </div>
        <div>
          <label class="block text-muted text-xs mb-1.5">自定义域名</label>
          <input v-model="settingsStore.upload.customDomain" type="text" placeholder="例如: https://cdn.jsdelivr.net/gh/用户名/仓库名@分支" class="w-full theme-input px-3 py-2 text-sm" />
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

    <!-- 上传区域 -->
    <div
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop="handleDrop"
      @click="handleUploadClick"
      class="theme-upload p-10 flex flex-col items-center justify-center cursor-pointer"
    >
      <div class="theme-icon-box w-14 h-14 mb-3">
        <Icon name="upload-cloud-2-line" :size="28" class="icon-accent" />
      </div>
      <p class="text-primary text-sm mb-1">
        {{ isDragging ? '松开上传' : '点击选择图片' }}
      </p>
      <p class="text-muted text-xs mb-3">支持 JPG、PNG、WebP、GIF</p>
      <div class="flex gap-1.5">
        <span class="theme-button px-2 py-0.5 text-xs text-muted">JPG</span>
        <span class="theme-button px-2 py-0.5 text-xs text-muted">PNG</span>
        <span class="theme-button px-2 py-0.5 text-xs text-muted">WebP</span>
        <span class="theme-button px-2 py-0.5 text-xs text-muted">GIF</span>
      </div>
    </div>

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
          <el-tooltip :content="r.url" placement="top" :show-after="300">
            <p class="text-muted text-xs truncate max-w-xs cursor-default">{{ r.url }}</p>
          </el-tooltip>
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

<style scoped>
.icon-accent {
  color: var(--accent);
}
</style>