<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFeaturesStore } from '@/stores/features'
import FeatureCard from '@/components/common/FeatureCard.vue'
import Icon from '@/components/common/Icon.vue'

const featuresStore = useFeaturesStore()
const searchQuery = ref('')

// 搜索过滤
const filteredFeatures = computed(() => {
  if (!searchQuery.value.trim()) {
    return null // 无搜索时显示分类
  }
  const query = searchQuery.value.toLowerCase()
  return featuresStore.features.filter(f =>
    f.name.toLowerCase().includes(query) ||
    f.description.toLowerCase().includes(query)
  )
})

// 清空搜索
const clearSearch = () => searchQuery.value = ''
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- 搜索栏 -->
    <div class="mb-6">
      <div class="relative">
        <Icon name="search-line" :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索工具..."
          class="theme-input w-full py-3 pl-11 pr-10"
          style="font-size: 14px; border-radius: 12px"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute right-3 top-1/2 -translate-y-1/2 theme-button w-7 h-7 flex items-center justify-center rounded-full"
        >
          <Icon name="close-line" :size="14" class="text-muted" />
        </button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="filteredFeatures" class="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <FeatureCard
        v-for="feature in filteredFeatures"
        :key="feature.id"
        :feature="feature"
      />
      <div v-if="filteredFeatures.length === 0" class="col-span-full text-center py-8">
        <div class="theme-icon-box w-12 h-12 mx-auto mb-3">
          <Icon name="search-eye-line" :size="24" class="text-muted" />
        </div>
        <p class="text-muted">未找到相关工具</p>
      </div>
    </div>

    <!-- 功能分类（无搜索时显示） -->
    <div v-else>
      <div v-for="category in featuresStore.categories" :key="category.id" class="mb-6">
        <div class="flex items-center gap-2 mb-3 px-1">
          <div class="theme-icon-box w-7 h-7">
            <Icon :name="category.id === 'image' ? 'image-line' : 'file-text-line'" :size="14" class="text-accent" />
          </div>
          <h2 class="text-secondary font-medium" style="font-size: var(--font-size-nav)">
            {{ category.name }}
          </h2>
        </div>

        <!-- 功能卡片网格 -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard
            v-for="feature in featuresStore.getFeaturesByCategory(category.id)"
            :key="feature.id"
            :feature="feature"
          />
        </div>
      </div>
    </div>
  </div>
</template>