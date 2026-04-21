<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ToolSelectionList from './components/ToolSelectionList.vue'
import logo from '@/assets/logo.png'

// 日志辅助函数 - 转发到主进程控制台
const log = (...args: any[]) => {
  console.log(...args)
  // 同时转发到主进程
  if (window.electronAPI?.log) {
    window.electronAPI.log(...args)
  }
}

// 状态
const isExpanded = ref(false)
const isDragging = ref(false)
const fileInfo = ref<{ name: string; size: number; extension: string; type: 'image' | 'pdf' | 'other'; path: string } | null>(null)

// 拖动相关
let dragStartX = 0
let dragStartY = 0
let windowStartX = 0
let windowStartY = 0
let isDraggingLogic = false  // 是否正在拖动（移动超过阈值，用于逻辑判断）
const DRAG_THRESHOLD = 5  // 拖动阈值（像素）

/**
 * 处理文件拖入
 */
async function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (!e.dataTransfer?.files?.length) return

  isExpanded.value = true
  log('[FloatingBall] 拖入文件，调用展开')
  if (window.electronAPI) {
    await window.electronAPI.floatingExpand()
  }
}

/**
 * 处理文件拖出
 */
async function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    await collapse()
  }
}

/**
 * 处理文件放下
 */
async function handleDrop(e: DragEvent) {
  e.preventDefault()
  if (!e.dataTransfer?.files?.length) return

  const file = e.dataTransfer.files[0]
  // 获取文件本地路径（Electron 特有属性）
  const filePath = (file as any).path || ''

  // 存储文件信息
  fileInfo.value = {
    name: file.name,
    size: file.size,
    extension: '.' + file.name.split('.').pop()?.toLowerCase() || '',
    type: getFileType(file.name),
    path: filePath
  }

  log('[FloatingBall] 文件已获取:', file.name, file.size, 'bytes', 'Path:', filePath)

  isExpanded.value = true
  log('[FloatingBall] 文件放下，调用展开')
  await window.electronAPI.floatingExpand()
}

/**
 * 根据文件名判断类型
 */
function getFileType(filename: string): 'image' | 'pdf' | 'other' {
  const ext = '.' + filename.split('.').pop()?.toLowerCase() || ''
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  if (imageExts.includes(ext)) return 'image'
  if (ext === '.pdf') return 'pdf'
  return 'other'
}

/**
 * 收缩悬浮球
 */
async function collapse() {
  isExpanded.value = false
  fileInfo.value = null
  log('[FloatingBall] 调用收缩')
  await window.electronAPI.floatingCollapse()
}

/**
 * 打开工具
 */
function handleOpenTool(route: string) {
  console.log('[FloatingBall] handleOpenTool called, route:', route)
  console.log('[FloatingBall] fileInfo:', fileInfo.value)
  console.log('[FloatingBall] electronAPI:', window.electronAPI ? 'exists' : 'null')
  console.log('[FloatingBall] openToolWithFile:', window.electronAPI?.openToolWithFile ? 'exists' : 'null')

  if (!fileInfo.value) {
    console.log('[FloatingBall] ERROR: fileInfo is null')
    return
  }

  // 传递文件路径给工具页面
  console.log('[FloatingBall] Calling openToolWithFile, path:', fileInfo.value.path)
  window.electronAPI.openToolWithFile(route, fileInfo.value.path)
  collapse()
}

/**
 * 选择分享项目，跳转到分享详情页
 */
function handleSelectShare(shareCode: string) {
  console.log('[FloatingBall] handleSelectShare called, shareCode:', shareCode)
  console.log('[FloatingBall] fileInfo:', fileInfo.value)
  
  if (!fileInfo.value) {
    console.log('[FloatingBall] ERROR: fileInfo is null')
    return
  }

  // 跳转到分享详情页，并传递文件路径
  const shareRoute = `/share/${shareCode}`
  console.log('[FloatingBall] Calling openToolWithFile, route:', shareRoute, 'path:', fileInfo.value.path)
  window.electronAPI.openToolWithFile(shareRoute, fileInfo.value.path)
  collapse()
}

/**
 * 鼠标离开
 */
function handleMouseLeave() {
  // 鼠标离开且未展开时，恢复点击穿透
  if (!isExpanded.value && !isDragging.value) {
    window.electronAPI.floatingSetIgnoreMouseEvents(true, { forward: true })
  }
}

/**
 * 鼠标进入
 */
function handleMouseEnter() {
  // 鼠标进入时，禁用点击穿透，让窗口可以接收鼠标事件
  window.electronAPI.floatingSetIgnoreMouseEvents(false)
}

/**
 * 开始拖动
 */
