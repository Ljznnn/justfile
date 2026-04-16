import { ipcMain, dialog, app } from 'electron'
import fs from 'fs'
import path from 'path'

const SETTINGS_FILE = 'settings.json'

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

export function registerIpcHandlers() {
  ipcMain.handle('file:select', async (_, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    })
    return result.filePaths
  })

  ipcMain.handle('file:save', async (_, defaultPath) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultPath || 'output',
      filters: [{ name: 'All Files', extensions: ['*'] }]
    })
    return result.filePath
  })

  ipcMain.handle('folder:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.filePaths[0] || null
  })

  ipcMain.handle('files:saveToFolder', async (_, folderPath: string, files: { name: string; data: string }[]) => {
    for (const file of files) {
      const filePath = path.join(folderPath, file.name)
      const buffer = Buffer.from(file.data, 'base64')
      fs.writeFileSync(filePath, buffer)
    }
    return true
  })

  ipcMain.handle('file:saveWithPath', async (_, filePath: string, data: string) => {
    const buffer = Buffer.from(data, 'base64')
    fs.writeFileSync(filePath, buffer)
    return true
  })

  // 获取设置
  ipcMain.handle('settings:get', async () => {
    try {
      const settingsPath = getSettingsPath()
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8')
        return JSON.parse(data)
      }
      return {}
    } catch (error) {
      console.error('Failed to load settings:', error)
      return {}
    }
  })

  // 保存设置
  ipcMain.handle('settings:set', async (_, settings) => {
    try {
      const settingsPath = getSettingsPath()
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  })
}

export function getFileInfo(filePath: string) {
  const stats = fs.statSync(filePath)
  return {
    name: path.basename(filePath),
    size: stats.size,
    extension: path.extname(filePath).toLowerCase()
  }
}

export function readFileBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath)
}

export function writeFile(filePath: string, data: Buffer | string): void {
  fs.writeFileSync(filePath, data)
}