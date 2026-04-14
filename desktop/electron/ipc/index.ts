import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'

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

  ipcMain.handle('settings:get', async () => ({}))
  ipcMain.handle('settings:set', async (_, settings) => {
    console.log('Settings saved:', settings)
    return true
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