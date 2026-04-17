<script setup lang="ts">
import { computed } from 'vue'

interface Tool {
  id: string
  name: string
  icon: string
  route: string
  color: string
}

const props = defineProps<{
  fileType: 'image' | 'pdf' | 'other'
  fileExtension: string
}>()

const emit = defineEmits<{
  select: [route: string]
}>()

// 工具列表配置
const imageTools: Tool[] = [
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
  {
    id: 'pdf-editor',
    name: 'PDF 编辑',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    route: '/pdf/editor',
    color: '#667eea'
  },
  {
    id: 'share',
    name: '文件共享',
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    route: '/share',
    color: '#764ba2'
  }
]

const otherTools: Tool[] = [
  {
    id: 'share',
    name: '文件共享',
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    route: '/share',
    color: '#667eea'
  }
]

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

function handleSelect(route: string) {
  emit('select', route)
}
</script>

<template>
  <div class="tool-selection-list">
    <TransitionGroup name="list" tag="div">
      <div
        v-for="tool in availableTools"
        :key="tool.id"
        class="tool-item"
        @click="handleSelect(tool.route)"
      >
        <div class="tool-icon-wrapper" :style="{ backgroundColor: `${tool.color}15` }">
          <svg class="tool-icon" :style="{ color: tool.color }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="tool.icon" />
          </svg>
        </div>
        <span class="tool-name">{{ tool.name }}</span>
      </div>
    </TransitionGroup>
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
}

.tool-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateX(2px);
}

.tool-item:active {
  transform: translateX(4px);
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
</style>
