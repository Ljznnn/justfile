<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Tool {
  id: string
  name: string
  icon: string
  route: string
  color: string
}

interface HistoryShare {
  shareCode: string
  shareId: number
  shareName: string | null
  expiresAt: number | null
  status: number
  memberCount: number
  fileCount: number
}

const props = defineProps<{
  fileType: 'image' | 'pdf' | 'other'
  fileExtension: string
}>()

const emit = defineEmits<{
  select: [route: string]
  selectShare: [shareCode: string]
}>()

const isShareExpanded = ref(false)
const recentShares = ref<HistoryShare[]>([])

function loadRecentShares() {
  const stored = localStorage.getItem('jf_share_history')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const now = Date.now()
      recentShares.value = parsed
        .filter((h: HistoryShare) => {
          if (h.status !== 1) return false
          if (h.expiresAt && h.expiresAt < now) return false
          return true
        })
        .slice(0, 5)
    } catch {
      recentShares.value = []
    }
  } else {
    recentShares.value = []
  }
}

function toggleShareExpand() {
  if (recentShares.value.length > 0) {
    isShareExpanded.value = !isShareExpanded.value
  } else {
    // 没有最近分享，直接跳转到分享页面
    emit('select', '/share')
  }
}

function handleSelectShare(shareCode: string) {
  emit('selectShare', shareCode)
}

function handleSelect(route: string) {
  emit('select', route)
}

// 工具列表配置
const shareTool: Tool = {
  id: 'share',
  name: '文件共享',
  icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  route: '/share',
  color: '#667eea'
}

const imageTools: Tool[] = [
  shareTool,
  {
    id: 'compress',
    name: '图片压缩',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    route: '/image/compress',
    color: '#667eea'
  },
  {
    id: 'upload',
    name: '图床上传',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    route: '/image/upload',
    color: '#764ba2'
  },
  {
    id: 'split',
    name: '图片切分',
    icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    route: '/image/split',
    color: '#f093fb'
  },
  {
    id: 'editor',
    name: '图片编辑',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    route: '/image/editor',
    color: '#f56c6c'
  }
]

const pdfTools: Tool[] = [
  shareTool,
  {
    id: 'pdf-editor',
    name: 'PDF 编辑',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    route: '/pdf/editor',
    color: '#667eea'
  }
]

const otherTools: Tool[] = [shareTool]

const availableTools = computed(() => {
  if (props.fileType === 'image') {
    return imageTools
  } else if (props.fileType === 'pdf') {
    return pdfTools
  } else {
    return otherTools
  }
})

function formatTime(expiresAt: number | null): string {
  if (!expiresAt) return '永不过期'
  const now = Date.now()
  const diff = expiresAt - now
  if (diff < 0) return '已过期'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟后过期`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时后过期`
  return `${Math.floor(diff / 86400000)}天后过期`
}

onMounted(() => {
  loadRecentShares()
})
</script>

<template>
  <div class="tool-selection-list">
    <div
      v-for="tool in availableTools"
      :key="tool.id"
      class="tool-group"
    >
      <!-- 工具项 -->
      <div
        class="tool-item"
        :class="{ 'tool-item-share': tool.id === 'share', expanded: tool.id === 'share' && isShareExpanded }"
        @click="tool.id === 'share' ? toggleShareExpand() : handleSelect(tool.route)"
      >
        <div class="tool-icon-wrapper" :style="{ backgroundColor: `${tool.color}15` }">
          <svg class="tool-icon" :style="{ color: tool.color }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="tool.icon" />
          </svg>
        </div>
        <span class="tool-name">{{ tool.name }}</span>
        <span v-if="tool.id === 'share' && recentShares.length > 0" class="share-arrow" :class="{ expanded: isShareExpanded }">▼</span>
      </div>

      <!-- 文件共享的子菜单 -->
      <Transition name="expand">
        <div v-if="tool.id === 'share' && isShareExpanded && recentShares.length > 0" class="submenu">
          <div
            v-for="share in recentShares"
            :key="share.shareCode"
            class="submenu-item"
            @click.stop="handleSelectShare(share.shareCode)"
          >
            <div class="submenu-item-name">{{ share.shareName || share.shareCode }}</div>
            <div class="submenu-item-meta">{{ share.memberCount }}人 · {{ share.fileCount }}文件 · {{ formatTime(share.expiresAt) }}</div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.tool-selection-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
}

.tool-selection-list::-webkit-scrollbar {
  width: 4px;
}

.tool-selection-list::-webkit-scrollbar-track {
  background: transparent;
}

.tool-selection-list::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 2px;
  transition: background 0.2s ease;
}

.tool-selection-list::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}

.tool-group {
  display: flex;
  flex-direction: column;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
  border: 1px solid transparent;
}

.tool-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(102, 126, 234, 0.2);
}

.tool-item:active {
  background: rgba(102, 126, 234, 0.08);
}

.tool-item-share.expanded {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.tool-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.tool-item:hover .tool-icon-wrapper {
  transform: scale(1.1);
}

.tool-icon {
  width: 18px;
  height: 18px;
}

.tool-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.share-arrow {
  font-size: 8px;
  color: #999;
  transition: transform 0.2s ease;
}

.share-arrow.expanded {
  transform: rotate(180deg);
}

/* 子菜单样式 */
.submenu {
  margin-left: 12px;
  border-left: 2px solid rgba(102, 126, 234, 0.3);
  padding-left: 8px;
  overflow: hidden;
}

.submenu-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
  margin: 2px 0;
}

.submenu-item:hover {
  background: rgba(102, 126, 234, 0.08);
}

.submenu-item-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submenu-item-meta {
  font-size: 10px;
  color: #999;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
