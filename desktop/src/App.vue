<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Layout/Sidebar.vue'
import TitleBar from '@/components/Layout/TitleBar.vue'

const router = useRouter()

// 全局文件数据存储（用于悬浮球传递文件）
const globalFileData = ref<{ route: string; fileData: { name: string; data: ArrayBuffer; type: string } } | null>(null)

// 导出给其他组件使用
;(window as any).__floatingFileData = globalFileData

/**
 * 处理从悬浮球传来的导航消息
 */
function handleMainNavigate(data: { route: string; filePath: string }) {
  if (data.route) {
    // 导航到目标页面，通过 query 参数传递文件路径
    router.push({
      path: data.route,
      query: data.filePath ? { file: data.filePath } : undefined
    })
  }
}

/**
 * 处理从悬浮球传来的导航消息（带文件数据）
 * 先执行路由导航，目标页面会监听并处理文件数据
 */
function handleMainNavigateWithData(data: { route: string; fileData: { name: string; data: ArrayBuffer; type: string } }) {
  console.log('[App] handleMainNavigateWithData called, route:', data.route)
  console.log('[App] fileData:', data.fileData ? { name: data.fileData.name, type: data.fileData.type, dataSize: data.fileData.data.byteLength } : 'null')

  if (data.route) {
    // 先保存文件数据到全局变量
    globalFileData.value = data
    // 导航到目标页面，目标页面的 onMounted 会处理文件数据
    console.log('[App] Navigating to:', data.route)
    router.push(data.route)
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
  // 监听主窗口导航消息（带文件数据，来自悬浮球）
  window.electronAPI?.onMainNavigateWithData?.(handleMainNavigateWithData)
  // 监听悬浮球日志
  window.electronAPI?.onFloatingLog?.(handleFloatingLog)
})

onUnmounted(() => {
  window.electronAPI?.removeMainNavigateListener?.()
  window.electronAPI?.removeMainNavigateWithDataListener?.()
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