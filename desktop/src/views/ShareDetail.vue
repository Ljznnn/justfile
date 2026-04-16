<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import Icon from '@/components/common/Icon.vue'
import { useShareStore } from '@/stores/share'
import { shareApi, getFingerprint } from '@/api/share'
import type { SharedFile, UploadProgress } from '@/types/share'
import * as tus from 'tus-js-client'

const route = useRoute()
const router = useRouter()
const shareStore = useShareStore()

const shareCode = route.params.code as string
const loading = ref(true)
const fileInput = ref<HTMLInputElement | null>(null)

// Upload state
const uploadList = ref<UploadProgress[]>([])
const API_BASE = 'http://localhost:8080/justfile/api'

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

// Format time
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

// Load share data
async function loadShare() {
  loading.value = true
  try {
    if (!shareStore.currentShare || shareStore.currentShare.shareCode !== shareCode) {
      await shareStore.joinShare(shareCode, { memberName: 'User' })
    }
    await shareStore.loadFiles()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// File upload with tus
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  for (const file of Array.from(target.files)) {
    await uploadFile(file)
  }

  // Reset input
  if (fileInput.value) fileInput.value.value = ''
}

/**
 * 处理拖拽上传
 * @param event 拖拽事件
 */
async function handleDrop(event: DragEvent) {
  if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) return

  for (const file of Array.from(event.dataTransfer.files)) {
    await uploadFile(file)
  }
}

async function uploadFile(file: File) {
  const uploadIndex = uploadList.value.length
  const progress: UploadProgress = {
    fileId: null,
    filename: file.name,
    progress: 0,
    uploadedBytes: 0,
    totalBytes: file.size,
    status: 'uploading'
  }
  uploadList.value.push(progress)

  console.log('[Tus上传] 开始上传:', {
    filename: file.name,
    size: file.size,
    endpoint: `${API_BASE}/tus`,
    shareId: shareStore.currentShare!.shareId
  })

  try {
    const upload = new tus.Upload(file, {
      endpoint: `${API_BASE}/tus`,
      chunkSize: 5 * 1024 * 1024, // 5MB
      metadata: {
        filename: file.name,
        filetype: file.type || 'application/octet-stream'
      },
      headers: {
        'X-Share-Id': String(shareStore.currentShare!.shareId),
        'X-Fingerprint': getFingerprint()
      },
      // 使用唯一的存储 key，避免恢复旧的无效上传记录
      storageKey: `tus_${shareStore.currentShare!.shareId}_${file.name}_${file.size}`,
      onError: (error) => {
        console.error('[Tus上传] 上传错误:', error)
        uploadList.value[uploadIndex].status = 'error'
        uploadList.value[uploadIndex].error = String(error)
        ElMessage.error(`上传失败: ${file.name}`)
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = bytesUploaded / bytesTotal * 100
        uploadList.value[uploadIndex].progress = pct
        uploadList.value[uploadIndex].uploadedBytes = bytesUploaded
      },
      onSuccess: () => {
        console.log('[Tus上传] 上传成功:', file.name)
        uploadList.value[uploadIndex].status = 'completed'
        uploadList.value[uploadIndex].progress = 100
        ElMessage.success(`上传完成: ${file.name}`)
        shareStore.loadFiles()
      }
    })

    upload.start()
  } catch (error) {
    console.error('[Tus上传] 异常:', error)
    uploadList.value[uploadIndex].status = 'error'
    uploadList.value[uploadIndex].error = String(error)
  }
}

/**
 * 下载文件
 * @param file 要下载的文件
 */
