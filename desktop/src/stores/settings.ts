import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const tinifyKey = ref('')
  const githubToken = ref('')
  const githubRepo = ref('')
  const githubBranch = ref('main')
  const githubPath = ref('images')
  const pdfApiKey = ref('')

  // 加载设置
  async function loadSettings() {
    try {
      const settings = await window.electronAPI.getSettings()
      if (settings) {
        tinifyKey.value = settings.tinifyKey || ''
        githubToken.value = settings.githubToken || ''
        githubRepo.value = settings.githubRepo || ''
        githubBranch.value = settings.githubBranch || 'main'
        githubPath.value = settings.githubPath || 'images'
        pdfApiKey.value = settings.pdfApiKey || ''
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  // 保存单个配置项
  async function saveSetting(key: string, value: string) {
    try {
      await window.electronAPI.setSettings({
        tinifyKey: tinifyKey.value,
        githubToken: githubToken.value,
        githubRepo: githubRepo.value,
        githubBranch: githubBranch.value,
        githubPath: githubPath.value,
        pdfApiKey: pdfApiKey.value,
        [key]: value
      })
    } catch (error) {
      console.error('Failed to save setting:', error)
    }
  }

  // 保存全部设置
  async function saveSettings() {
    try {
      await window.electronAPI.setSettings({
        tinifyKey: tinifyKey.value,
        githubToken: githubToken.value,
        githubRepo: githubRepo.value,
        githubBranch: githubBranch.value,
        githubPath: githubPath.value,
        pdfApiKey: pdfApiKey.value
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  return {
    tinifyKey,
    githubToken,
    githubRepo,
    githubBranch,
    githubPath,
    pdfApiKey,
    loadSettings,
    saveSetting,
    saveSettings
  }
})