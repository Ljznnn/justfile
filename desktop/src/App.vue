<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Layout/Sidebar.vue'
import TitleBar from '@/components/Layout/TitleBar.vue'

const router = useRouter()

// 全局文件路径存储（用于悬浮球传递文件）
const globalFilePath = ref<string | null>(null)

// 导出给其他组件使用
;(window as any).__floatingFilePath = globalFilePath

// 文件路径变化事件
const filePathChanged = ref(0)
;(window as any).__filePathChanged = filePathChanged

/**
 * 获取并清除全局文件路径（供工具页面调用）
 */
function getAndClearFilePath(): string | null {
  const path = globalFilePath.value
  globalFilePath.value = null
  return path
}

;(window as any).__getAndClearFilePath = getAndClearFilePath

/**
 * 处理从悬浮球传来的导航消息
 */
function handleMainNavigate(data: { route: string; filePath: string }) {
  console.log('[App] handleMainNavigate called, route:', data.route, 'filePath:', data.filePath)
  if (data.route) {
    // 保存文件路径到全局变量
    globalFilePath.value = data.filePath || null
    // 递增变化计数，通知监听器
    filePathChanged.value++
    // 导航到目标页面
    console.log('[App] Navigating to:', data.route)
    router.push({
      path: data.route,
      query: data.filePath ? { file: data.filePath } : undefined
    })
  }
}

/**
 * 处理悬浮球日志并输出到主窗口DevTools控制台
 */
function handleFloatingLog(args: any[]) {
  console.log('[FloatingBall]', ...args)
}

onMounted(() => {
  // 监听主窗口导航消息（来自悬浮球）
  window.electronAPI?.onMainNavigate?.(handleMainNavigate)
  // 监听悬浮球日志
  window.electronAPI?.onFloatingLog?.(handleFloatingLog)
})

onUnmounted(() => {
  window.electronAPI?.removeMainNavigateListener?.()
  window.electronAPI?.removeFloatingLogListener?.()
})
</script>

<template>
  <div class="app-bg flex flex-col h-screen overflow-hidden select-none relative">
    <!-- 自定义标题栏 -->
    <TitleBar />

    <!-- 主内容区域 -->
    <div class="flex flex-1 overflow-hidden relative z-10">
      <!-- 侧边栏 -->
      <Sidebar />

      <!-- 内容区 -->
      <main class="flex-1 overflow-auto p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style>
/* 禁止 body 滚动 */
body {
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>