async function downloadFile(file: SharedFile) {
  try {
    const fingerprint = getFingerprint()
    const response = await fetch(`${API_BASE}/files/${file.id}/download`, {
      headers: { 'X-Fingerprint': fingerprint }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `下载失败 (${response.status})`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.originalName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success(`下载成功: ${file.originalName}`)
  } catch (error: any) {
    console.error('[文件下载] 失败:', error)
    ElMessage.error(error.message || '下载失败')
  }
}

// Delete file
async function deleteFile(file: SharedFile) {
  try {
    await ElMessageBox.confirm(`确定删除文件 "${file.originalName}"？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await shareStore.deleteFile(file.id)
    ElMessage.success('删除成功')
  } catch {
    // Cancelled
  }
}

// Close share
async function closeShare() {
  try {
    await ElMessageBox.confirm('确定关闭此分享？关闭后所有成员将无法访问。', '关闭确认', {
      confirmButtonText: '关闭',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await shareStore.closeShare(shareCode)
    ElMessage.success('分享已关闭')
    router.push('/share')
  } catch {
    // Cancelled
  }
}

// Copy share code
function copyShareCode() {
  navigator.clipboard.writeText(shareCode)
  ElMessage.success('分享码已复制')
}

// Auto refresh
let refreshTimer: number | null = null

onMounted(() => {
  loadShare()
  refreshTimer = window.setInterval(() => {
    shareStore.loadFiles()
  }, 10000) // Refresh every 10s
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Back -->
    <router-link to="/share" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full"></div>
    </div>

    <template v-else-if="shareStore.currentShare">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-primary font-semibold title-line">分享空间</h1>
          <div class="flex items-center gap-3 mt-2">
            <span class="text-accent font-mono text-lg tracking-wider">{{ shareCode }}</span>
            <button class="theme-button px-2 py-1 text-xs" @click="copyShareCode">
              <Icon name="clipboard-line" :size="12" />
            </button>
            <span v-if="shareStore.currentShare.expiresAt" class="text-muted text-xs">
              过期: {{ formatTime(shareStore.currentShare.expiresAt) }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-muted text-xs">
            {{ shareStore.currentShare.members.length }} 人
          </span>
          <button
            v-if="shareStore.isCreator"
            class="theme-button px-3 py-1.5 text-xs text-red-400"
            @click="closeShare"
          >
            关闭分享
          </button>
        </div>
      </div>

      <!-- Upload area -->
      <div v-if="shareStore.canUpload" class="mb-6">
        <div
          class="upload-area p-8 text-center cursor-pointer"
          @click="() => fileInput?.click()"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <div class="upload-icon-wrapper mb-3">
            <Icon name="upload-cloud-2-line" :size="48" class="upload-icon" />
          </div>
          <p class="upload-title text-secondary text-base font-medium mb-1">点击此处上传文件</p>
          <p class="upload-subtitle text-muted text-sm mb-2">或拖拽文件到此区域</p>
          <p class="upload-hint text-xs">
            <span class="upload-badge">支持分片上传</span>
            <span class="upload-badge">断点续传</span>
            <span class="upload-badge">最大 500MB</span>
          </p>
        </div>
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden"
          @change="handleFileSelect"
        />
      </div>

      <!-- No upload permission hint -->
      <div v-else class="mb-6">
        <div class="no-upload-area p-6 text-center">
          <Icon name="lock-line" :size="24" class="text-muted mb-2" />
          <p class="text-muted text-sm">当前分享模式仅允许创建者上传文件</p>
        </div>
      </div>

      <!-- Upload progress -->
      <div v-if="uploadList.length > 0" class="mb-6 space-y-2">
        <h3 class="text-secondary text-sm font-medium mb-2">上传进度</h3>
        <div
          v-for="(upload, index) in uploadList"
          :key="index"
          class="theme-card p-3 flex items-center gap-3"
        >
          <Icon
            :name="upload.status === 'completed' ? 'check-line' : upload.status === 'error' ? 'close-line' : 'loader-4-line'"
            :size="16"
            :class="upload.status === 'completed' ? 'text-green-400' : upload.status === 'error' ? 'text-red-400' : 'text-accent animate-spin'"
          />
          <div class="flex-1 min-w-0">
            <p class="text-primary text-sm truncate">{{ upload.filename }}</p>
            <div class="flex items-center gap-2 mt-1">
              <div class="flex-1 h-1.5 rounded-full" style="background: var(--bg-input)">
                <div
                  class="h-full rounded-full transition-all"
                  :style="{
                    width: upload.progress + '%',
                    background: upload.status === 'error' ? '#f56c6c' : 'var(--accent)'
                  }"
                />
              </div>
              <span class="text-muted text-xs w-12 text-right">
                {{ upload.progress.toFixed(0) }}%
              </span>
            </div>
          </div>
          <span class="text-muted text-xs">{{ formatSize(upload.uploadedBytes) }} / {{ formatSize(upload.totalBytes) }}</span>
        </div>
      </div>

      <!-- File list -->
      <div>
        <h3 class="text-secondary text-sm font-medium mb-3">
          文件列表 ({{ shareStore.files.length }})
        </h3>

        <div v-if="shareStore.files.length === 0" class="theme-card p-8 text-center">
          <Icon name="folder-open-line" :size="32" class="text-muted mb-2" />
          <p class="text-muted text-sm">暂无文件</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="file in shareStore.files"
            :key="file.id"
            class="theme-card p-3 flex items-center gap-3"
          >
            <Icon
              :name="file.mimeType?.startsWith('image/') ? 'image-line' : file.mimeType?.startsWith('video/') ? 'video-line' : 'file-line'"
              :size="20"
              class="text-accent flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-primary text-sm truncate">{{ file.originalName }}</p>
              <p class="text-muted text-xs mt-0.5">
                {{ formatSize(file.fileSize) }} · {{ file.uploaderName }} · {{ formatTime(file.createdAt) }}
              </p>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="theme-button px-2 py-1 text-xs"
                @click="downloadFile(file)"
                title="下载"
              >
                <Icon name="download-line" :size="14" />
              </button>
              <button
                v-if="shareStore.isCreator || file.uploaderName === 'You'"
                class="theme-button px-2 py-1 text-xs text-red-400"
                @click="deleteFile(file)"
                title="删除"
              >
                <Icon name="delete-bin-line" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Members -->
      <div class="mt-6">
        <h3 class="text-secondary text-sm font-medium mb-3">
          成员 ({{ shareStore.currentShare.members.length }})
        </h3>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="member in shareStore.currentShare.members"
            :key="member.id"
            class="theme-button px-3 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Icon :name="member.role === 1 ? 'vip-crown-line' : 'user-line'" :size="12" class="text-accent" />
            <span class="text-secondary">{{ member.memberName }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.text-accent { color: var(--accent-text); }
.text-red-400 { color: #f56c6c; }
.text-green-400 { color: #67c23a; }

/* Upload area styles */
.upload-area {
  background: var(--bg-card);
  border: 2px dashed var(--border-input);
  border-radius: 12px;
  transition: all 0.3s ease;
}
.upload-area:hover {
  border-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.05);
}
.upload-area:hover .upload-icon {
  color: var(--accent);
  transform: translateY(-4px);
}
.upload-area:hover .upload-title {
  color: var(--accent);
}

.upload-icon-wrapper {
  display: inline-block;
}
.upload-icon {
  color: var(--muted);
  transition: all 0.3s ease;
}

.upload-title {
  transition: color 0.2s;
}

.upload-hint {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.upload-badge {
  background: var(--bg-input);
  color: var(--muted);
  padding: 2px 8px;
  border-radius: 4px;
}

/* No upload permission */
.no-upload-area {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 8px;
}
</style>
