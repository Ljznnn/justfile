import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

  // 图片处理
  compressImage: (filePath: string, apiKey: string) =>
    ipcRenderer.invoke('image:compress', filePath, apiKey),
  uploadImage: (filePath: string, config: { repo: string; branch: string; token: string; path: string; timestampRename: boolean; customDomain: string; allowOverwrite: boolean }) =>
    ipcRenderer.invoke('image:upload', filePath, config),

  // 文档处理
  convertPdf: (filePath: string, targetFormat: string, apiKey: string) =>
    ipcRenderer.invoke('document:convert', filePath, targetFormat, apiKey),

  // 文件操作
  selectFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('file:select', filters),
  saveFile: (defaultPath: string) =>
    ipcRenderer.invoke('file:save', defaultPath),
  selectFolder: () =>
    ipcRenderer.invoke('folder:select'),
  saveFilesToFolder: (folderPath: string, files: { name: string; data: string }[]) =>
    ipcRenderer.invoke('files:saveToFolder', folderPath, files),
  saveFileWithPath: (filePath: string, data: string) =>
    ipcRenderer.invoke('file:saveWithPath', filePath, data),

  // 设置
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, string | boolean>) =>
    ipcRenderer.invoke('settings:set', settings)
})