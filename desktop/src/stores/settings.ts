import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const floatingBallEnabled = ref(true)

  // 图片压缩配置
  const compress = reactive({
    tinifyKey: ''
  })

  // 图床上传配置
  const upload = reactive({
    githubToken: '',
    githubRepo: '',
    githubBranch: 'main',
    githubPath: 'images',
    timestampRename: true,
    customDomain: '',
    allowOverwrite: false
  })

  // PDF 配置
  const pdf = reactive({
    apiKey: ''
  })

  // 加载设置
  async function loadSettings() {
    try {
      if (!window.electronAPI?.getSettings) return
      const settings = await window.electronAPI.getSettings()
      if (settings) {
        // 悬浮球设置
        if (settings.floatingBallEnabled !== undefined) {
          floatingBallEnabled.value = settings.floatingBallEnabled
        }
        // 图片压缩
        if (settings.compress) {
          compress.tinifyKey = settings.compress.tinifyKey || ''
        }
        // 图床上传
        if (settings.upload) {
          upload.githubToken = settings.upload.githubToken || ''
          upload.githubRepo = settings.upload.githubRepo || ''
          upload.githubBranch = settings.upload.githubBranch || 'main'
          upload.githubPath = settings.upload.githubPath || 'images'
          upload.timestampRename = settings.upload.timestampRename !== false
          upload.customDomain = settings.upload.customDomain || ''
          upload.allowOverwrite = settings.upload.allowOverwrite === true
        }
        // PDF
        if (settings.pdf) {
          pdf.apiKey = settings.pdf.apiKey || ''
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  // 保存全部设置
  async function saveSettings() {
    try {
      if (!window.electronAPI?.setSettings) return
      await window.electronAPI.setSettings({
        floatingBallEnabled: floatingBallEnabled.value,
        compress: {
          tinifyKey: compress.tinifyKey
        },
        upload: {
          githubToken: upload.githubToken,
          githubRepo: upload.githubRepo,
          githubBranch: upload.githubBranch,
          githubPath: upload.githubPath,
          timestampRename: upload.timestampRename,
          customDomain: upload.customDomain,
          allowOverwrite: upload.allowOverwrite
        },
        pdf: {
          apiKey: pdf.apiKey
        }
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  return {
    floatingBallEnabled,
    compress,
    upload,
    pdf,
    loadSettings,
    saveSettings
  }
})