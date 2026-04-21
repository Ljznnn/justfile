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
let collapsedPosition: { x: number; y: number } | null = null  // 记录收缩时的位置

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
    console.log('[FloatingBall] Window already exists')
    return floatingWindow
  }

  console.log('[FloatingBall] Creating window...')

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
    console.log('[FloatingBall] Loading dev server: http://localhost:5173/floating-ball.html')
    floatingWindow.loadURL('http://localhost:5173/floating-ball.html')
      .then(() => console.log('[FloatingBall] Page loaded successfully'))
      .catch(err => console.error('[FloatingBall] Page load failed:', err))
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
  // 接收悬浮球的日志并输出到主进程控制台和主窗口DevTools
  ipcMain.on('floating:log', (_, args) => {
    console.log('[FloatingBall]', ...args)
    // 发送到主窗口的DevTools控制台
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('floating:logToMain', args)
    }
  })
  
  console.log('[FloatingBall] IPC 处理器已注册')
  
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
      console.log(`[FloatingBall] Detected abnormal size ${currentWidth}x${currentHeight}, forcing to ${FLOATING_CONFIG.windowWidth}x${FLOATING_CONFIG.windowHeight}`)
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
    console.log(`[FloatingBall] Drag: target (${x}, ${y}), clamped (${clampedX}, ${clampedY}), window ${windowWidth}x${windowHeight}`)

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

  // 展开悬浮球（智能计算位置）
  ipcMain.handle('floating:expand', () => {
    if (!floatingWindow) return { success: false }

    const [currentX, currentY] = floatingWindow.getPosition()
    const display = screen.getDisplayNearestPoint({ x: currentX, y: currentY })
    const { x: screenX, y: screenY, width: screenWidth, height: screenHeight } = display.workArea

    // 保存收缩时的位置，用于收缩时恢复
    collapsedPosition = { x: currentX, y: currentY }

    // 展开面板尺寸
    const expandedWidth = FLOATING_CONFIG.expandedWidth
    const expandedHeight = FLOATING_CONFIG.expandedHeight

    // 圆形按钮尺寸
    const ballSize = FLOATING_CONFIG.ballSize

    // 计算各方向可用空间
    const spaceRight = (screenX + screenWidth) - (currentX + ballSize)
    const spaceLeft = currentX - screenX
    const spaceBottom = (screenY + screenHeight) - (currentY + ballSize)
    const spaceTop = currentY - screenY

    // 计算展开后的窗口位置
    let newX = currentX
    let newY = currentY
    type ExpandDirection = 'bottom-right' | 'top-left' | 'top-right' | 'bottom-left'
    let direction: ExpandDirection = 'bottom-right'

    // 优先右下展开
    if (spaceRight >= expandedWidth - ballSize && spaceBottom >= expandedHeight - ballSize) {
      // 右下展开：窗口位置不变
      newX = currentX
      newY = currentY
      direction = 'bottom-right'
    }
    // 左上展开
    else if (spaceLeft >= expandedWidth - ballSize && spaceTop >= expandedHeight - ballSize) {
      // 左上展开：窗口向左上方扩展
      newX = currentX + ballSize - expandedWidth
      newY = currentY + ballSize - expandedHeight
      direction = 'top-left'
    }
    // 右上展开
    else if (spaceRight >= expandedWidth - ballSize && spaceTop >= expandedHeight - ballSize) {
      // 右上展开：窗口向右上方扩展
      newX = currentX
      newY = currentY + ballSize - expandedHeight
      direction = 'top-right'
    }
    // 左下展开
    else if (spaceLeft >= expandedWidth - ballSize && spaceBottom >= expandedHeight - ballSize) {
      // 左下展开：窗口向左下方扩展
      newX = currentX + ballSize - expandedWidth
      newY = currentY
      direction = 'bottom-left'
    }
    // 所有方向都不够，选择空间最大的方向
    else {
      const totalSpace: Record<ExpandDirection, number> = {
        'bottom-right': spaceRight + spaceBottom,
        'top-left': spaceLeft + spaceTop,
        'top-right': spaceRight + spaceTop,
        'bottom-left': spaceLeft + spaceBottom
      }

      const bestDirection = Object.entries(totalSpace)
        .sort(([, a], [, b]) => b - a)[0][0] as ExpandDirection
      direction = bestDirection

      switch (direction) {
        case 'top-left':
          newX = Math.max(screenX, currentX + ballSize - expandedWidth)
          newY = Math.max(screenY, currentY + ballSize - expandedHeight)
          break
        case 'top-right':
          newX = Math.min(screenX + screenWidth - expandedWidth, currentX)
          newY = Math.max(screenY, currentY + ballSize - expandedHeight)
          break
        case 'bottom-left':
          newX = Math.max(screenX, currentX + ballSize - expandedWidth)
          newY = Math.min(screenY + screenHeight - expandedHeight, currentY)
          break
        default: // bottom-right
          newX = Math.min(screenX + screenWidth - expandedWidth, currentX)
          newY = Math.min(screenY + screenHeight - expandedHeight, currentY)
          break
      }
    }

    console.log(`[FloatingBall] Expand: direction=${direction}, pos=(${currentX},${currentY})->(${newX},${newY})`)

    // 使用 setBounds 同时设置位置和尺寸，确保窗口完整显示
    floatingWindow.setBounds({
      x: Math.round(newX),
      y: Math.round(newY),
      width: expandedWidth,
      height: expandedHeight
    })

    // 返回展开方向，前端用于调整内容布局
    return { success: true, direction }
  })

  // 收缩悬浮球
  ipcMain.handle('floating:collapse', () => {
    if (!floatingWindow) return false

    console.log(`[FloatingBall] Starting collapse, current size: ${floatingWindow.getSize()[0]}x${floatingWindow.getSize()[1]}`)

    // 恢复到收缩前的位置，如果没有记录则使用当前位置
    let targetX: number, targetY: number

    if (collapsedPosition) {
      targetX = collapsedPosition.x
      targetY = collapsedPosition.y
      console.log(`[FloatingBall] Restoring to saved position: (${targetX},${targetY})`)
    } else {
      // 如果没有保存的位置，使用当前位置并进行边界检测
      const [x, y] = floatingWindow.getPosition()
      const display = screen.getDisplayNearestPoint({ x, y })
      const { x: screenX, y: screenY, width: screenWidth, height: screenHeight } = display.workArea
      const ballSize = FLOATING_CONFIG.ballSize

      targetX = Math.max(screenX, Math.min(x, screenX + screenWidth - ballSize))
      targetY = Math.max(screenY, Math.min(y, screenY + screenHeight - ballSize))
      console.log(`[FloatingBall] No saved position, using boundary-adjusted: (${targetX},${targetY})`)
    }

    // 使用 setBounds 同时设置位置和尺寸
    floatingWindow.setBounds({
      x: Math.round(targetX),
      y: Math.round(targetY),
      width: FLOATING_CONFIG.windowWidth,
      height: FLOATING_CONFIG.windowHeight
    })

    // 清除保存的位置
    collapsedPosition = null

    return true
  })

  // 设置点击穿透
  ipcMain.on('floating:setIgnoreMouseEvents', (_, ignore: boolean, options?: { forward: boolean }) => {
    if (!floatingWindow) return
    floatingWindow.setIgnoreMouseEvents(ignore, options)
  })

  // 打开工具并传递文件
  ipcMain.on('floating:openTool', (_, { route, filePath }: { route: string; filePath: string }) => {
    console.log('[FloatingBall] Received floating:openTool, route:', route, 'filePath:', filePath)
    console.log('[FloatingBall] mainWindow:', mainWindow ? 'exists' : 'null')
    
    if (!mainWindow) {
      console.log('[FloatingBall] ERROR: mainWindow is null!')
      return
    }

    // 如果主窗口最小化，先恢复
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    // 激活主窗口
    mainWindow.focus()

    // 导航到目标页面并传递文件路径
    console.log('[FloatingBall] Sending main:navigate to renderer')
    mainWindow.webContents.send('main:navigate', { route, filePath })
  })

  // 打开工具并传递文件数据（ArrayBuffer）
  ipcMain.on('floating:openToolWithData', (_, { route, fileData }: { route: string; fileData: { name: string; data: number[]; type: string } }) => {
    console.log('[FloatingBall] Received floating:openToolWithData, route:', route)
    console.log('[FloatingBall] mainWindow exists:', !!mainWindow)

    if (!mainWindow) {
      console.log('[FloatingBall] ERROR: mainWindow is null!')
      return
    }

    // 如果主窗口最小化，先恢复
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    // 激活主窗口
    mainWindow.focus()

    // 导航到目标页面并传递文件数据
    console.log('[FloatingBall] Sending main:navigateWithData to main window')
    mainWindow.webContents.send('main:navigateWithData', { route, fileData })
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
