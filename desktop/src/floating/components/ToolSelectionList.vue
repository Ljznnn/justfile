<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'

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

const isHoveringShare = ref(false)
const recentShares = ref<HistoryShare[]>([])
const shareItemRef = ref<HTMLElement | null>(null)
const dropdownTop = ref(0)
const dropdownLeft = ref(0)
const dropdownWidth = ref(0)
let closeTimer: ReturnType<typeof setTimeout> | null = null

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

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function updateDropdownPosition() {
  if (shareItemRef.value) {
    const rect = shareItemRef.value.getBoundingClientRect()
    dropdownTop.value = rect.bottom + 4
    dropdownLeft.value = rect.left
    dropdownWidth.value = rect.width
  }
}

function handleMouseEnterShare() {
  clearCloseTimer()
  isHoveringShare.value = true
  nextTick(updateDropdownPosition)
}

function handleMouseLeaveShare() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    isHoveringShare.value = false
  }, 150)
}

function handleDropdownEnter() {
  clearCloseTimer()
}

function handleDropdownLeave() {
  isHoveringShare.value = false
}

function handleSelectShare(shareCode: string) {
  emit('selectShare', shareCode)
}

function handleSelect(route: string) {
  emit('select', route)
}

// 工具列表配置
// 文件共享始终在第一位
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

// 根据文件类型获取工具列表
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

// 组件挂载时预加载数据
onMounted(() => {
  loadRecentShares()
})
</script>

<template>
  <div class="tool-selection-list">
    <TransitionGroup name="list" tag="div">
      <div
        v-for="tool in availableTools"
        :key="tool.id"
        :ref="tool.id === 'share' ? (el: any) => shareItemRef = el : undefined"
        class="tool-item"
        :class="{ 'tool-item-share': tool.id === 'share' }"
        @click="tool.id === 'share' && recentShares.length > 0 ? null : handleSelect(tool.route)"
        @mouseenter="tool.id === 'share' ? handleMouseEnterShare() : null"
        @mouseleave="tool.id === 'share' ? handleMouseLeaveShare() : null"
      >
        <div class="tool-icon-wrapper" :style="{ backgroundColor: `${tool.color}15` }">
          <svg class="tool-icon" :style="{ color: tool.color }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="tool.icon" />
          </svg>
        </div>
        <span class="tool-name">{{ tool.name }}</span>
        <span v-if="tool.id === 'share' && recentShares.length > 0" class="share-arrow" :class="{ expanded: isHoveringShare }">▼</span>
      </div>
    </TransitionGroup>

    <!-- 下拉框放在列表外层，使用 fixed 定位避免被裁剪 -->
    <Transition name="dropdown">
      <div
        v-if="isHoveringShare && recentShares.length > 0"
        class="share-dropdown"
        :style="{
          top: `${dropdownTop}px`,
          left: `${dropdownLeft}px`,
          width: `${dropdownWidth}px`
        }"
        @mouseenter="handleDropdownEnter"
        @mouseleave="handleDropdownLeave"
      >
        <div class="dropdown-title">最近分享</div>
        <div
          v-for="share in recentShares"
          :key="share.shareCode"
          class="share-item"
          @click.stop="handleSelectShare(share.shareCode)"
        >
          <div class="share-name">{{ share.shareName || share.shareCode }}</div>
          <div class="share-info">{{ share.memberCount }}人 · {{ share.fileCount }}文件</div>
          <div class="share-expire">{{ formatTime(share.expiresAt) }}</div>
        </div>
      </div>
    </Transition>
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
  position: relative;
}

.tool-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(102, 126, 234, 0.2);
}

.tool-item:active {
  background: rgba(102, 126, 234, 0.08);
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

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.share-arrow {
  font-size: 8px;
  color: #999;
  transition: transform 0.2s ease;
}

.share-arrow.expanded {
  transform: rotate(180deg);
}

.share-dropdown {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  transform-origin: top center;
}

.dropdown-title {
  padding: 8px 12px;
  font-size: 12px;
  color: #999;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
}

.share-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s ease;
}

.share-item:last-child {
  border-bottom: none;
}

.share-item:hover {
  background: #f5f7fa;
}

.share-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.share-info {
  font-size: 11px;
  color: #999;
}

.share-expire {
  font-size: 11px;
  color: #667eea;
  margin-top: 2px;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
