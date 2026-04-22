import { app, BrowserWindow, ipcMain, shell, nativeImage } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/index'
import { registerImageIpcHandlers } from './ipc/image'
import { registerDocumentIpcHandlers } from './ipc/document'
import { createFloatingBall, closeFloatingBall, getFloatingWindow } from './floatingBall'
import fs from 'fs'

const isDev = !app.isPackaged

// Windows 平台透明窗口需要特殊配置
if (process.platform === 'win32') {
  // 禁用硬件加速可以解决透明窗口问题
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('enable-transparent-visuals')
  app.commandLine.appendSwitch('disable-gpu')
}

registerIpcHandlers()
registerImageIpcHandlers()
registerDocumentIpcHandlers()

// 悬浮球窗口变量引用
let mainWindowRef: BrowserWindow | null = null

// 从设置文件中读取悬浮球配置
function getFloatingBallEnabled(): boolean {
  try {
    const settingsPath = join(app.getPath('userData'), 'settings.json')
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      const settings = JSON.parse(data)
      // 如果设置中明确为 false，则不启用
      if (settings.floatingBallEnabled === false) {
        return false
      }
    }
  } catch (error) {
    console.error('Failed to read floating ball settings:', error)
  }
  return true  // 默认启用
}

// 切换悬浮球显示/隐藏（即使悬浮球未创建也能调用）
ipcMain.handle('floating:toggle', () => {
  const floatingWindow = getFloatingWindow()
  if (!floatingWindow) {
    // 悬浮球未创建，尝试创建它
    if (mainWindowRef) {
      createFloatingBall(mainWindowRef)
      return true
    }
    return false
  }
  
  if (floatingWindow.isVisible()) {
    floatingWindow.hide()
    return false
  } else {
    floatingWindow.show()
    return true
  }
})

function createWindow(): void {
  // 加载应用图标
  const iconPath = isDev
    ? join(__dirname, '../src/assets/icon.png')
    : join(__dirname, '../renderer/assets/icon.png')
  const appIcon = nativeImage.createFromPath(iconPath)

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#ffffff',
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindowRef = mainWindow

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // 创建悬浮球（根据设置决定是否启用）
    if (getFloatingBallEnabled()) {
      createFloatingBall(mainWindow)
    }
  })

  // 让外部链接在默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window:close', () => {
    // 关闭主窗口时同时关闭悬浮球
    closeFloatingBall()
    mainWindow.close()
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})