import { app, BrowserWindow, ipcMain, shell, nativeImage, Tray, Menu } from 'electron'
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
let tray: Tray | null = null

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

// 从设置文件中读取是否缩小到托盘
function getMinimizeToTray(): boolean {
  try {
    const settingsPath = join(app.getPath('userData'), 'settings.json')
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      const settings = JSON.parse(data)
      // 如果设置中明确为 false，则不启用
      if (settings.minimizeToTray === false) {
        return false
      }
    }
  } catch (error) {
    console.error('Failed to read minimize to tray settings:', error)
  }
  return true  // 默认启用
}

// 创建系统托盘
function createTray(): void {
  // Windows 系统托盘推荐使用 ico 格式，或者使用 32x32 的 PNG
  let trayIcon: nativeImage

  if (process.platform === 'win32') {
    // Windows 使用 ico 文件
    const icoPath = isDev
      ? join(__dirname, '../src/assets/icon.ico')
      : join(__dirname, '../renderer/assets/icon.ico')
    trayIcon = nativeImage.createFromPath(icoPath)
  } else {
    // 其他系统使用 PNG
    const iconPath = isDev
      ? join(__dirname, '../src/assets/icon.png')
      : join(__dirname, '../renderer/assets/icon.png')
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 })
  }

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindowRef) {
          if (mainWindowRef.isMinimized()) {
            mainWindowRef.restore()
          }
          mainWindowRef.show()
          mainWindowRef.focus()
        }
      }
    },
    {
      label: '显示悬浮球',
      click: () => {
        const floatingWindow = getFloatingWindow()
        if (!floatingWindow && mainWindowRef) {
          createFloatingBall(mainWindowRef)
        } else if (floatingWindow) {
          floatingWindow.show()
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        closeFloatingBall()
        app.quit()
      }
    }
  ])

  tray.setToolTip('JustFile')
  tray.setContextMenu(contextMenu)

  // 双击托盘图标显示主窗口
  tray.on('double-click', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isMinimized()) {
        mainWindowRef.restore()
      }
      mainWindowRef.show()
      mainWindowRef.focus()
    }
  })
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

// 双击悬浮球打开主窗口
ipcMain.on('floating:openMainWindow', () => {
  console.log('[FloatingBall] Open main window requested')
  if (mainWindowRef) {
    if (mainWindowRef.isMinimized()) {
      mainWindowRef.restore()
    }
    mainWindowRef.show()
    mainWindowRef.focus()
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
    // 创建托盘
    createTray()
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
    // 根据设置决定是缩小到托盘还是直接关闭
    if (getMinimizeToTray()) {
      mainWindow.hide()
    } else {
      // 关闭主窗口时同时关闭悬浮球
      closeFloatingBall()
      mainWindow.close()
    }
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

app.on('before-quit', () => {
  // 退出前清理托盘
  if (tray) {
    tray.destroy()
    tray = null
  }
})