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
const fileInfo = ref<{ name: string; size: number; extension: string; type: 'image' | 'pdf' | 'other' } | null>(null)
const expandDirection = ref<'top-left' | 'bottom-right' | 'top-right' | 'bottom-left'>('bottom-right') // 展开方向

// 拖动相关
let dragStartX = 0
let dragStartY = 0
let windowStartX = 0
let windowStartY = 0
let isDraggingLogic = false  // 是否正在拖动（移动超过阈值，用于逻辑判断）
let mouseDownTime = 0   // 鼠标按下时间
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

  fileInfo.value = {
    name: file.name,
    size: file.size,
    extension: '.' + file.name.split('.').pop()?.toLowerCase() || '',
    type: getFileType(file.name)
  }

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
  if (!fileInfo.value) return
  window.electronAPI.openToolWithFile(route, fileInfo.value.name)
  collapse()
}

/**
 * 鼠标进入
 */
function handleMouseEnter() {
  // 鼠标进入时，禁用点击穿透，让窗口可以接收鼠标事件
  window.electronAPI.floatingSetIgnoreMouseEvents(false)
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
  mouseDownTime = Date.now()
  
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
    
    // 重新计算展开方向
    await calculateExpandDirection()
    
    // 重置状态
    isDraggingLogic = false
    isDragging.value = false
    
    log('[FloatingBall] 拖动结束，状态检查:', {
      isExpanded: isExpanded.value,
      expandDirection: expandDirection.value
    })
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
  // 初始状态：设置点击穿透，让鼠标事件可以穿透到后面的窗口
  if (window.electronAPI) {
    window.electronAPI.floatingSetIgnoreMouseEvents(true, { forward: true })
    log('[FloatingBall] electronAPI 可用')
    
    // 计算展开方向
    await calculateExpandDirection()
  } else {
    console.warn('[FloatingBall] electronAPI 不可用')
  }
})

/**
 * 计算展开方向
 * 智能判断最佳展开方向，确保窗口完整显示在屏幕内
 */
async function calculateExpandDirection() {
  const position = await window.electronAPI.floatingGetPosition()
  if (!position) {
    console.warn('[FloatingBall] 无法获取位置，使用默认方向')
    expandDirection.value = 'bottom-right'
    return
  }
  
  // 通过 IPC 获取屏幕尺寸（包含坐标信息）
  const screenInfo = await window.electronAPI.getScreenInfo()
  const screenX = screenInfo.x
  const screenY = screenInfo.y
  const screenWidth = screenInfo.width
  const screenHeight = screenInfo.height
  
  // 展开面板尺寸
  const expandedWidth = 220
  const expandedHeight = 320
  
  // 圆形按钮尺寸
  const ballSize = 64
  
  // 计算窗口各边界的绝对屏幕坐标
  const windowLeft = position.x
  const windowTop = position.y
  const windowRight = position.x + ballSize
  const windowBottom = position.y + ballSize
  
  // 计算相对于当前显示器边界的可用空间
  const spaceRight = (screenX + screenWidth) - windowRight  // 向右展开的可用空间
  const spaceLeft = windowLeft - screenX  // 向左展开的可用空间
  const spaceBottom = (screenY + screenHeight) - windowBottom  // 向下展开的可用空间
  const spaceTop = windowTop - screenY  // 向上展开的可用空间
  
  log(`[FloatingBall] 屏幕空间分析 - 位置：(${position.x}, ${position.y}), 屏幕区域：(${screenX}, ${screenY}) ${screenWidth}x${screenHeight}`)
  log(`[FloatingBall] 右侧空间：${spaceRight}px, 左侧空间：${spaceLeft}px, 下方空间：${spaceBottom}px, 上方空间：${spaceTop}px`)
  
  // 优先尝试右下展开（默认方向）
  const canExpandBottomRight = spaceRight >= expandedWidth && spaceBottom >= expandedHeight
  
  // 如果右下空间不足，尝试其他方向
  if (!canExpandBottomRight) {
    // 检查是否可以左上展开
    const canExpandTopLeft = spaceLeft >= expandedWidth && spaceTop >= expandedHeight
    
    if (canExpandTopLeft) {
      expandDirection.value = 'top-left'
      log('[FloatingBall] 右下空间不足，切换为左上展开')
    } else {
      // 如果左上也不行，尝试右上或左下
      const canExpandTopRight = spaceRight >= expandedWidth && spaceTop >= expandedHeight
      const canExpandBottomLeft = spaceLeft >= expandedWidth && spaceBottom >= expandedHeight
      
      if (canExpandTopRight) {
        expandDirection.value = 'top-right'
        log('[FloatingBall] 右下和左上都不足，切换为右上展开')
      } else if (canExpandBottomLeft) {
        expandDirection.value = 'bottom-left'
        log('[FloatingBall] 右下和左上都不足，切换为左下展开')
      } else {
        // 如果所有方向都不够，选择空间最大的方向
        const totalSpace = {
          'bottom-right': spaceRight + spaceBottom,
          'top-left': spaceLeft + spaceTop,
          'top-right': spaceRight + spaceTop,
          'bottom-left': spaceLeft + spaceBottom
        }
        
        const bestDirection = Object.entries(totalSpace)
          .sort(([, a], [, b]) => b - a)[0][0] as string
        
        expandDirection.value = bestDirection as 'top-left' | 'bottom-right' | 'top-right' | 'bottom-left'
        log(`[FloatingBall] 所有方向空间都不足，选择空间最大的方向：${bestDirection}`)
      }
    }
  } else {
    expandDirection.value = 'bottom-right'
    log('[FloatingBall] 右下空间充足，使用默认展开方向')
  }
  
  log(`[FloatingBall] 最终展开方向：${expandDirection.value}`)
}

// 卸载时清理
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousemove', handleDocumentMouseMove)
})
</script>

<template>
  <div
    class="floating-ball"
    :class="{ expanded: isExpanded, 'expand-top-left': isExpanded && expandDirection === 'top-left', 'expand-top-right': isExpanded && expandDirection === 'top-right', 'expand-bottom-left': isExpanded && expandDirection === 'bottom-left' }"
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
  width: 64px;
  height: 64px;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 展开状态 - 容器尺寸变化 */
.floating-ball.expanded {
  width: 220px;
  height: 320px;
  overflow: visible;
}

/* 左上展开 - 圆形在右下角 */
.floating-ball.expanded.expand-top-left .ball-mini {
  position: absolute;
  bottom: 0;
  right: 0;
}

/* 右上展开 - 圆形在左下角 */
.floating-ball.expanded.expand-top-right .ball-mini {
  position: absolute;
  bottom: 0;
  left: 0;
}

/* 左下展开 - 圆形在右上角 */
.floating-ball.expanded.expand-bottom-left .ball-mini {
  position: absolute;
  top: 0;
  right: 0;
}

/* 右下展开（默认）- 圆形在左上角 */
.floating-ball.expanded.expand-bottom-right .ball-mini {
  position: absolute;
  top: 0;
  left: 0;
}

/* 圆形按钮 - 空闲时居中 */
.ball-mini {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: 3px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 10;
  transition: all 0.3s ease;
}

/* 展开时隐藏圆形按钮 */
.floating-ball.expanded .ball-mini {
  opacity: 0;
  pointer-events: none;
}

.ball-mini:active {
  cursor: grabbing;
}

.ball-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  pointer-events: none;
  -webkit-user-drag: none;
}

/* 展开面板 */
.ball-expanded {
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
}

.file-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
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
