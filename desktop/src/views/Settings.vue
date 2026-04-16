<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import Icon from '@/components/common/Icon.vue'

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
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

    <!-- 说明 -->
    <div class="mt-4 theme-card p-4">
      <p class="text-muted text-xs">
        各工具的 API 配置请在对应页面中设置。图床上传、图片压缩、PDF转换等功能的配置项已移至各自的工具页面。
      </p>
    </div>
  </div>
</template>