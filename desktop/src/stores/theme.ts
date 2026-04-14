import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeName = 'tech' | 'apple' | 'minimal' | 'glass'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeName>('tech')

  // 可用的主题列表
  const themes = [
    { id: 'tech', name: '科技暗调', description: '深蓝灰底色 + 科技蓝强调' },
    { id: 'apple', name: '苹果风格', description: '白色背景 + 大圆角卡片' },
    { id: 'minimal', name: '极简黑白', description: '纯黑底 + 白色线条' },
    { id: 'glass', name: '玻璃拟态', description: '半透明 + 模糊效果' }
  ]

  // 应用主题
  function applyTheme(theme: ThemeName) {
    document.documentElement.setAttribute('data-theme', theme)
    currentTheme.value = theme
    saveTheme(theme)
  }

  // 加载主题
  function loadTheme() {
    const saved = localStorage.getItem('justfile-theme') as ThemeName
    if (saved && themes.some(t => t.id === saved)) {
      applyTheme(saved)
    } else {
      applyTheme('apple')  // 默认苹果风格
    }
  }

  // 保存主题
  function saveTheme(theme: ThemeName) {
    localStorage.setItem('justfile-theme', theme)
  }

  return {
    currentTheme,
    themes,
    applyTheme,
    loadTheme
  }
})