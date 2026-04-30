<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import Icon from '@/components/common/Icon.vue'

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

onMounted(() => {
  settingsStore.loadSettings()
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- 返回链接 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 页面标题 -->
    <h1 class="text-primary font-semibold mb-5 title-line" style="font-size: var(--font-size-title)">设置</h1>

    <!-- 外观设置 -->
    <div class="theme-card p-4">
      <h2 class="text-primary font-medium mb-3 flex items-center gap-2" style="font-size: var(--font-size-card-title)">
        <Icon name="palette-line" :size="16" />
        外观
      </h2>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="theme in themeStore.themes"
          :key="theme.id"
          @click="themeStore.switchTheme(theme.id as any)"
          class="theme-button p-3"
          :class="{ 'text-accent border-accent': themeStore.currentTheme === theme.id }"
        >
          <div class="font-medium text-sm mb-1">{{ theme.name }}</div>
          <div class="text-muted text-xs">{{ theme.description }}</div>
        </button>
      </div>
    </div>

    <!-- 通用设置 -->
    <div class="mt-4 theme-card p-4">
      <h2 class="text-primary font-medium mb-3 flex items-center gap-2" style="font-size: var(--font-size-card-title)">
        <Icon name="settings-3-line" :size="16" />
        通用
      </h2>
      <div class="flex flex-col gap-4">
        <!-- 关闭时缩小到系统托盘 -->
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-secondary">关闭时缩小到系统托盘</span>
          <div class="relative flex items-center">
            <span class="text-xs mr-2" :class="settingsStore.minimizeToTray ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'">
              {{ settingsStore.minimizeToTray ? '开' : '关' }}
            </span>
            <div class="relative">
              <input
                type="checkbox"
                v-model="settingsStore.minimizeToTray"
                class="sr-only peer"
                @change="settingsStore.saveSettings()"
              />
              <div class="w-11 h-6 bg-[var(--border-input)] rounded-full peer-checked:bg-[var(--text-secondary)] transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm ring-1 ring-black/10"></div>
            </div>
          </div>
        </label>
        <!-- 启动时默认显示悬浮球 -->
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-secondary">启动时默认显示悬浮球</span>
          <div class="relative flex items-center">
            <span class="text-xs mr-2" :class="settingsStore.floatingBallEnabled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'">
              {{ settingsStore.floatingBallEnabled ? '开' : '关' }}
            </span>
            <div class="relative">
              <input
                type="checkbox"
                v-model="settingsStore.floatingBallEnabled"
                class="sr-only peer"
                @change="settingsStore.saveSettings()"
              />
              <div class="w-11 h-6 bg-[var(--border-input)] rounded-full peer-checked:bg-[var(--text-secondary)] transition-colors"></div>
              <div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm ring-1 ring-black/10"></div>
            </div>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>