<script setup lang="ts">
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
      </svg>
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-4 title-line" style="font-size: var(--font-size-title)">PDF 合并</h1>

    <!-- 开发提示 -->
    <div class="theme-card p-6 text-center">
      <div class="theme-icon-box w-12 h-12 mx-auto mb-3">
        <span class="text-accent text-lg">...</span>
      </div>
      <p class="text-secondary text-sm mb-1">功能开发中</p>
      <p class="text-muted text-xs">敬请期待</p>
    </div>
  </div>
</template>