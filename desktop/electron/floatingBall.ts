import { app, BrowserWindow, screen, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

/**
 * 悬浮球窗口管理模块
 * 提供始终置顶的悬浮球，支持文件拖放和工具选择
 */

const isDev = !app.isPackaged

let floatingWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

/**
 * 悬浮球配置
 */
const FLOATING_CONFIG = {
  windowWidth: 64,        // 窗口宽度（与圆形一致）
  windowHeight: 64,       // 窗口高度（与圆形一致）
  ballSize: 64,           // 圆形尺寸
  expandedWidth: 220,     // 展开态宽度
  expandedHeight: 320,    // 展开态高度
  defaultMargin: 100,     // 默认边距
}

/**
 * 获取配置文件路径
 */
function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  const configDir = join(userDataPath, 'config')
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  return join(configDir, 'floatingBall.json')
}

/**
 * 获取悬浮球保存的位置
 */
function getSavedPosition(): { x: number; y: number } | null {
  try {
    const configPath = getConfigPath()
    if (existsSync(configPath)) {
      const data = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(data)
      return config.position || null
    }
  } catch {
    // 忽略错误
  }
  return null
}

/**
 * 保存悬浮球位置
 */
function savePosition(x: number, y: number): void {
  try {
    const configPath = getConfigPath()
    const config = { position: { x, y } }
    writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch {
    // 忽略错误
  }
}

/**
 * 创建悬浮球窗口
 * @param mainWin 主窗口引用
 */
export function createFloatingBall(mainWin: BrowserWindow): BrowserWindow | null {
  if (floatingWindow) {
    console.log('[FloatingBall] 悬浮球窗口已存在')
    return floatingWindow
  }

  console.log('[FloatingBall] 正在创建悬浮球窗口...')

  mainWindow = mainWin

  // 获取屏幕工作区尺寸
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  // 计算默认位置（右下角）
  const defaultX = screenWidth - FLOATING_CONFIG.windowWidth - FLOATING_CONFIG.defaultMargin
  const defaultY = screenHeight - FLOATING_CONFIG.windowHeight - FLOATING_CONFIG.defaultMargin

  // 尝试使用保存的位置
  const savedPos = getSavedPosition()
  const x = savedPos?.x ?? defaultX
  const y = savedPos?.y ?? defaultY

  // 加载应用图标
  const iconPath = isDev
    ? join(__dirname, '../src/assets/icon.png')
    : join(__dirname, '../renderer/assets/icon.png')
  const appIcon = nativeImage.createFromPath(iconPath)

  // 设置窗口为工具窗口类型，不在 Alt+Tab 中显示
  floatingWindow = new BrowserWindow({
    width: FLOATING_CONFIG.windowWidth,
    height: FLOATING_CONFIG.windowHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    icon: appIcon,
    // 设置为工具窗口，不会出现在任务栏和 Alt+Tab 中
    type: 'toolbar',
    // Windows 平台特定设置
    ...(process.platform === 'win32' && {
      // 设置窗口样式：工具窗口，不显示在任务栏
      autoHideMenuBar: true,
      // 启用 frameless 窗口的拖动
      movable: true,
    }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Windows 平台：设置窗口可点击（透明区域可以穿透）
  if (process.platform === 'win32') {
    floatingWindow.setIgnoreMouseEvents(false)
  }

  // 加载悬浮球页面（独立的 HTML 文件）
  if (isDev) {
    // 开发模式下使用 Vite 开发服务器
    console.log('[FloatingBall] 加载开发服务器 URL: http://localhost:5173/floating-ball.html')
    floatingWindow.loadURL('http://localhost:5173/floating-ball.html')
      .then(() => console.log('[FloatingBall] 页面加载成功'))
      .catch(err => console.error('[FloatingBall] 页面加载失败:', err))
  } else {
    floatingWindow.loadFile(join(__dirname, '../renderer/floating-ball.html'))
  }

  // 阻止悬浮球被最小化
  floatingWindow.on('minimize', (e: Electron.Event) => {
    e.preventDefault()
  })

  // 悬浮球关闭时清理引用
  floatingWindow.on('closed', () => {
    floatingWindow = null
  })

  // 注册 IPC 处理器
  registerFloatingIpc()

  return floatingWindow
}

/**
 * 注册悬浮球相关 IPC 处理器
 */
function registerFloatingIpc(): void {
  // 获取悬浮球位置
  ipcMain.handle('floating:getPosition', () => {
    if (!floatingWindow) return null
    const [x, y] = floatingWindow.getPosition()
    return { x, y }
  })

  // 设置悬浮球位置（优化版：不每次保存，由拖拽结束时保存）
  // 简化边界检测，允许跨屏幕自由移动
  ipcMain.handle('floating:setPosition', (_, x: number, y: number) => {
    if (!floatingWindow) return false

    // 检查当前窗口状态
    const [currentWidth, currentHeight] = floatingWindow.getSize()
    
    // 如果窗口尺寸异常（既不是收缩尺寸也不是展开尺寸），强制修正
    const isCollapsed = Math.abs(currentWidth - FLOATING_CONFIG.windowWidth) < 10 && 
                        Math.abs(currentHeight - FLOATING_CONFIG.windowHeight) < 10
    const isExpanded = Math.abs(currentWidth - FLOATING_CONFIG.expandedWidth) < 10 && 
                       Math.abs(currentHeight - FLOATING_CONFIG.expandedHeight) < 10
    
    // 如果既不是收缩也不是展开状态，说明被 CSS 动画干扰了，强制修正
    if (!isCollapsed && !isExpanded) {
      floatingWindow.setSize(FLOATING_CONFIG.windowWidth, FLOATING_CONFIG.windowHeight)
      console.log(`[FloatingBall] 检测到异常尺寸 ${currentWidth}x${currentHeight}，强制修正为 ${FLOATING_CONFIG.windowWidth}x${FLOATING_CONFIG.windowHeight}`)
    }

    // 获取所有显示器的总体范围
    const displays = screen.getAllDisplays()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    for (const display of displays) {
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea
      minX = Math.min(minX, dx)
      minY = Math.min(minY, dy)
      maxX = Math.max(maxX, dx + dw)
      maxY = Math.max(maxY, dy + dh)
    }
    
    // 边界检测 - 确保窗口至少有一半在屏幕范围内
    const windowWidth = isCollapsed ? FLOATING_CONFIG.windowWidth : (isExpanded ? FLOATING_CONFIG.expandedWidth : currentWidth)
    const windowHeight = isCollapsed ? FLOATING_CONFIG.windowHeight : (isExpanded ? FLOATING_CONFIG.expandedHeight : currentHeight)
    
    // 允许窗口稍微超出边界，但不完全离开所有屏幕
    const clampedX = Math.max(minX - windowWidth + 20, Math.min(x, maxX - 20))
    const clampedY = Math.max(minY - windowHeight + 20, Math.min(y, maxY - 20))

    // 调试日志
    console.log(`[FloatingBall] 拖动：目标 (${x}, ${y}), 限制后 (${clampedX}, ${clampedY}), 窗口 ${windowWidth}x${windowHeight}`)

    floatingWindow.setPosition(Math.round(clampedX), Math.round(clampedY))
    return true
  })

  // 保存悬浮球位置（拖拽结束时调用）
  ipcMain.handle('floating:savePosition', (_, x: number, y: number) => {
    if (!floatingWindow) return false

    // 获取悬浮球当前所在的显示器
    const display = screen.getDisplayNearestPoint({ x, y })
    const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = display.workArea
    const [windowWidth, windowHeight] = floatingWindow.getSize()

    // 边界检测 - 允许窗口完全在当前显示器屏幕范围内
    const clampedX = Math.max(screenX, Math.min(x, screenX + screenWidth - windowWidth))
    const clampedY = Math.max(screenY, Math.min(y, screenY + screenHeight - windowHeight))

    savePosition(clampedX, clampedY)
    return true
  })

  // 展开悬浮球
  ipcMain.handle('floating:expand', () => {
    if (!floatingWindow) return false
    
    // 立即设置为展开尺寸
    floatingWindow.setSize(FLOATING_CONFIG.expandedWidth, FLOATING_CONFIG.expandedHeight)
    
    // 延迟确认，确保尺寸正确
    setTimeout(() => {
      if (floatingWindow) {
        const [w, h] = floatingWindow.getSize()
        // 如果尺寸不对，再次强制设置
        if (Math.abs(w - FLOATING_CONFIG.expandedWidth) > 1 || Math.abs(h - FLOATING_CONFIG.expandedHeight) > 1) {
          floatingWindow.setSize(FLOATING_CONFIG.expandedWidth, FLOATING_CONFIG.expandedHeight)
          console.log(`[FloatingBall] 展开尺寸异常，强制修正为：${FLOATING_CONFIG.expandedWidth}x${FLOATING_CONFIG.expandedHeight}`)
        }
        console.log(`[FloatingBall] 展开后窗口尺寸：${w}x${h}`)
      }
    }, 50)
    
    return true
  })

  // 收缩悬浮球
  ipcMain.handle('floating:collapse', () => {
    if (!floatingWindow) return false
    
    console.log(`[FloatingBall] 开始收缩，当前尺寸：${floatingWindow.getSize()[0]}x${floatingWindow.getSize()[1]}`)
    
    // 立即强制设置为收缩尺寸
    floatingWindow.setSize(FLOATING_CONFIG.windowWidth, FLOATING_CONFIG.windowHeight)
    
    // 延迟再次确认，防止 CSS 动画干扰
    setTimeout(() => {
      if (floatingWindow) {
        floatingWindow.setSize(FLOATING_CONFIG.windowWidth, FLOATING_CONFIG.windowHeight)
        const [w, h] = floatingWindow.getSize()
        console.log(`[FloatingBall] 收缩后窗口尺寸：${w}x${h} (目标：${FLOATING_CONFIG.windowWidth}x${FLOATING_CONFIG.windowHeight})`)
      }
    }, 50)
    
    // 再次确认，确保尺寸正确
    setTimeout(() => {
      if (floatingWindow) {
        const [w, h] = floatingWindow.getSize()
        // 如果尺寸还是不对，再次强制设置
        if (Math.abs(w - FLOATING_CONFIG.windowWidth) > 1 || Math.abs(h - FLOATING_CONFIG.windowHeight) > 1) {
          floatingWindow.setSize(FLOATING_CONFIG.windowWidth, FLOATING_CONFIG.windowHeight)
          console.log(`[FloatingBall] 尺寸异常，强制修正为：${FLOATING_CONFIG.windowWidth}x${FLOATING_CONFIG.windowHeight}`)
        } else {
          console.log(`[FloatingBall] 收缩完成，尺寸正确：${w}x${h}`)
        }
      }
    }, 150)
    
    return true
  })

  // 设置点击穿透
  ipcMain.on('floating:setIgnoreMouseEvents', (_, ignore: boolean, options?: { forward: boolean }) => {
    if (!floatingWindow) return
    floatingWindow.setIgnoreMouseEvents(ignore, options)
  })

  // 打开工具并传递文件
  ipcMain.on('floating:openTool', (_, { route, filePath }: { route: string; filePath: string }) => {
    if (!mainWindow) return

    // 如果主窗口最小化，先恢复
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    // 激活主窗口
    mainWindow.focus()

    // 导航到目标页面并传递文件路径
    mainWindow.webContents.send('main:navigate', { route, filePath })
  })

  // 获取拖放文件的完整路径
  ipcMain.handle('floating:getDroppedFilePath', async () => {
    // 由于安全限制，无法直接获取拖放文件的完整路径
    // 这里返回 null，前端需要使用其他方式处理
    // 实际使用时，应该通过文件对话框选择文件而不是拖放
    return null
  })

  // 切换悬浮球显示/隐藏
  ipcMain.handle('floating:toggle', () => {
    if (!floatingWindow) return false
    if (floatingWindow.isVisible()) {
      floatingWindow.hide()
      return false
    } else {
      floatingWindow.show()
      return true
    }
  })

  // 获取屏幕尺寸（返回当前悬浮球所在显示器的尺寸）
  ipcMain.handle('floating:getScreenInfo', () => {
    if (!floatingWindow) {
      const { width, height } = screen.getPrimaryDisplay().workArea
      return { width, height, x: 0, y: 0 }
    }
    const [x, y] = floatingWindow.getPosition()
    const display = screen.getDisplayNearestPoint({ x, y })
    const { width, height, x: screenX, y: screenY } = display.workArea
    return { width, height, x: screenX, y: screenY }
  })

  // 获取屏幕边界
  ipcMain.handle('floating:getScreenBounds', () => {
    if (!floatingWindow) {
      const { x, y, width, height } = screen.getPrimaryDisplay().workArea
      return { x, y, width, height }
    }
    const [x, y] = floatingWindow.getPosition()
    const display = screen.getDisplayNearestPoint({ x, y })
    const { x: screenX, y: screenY, width, height } = display.workArea
    return { x: screenX, y: screenY, width, height }
  })
}

/**
 * 关闭悬浮球窗口
 */
export function closeFloatingBall(): void {
  if (floatingWindow) {
    floatingWindow.close()
    floatingWindow = null
  }
}

/**
 * 获取悬浮球窗口引用
 */
export function getFloatingWindow(): BrowserWindow | null {
  return floatingWindow
}