async function handleMouseDown(e: MouseEvent) {
  if (isExpanded.value) {
    console.warn('[FloatingBall] 尝试在展开状态下拖动，先收缩')
    await collapse()
    return
  }

  // 重置拖动状态
  isDragging.value = false
  isDraggingLogic = false

  dragStartX = e.screenX
  dragStartY = e.screenY

  const cachedPosition = await window.electronAPI.floatingGetPosition()
  if (cachedPosition) {
    windowStartX = cachedPosition.x
    windowStartY = cachedPosition.y
  }

  document.body.style.cursor = 'grabbing'
  // 阻止事件冒泡和默认行为
  e.preventDefault()
  e.stopPropagation()

  // 注册全局鼠标事件
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

/**
 * 拖动中
 */
function handleMouseMove(e: MouseEvent) {
  const deltaX = e.screenX - dragStartX
  const deltaY = e.screenY - dragStartY
  
  // 判断是否达到拖动阈值
  if (!isDraggingLogic && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
    isDraggingLogic = true
    isDragging.value = true
  }
  
  // 只有在真正拖动时才更新位置
  if (isDraggingLogic) {
    const newX = windowStartX + deltaX
    const newY = windowStartY + deltaY
    window.electronAPI.floatingSetPosition(newX, newY)
  }
}

/**
 * 结束拖动
 */
async function handleMouseUp(e: MouseEvent) {
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  // 如果达到了拖动阈值，保存位置
  if (isDraggingLogic) {
    const deltaX = e.screenX - dragStartX
    const deltaY = e.screenY - dragStartY
    const finalX = windowStartX + deltaX
    const finalY = windowStartY + deltaY

    await window.electronAPI.floatingSavePosition(finalX, finalY)

    // 重置状态
    isDraggingLogic = false
    isDragging.value = false

    log('[FloatingBall] 拖动结束')
  }

  document.body.style.cursor = ''
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formattedSize = computed(() => {
  if (!fileInfo.value) return ''
  return formatFileSize(fileInfo.value.size)
})

const typeLabel = computed(() => {
  if (!fileInfo.value) return ''
  if (fileInfo.value.type === 'image') return '图片'
  if (fileInfo.value.extension === '.pdf') return 'PDF 文档'
  return '文件'
})

// 挂载时设置
onMounted(async () => {
  log('[FloatingBall] 悬浮球已挂载')
  document.body.style.background = 'transparent'
  document.documentElement.style.background = 'transparent'
  // 初始状态：不设置点击穿透，让悬浮球可以接收拖放事件
  // 点击穿透只在收缩状态下且鼠标离开时设置
  if (window.electronAPI) {
    // 初始不穿透，等待鼠标离开后再设置
    log('[FloatingBall] electronAPI 可用')
  } else {
    console.warn('[FloatingBall] electronAPI 不可用')
  }
})

// 卸载时清理
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div
    class="floating-ball"
    :class="{ expanded: isExpanded }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 圆形按钮（始终显示） -->
    <div class="ball-mini" @mousedown="handleMouseDown">
      <img class="ball-logo" :src="logo" alt="JustFile Logo" draggable="false" @dragstart.prevent />
    </div>
    
    <!-- 展开面板（展开时显示） -->
    <div v-if="isExpanded" class="ball-expanded">
      <!-- 文件信息头部 -->
      <div v-if="fileInfo" class="file-header">
        <div class="file-icon-wrapper">
          <svg v-if="fileInfo.type === 'image'" class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <svg v-else-if="fileInfo.type === 'pdf'" class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <svg v-else class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
        </div>
        <div class="file-info">
          <p class="file-name">{{ fileInfo.name }}</p>
          <p class="file-meta">{{ formattedSize }} · {{ typeLabel }}</p>
        </div>
      </div>

      <!-- 工具选择列表 -->
      <ToolSelectionList 
        :file-type="fileInfo?.type || 'other'" 
        :file-extension="fileInfo?.extension || ''"
        @select="handleOpenTool"
        @select-share="handleSelectShare"
      />

      <!-- 关闭按钮 -->
      <div class="close-btn" @click.stop="collapse">
        <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>关闭</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.floating-ball {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
}

/* 圆形按钮 - 收缩状态时居中 */
.ball-mini {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff 0%, #777f83 100%);
  border: 3px solid #f67c38;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 10;
  transition: opacity 0.15s ease, transform 0.2s ease;
}

/* 展开时隐藏圆形按钮 */
.floating-ball.expanded .ball-mini {
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.6);
}

.ball-mini:active {
  cursor: grabbing;
}

.ball-logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
  pointer-events: none;
  -webkit-user-drag: none;
}

/* 展开面板 - 从中心展开 */
.ball-expanded {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 5;
  box-sizing: border-box;
  /* 从圆形大小开始，展开到填满窗口 */
  animation: expandFromCenter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes expandFromCenter {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
    border-radius: 50%;
  }
  50% {
    opacity: 1;
    border-radius: 20px;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
    border-radius: 12px;
  }
}

.file-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out 0.1s both;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  width: 18px;
  height: 18px;
  color: #667eea;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 11px;
  color: #999;
  margin: 2px 0 0 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  color: #999;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0 0 12px 12px;
  animation: slideIn 0.3s ease-out 0.15s both;
}

.close-btn:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.05);
}

.close-icon {
  width: 14px;
  height: 14px;
}
</style>
