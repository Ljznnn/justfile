<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/Layout/Sidebar.vue'
import TitleBar from '@/components/Layout/TitleBar.vue'

const router = useRouter()

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