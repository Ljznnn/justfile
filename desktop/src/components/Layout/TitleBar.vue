<script setup lang="ts">
import Icon from '@/components/common/Icon.vue'

const minimize = () => window.electronAPI.windowMinimize()
const maximize = () => window.electronAPI.windowMaximize()
const close = () => window.electronAPI.windowClose()
</script>

<template>
  <div class="titlebar flex items-center justify-between px-4">
    <!-- Logo + 口号 -->
    <div class="flex items-center gap-3">
      <div class="theme-icon-box w-7 h-7">
        <Icon name="file-text-line" :size="16" class="icon-accent" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-primary font-medium text-sm">JustFile</span>
        <span class="text-muted text-xs hidden sm:inline">让文件处理更简单</span>
      </div>
    </div>

    <!-- 窗口控制按钮 -->
    <div class="flex items-center">
      <button
        @click="minimize"
        class="window-btn"
      >
        <Icon name="subtract-line" :size="14" />
      </button>
      <button
        @click="maximize"
        class="window-btn"
      >
        <Icon name="checkbox-blank-line" :size="12" />
      </button>
      <button
        @click="close"
        class="window-btn window-btn-close"
      >
        <Icon name="close-line" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  height: 40px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-sidebar);
  -webkit-app-region: drag;
}

.titlebar > * {
  -webkit-app-region: no-drag;
}

.icon-accent {
  color: var(--accent);
}

.window-btn {
  width: 46px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.window-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.window-btn-close:hover {
  background: #e81123;
  color: #fff;
}
</style>