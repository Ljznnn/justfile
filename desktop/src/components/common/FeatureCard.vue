<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Feature } from '@/stores/features'
import Icon from '@/components/common/Icon.vue'

const props = defineProps<{ feature: Feature }>()
const router = useRouter()

const iconMap: Record<string, string> = {
  compress: 'image-edit-line',
  upload: 'upload-cloud-line',
  split: 'layout-grid-line',
  pdf: 'file-pdf-2-line',
  merge: 'file-add-line',
  edit: 'edit-line'
}

const handleClick = () => router.push(props.feature.route)
</script>

<template>
  <div @click="handleClick" class="theme-card p-5">
    <!-- 图标 -->
    <div class="theme-icon-box w-10 h-10 mb-3">
      <Icon :name="iconMap[props.feature.icon] || 'file-line'" :size="20" class="icon-accent" />
    </div>

    <!-- 标题 -->
    <h3 class="text-primary font-medium mb-1.5" style="font-size: var(--font-size-card-title)">
      {{ feature.name }}
    </h3>

    <!-- 描述 -->
    <p class="text-muted" style="font-size: var(--font-size-small)">
      {{ feature.description }}
    </p>
  </div>
</template>

<style scoped>
.icon-accent {
  color: var(--accent);
}
</style>