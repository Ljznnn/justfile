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
    ipcRenderer.invoke('settings:set', settings),

  // 悬浮球相关 API
  floatingGetPosition: () => ipcRenderer.invoke('floating:getPosition'),
  floatingSetPosition: (x: number, y: number) => ipcRenderer.invoke('floating:setPosition', x, y),
  floatingSavePosition: (x: number, y: number) => ipcRenderer.invoke('floating:savePosition', x, y),
  floatingExpand: () => ipcRenderer.invoke('floating:expand') as Promise<{ success: boolean; direction?: 'bottom-right' | 'top-left' | 'top-right' | 'bottom-left' }>,
  floatingCollapse: () => ipcRenderer.invoke('floating:collapse'),
  floatingToggle: () => ipcRenderer.invoke('floating:toggle'),
  floatingSetIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
    ipcRenderer.send('floating:setIgnoreMouseEvents', ignore, options),
  floatingGetScreenBounds: () => ipcRenderer.invoke('floating:getScreenBounds'),
  getScreenInfo: () => ipcRenderer.invoke('floating:getScreenInfo'),
  
  // 日志转发到主进程
  log: (...args: any[]) => ipcRenderer.send('floating:log', args),

  // 从悬浮球打开工具并传递文件
  openToolWithFile: (route: string, filePath: string) =>
    ipcRenderer.send('floating:openTool', { route, filePath }),

  // 从悬浮球打开工具并传递文件数据（ArrayBuffer）
  openToolWithFileData: (route: string, fileData: { name: string; data: ArrayBuffer; type: string }) => {
    console.log('[Preload] openToolWithFileData called, route:', route, 'fileData size:', fileData.data.byteLength)
    // ArrayBuffer 需要转为普通数组才能通过 IPC
    const arrayData = Array.from(new Uint8Array(fileData.data))
    console.log('[Preload] Sending IPC floating:openToolWithData')
    ipcRenderer.send('floating:openToolWithData', { route, fileData: { name: fileData.name, data: arrayData, type: fileData.type } })
  },

  // 获取拖放文件的完整路径
  getDroppedFilePath: (fileName: string) =>
    ipcRenderer.invoke('floating:getDroppedFilePath', fileName),

  // 接收主窗口消息（用于悬浮球）
  onMainNavigate: (callback: (data: { route: string; filePath: string }) => void) => {
    ipcRenderer.on('main:navigate', (_, data) => callback(data))
  },
  removeMainNavigateListener: () => {
    ipcRenderer.removeAllListeners('main:navigate')
  },

  // 接收主窗口传递的文件数据（用于目标页面，ArrayBuffer）
  onMainNavigateWithData: (callback: (data: { route: string; fileData: { name: string; data: ArrayBuffer; type: string } }) => void) => {
    ipcRenderer.on('main:navigateWithData', (_, data: { route: string; fileData: { name: string; data: number[]; type: string } }) => {
      // 将数组转回 ArrayBuffer
      const arrayBuffer = new Uint8Array(data.fileData.data).buffer
      callback({ route: data.route, fileData: { name: data.fileData.name, data: arrayBuffer, type: data.fileData.type } })
    })
  },
  removeMainNavigateWithDataListener: () => {
    ipcRenderer.removeAllListeners('main:navigateWithData')
  },

  // 接收悬浮球日志
  onFloatingLog: (callback: (args: any[]) => void) => {
    ipcRenderer.on('floating:logToMain', (_, args) => callback(args))
  },
  removeFloatingLogListener: () => {
    ipcRenderer.removeAllListeners('floating:logToMain')
  }
})