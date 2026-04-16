<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFeaturesStore } from '@/stores/features'
import Icon from '@/components/common/Icon.vue'

const router = useRouter()
const route = useRoute()
const featuresStore = useFeaturesStore()

const currentRoute = computed(() => route.path)

// 展开/收起状态，默认展开第一个分类
const expandedCategories = reactive<Record<string, boolean>>({})
// 初始化第一个分类为展开状态
if (featuresStore.categories[0]?.id) {
  expandedCategories[featuresStore.categories[0].id] = true
}

const toggleCategory = (categoryId: string) => {
  expandedCategories[categoryId] = !expandedCategories[categoryId]
}

const isCategoryExpanded = (categoryId: string) => {
  return expandedCategories[categoryId] === true
}

const goToSettings = () => router.push('/settings')
const goToHome = () => router.push('/')

const categoryIcons: Record<string, string> = {
  image: 'image-line',
  office: 'file-text-line'
}

const featureIcons: Record<string, string> = {
  compress: 'image-edit-line',
  upload: 'upload-cloud-line',
  split: 'layout-grid-line',
  edit: 'edit-line'
}
</script>

<template>
  <aside class="theme-sidebar flex flex-col py-4">
    <!-- 首页按钮 -->
    <div class="px-4 mb-4">
      <button
        @click="goToHome"
        class="theme-card w-full px-4 py-3 flex items-center gap-3"
        :class="{ 'text-accent': currentRoute === '/' }"
      >
        <div class="theme-icon-box w-6 h-6">
          <Icon name="home-4-line" :size="14" class="icon-accent" />
        </div>
        <span class="text-sm text-primary">首页</span>
      </button>
    </div>

    <!-- 分类导航 -->
    <div class="flex-1 px-4">
      <div v-for="category in featuresStore.categories" :key="category.id" class="mb-4">
        <!-- 分类标题 - 可点击切换展开/收起 -->
        <button
          @click="toggleCategory(category.id)"
          class="theme-nav font-medium flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
        >
          <Icon
            :name="isCategoryExpanded(category.id) ? 'arrow-down-s-line' : 'arrow-right-s-line'"
            :size="16"
            class="icon-accent transition-transform"
          />
          <Icon :name="categoryIcons[category.id] || 'folder-line'" :size="16" class="icon-accent" />
          <span class="text-primary">{{ category.name }}</span>
        </button>

        <!-- 功能列表 - 条件渲染 -->
        <div v-show="isCategoryExpanded(category.id)" class="mt-2 ml-4 space-y-1">
          <router-link
            v-for="feature in featuresStore.getFeaturesByCategory(category.id)"
            :key="feature.id"
            :to="feature.route"
            class="theme-nav block flex items-center gap-2"
            :class="{ 'active': currentRoute === feature.route }"
          >
            <Icon :name="featureIcons[feature.icon] || 'file-line'" :size="14" class="icon-accent" />
            {{ feature.name }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- 设置按钮 -->
    <div class="px-4 mt-4">
      <button
        @click="goToSettings"
        class="theme-card w-full px-4 py-3 flex items-center gap-3"
        :class="{ 'text-accent': currentRoute === '/settings' }"
      >
        <div class="theme-icon-box w-6 h-6">
          <Icon name="settings-3-line" :size="14" class="icon-accent" />
        </div>
        <span class="text-sm text-primary">设置</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.icon-accent {
  color: var(--accent);
}
</style>