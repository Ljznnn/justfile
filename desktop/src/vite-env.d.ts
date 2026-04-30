/// <reference types="vite/client" />

// tus-js-client 类型声明
declare module 'tus-js-client' {
  interface UploadOptions {
    endpoint: string
    uploadUrl?: string
    metadata?: Record<string, string>
    headers?: Record<string, string>
    chunkSize?: number
    retryDelays?: number[]
    onError?: (error: Error) => void
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void
    onSuccess?: () => void
    onBeforeRequest?: (req: any) => void
    onShouldRetry?: (err: Error, retryCount: number, options: UploadOptions) => boolean
  }

  class Upload {
    constructor(file: File, options: UploadOptions)
    start(): void
    abort(): void
    findPreviousUploads(): Promise<PreviousUpload[]>
    resumeFromPreviousUpload(upload: PreviousUpload): void
    options: UploadOptions
  }

  interface PreviousUpload {
    url: string
    metadata: Record<string, string>
    creationTime: string
    size: number
  }

  export { Upload, UploadOptions, PreviousUpload }
}

// browser-image-compression 类型声明
declare module 'browser-image-compression' {
  interface Options {
    maxSizeMB?: number
    maxWidthOrHeight?: number
    useWebWorker?: boolean
    initialQuality?: number
    alwaysKeepResolution?: boolean
    onProgress?: (progress: number) => void
    fileType?: string
  }

  function imageCompression(file: File, options: Options): Promise<File>
  export default imageCompression
}

// tui-image-editor 类型声明
declare module 'tui-image-editor' {
  interface ImageEditorOptions {
    includeUI?: {
      loadImage: {
        path: string
        name: string
      }
      menu?: string[]
      initMenu?: string
      menuBarPosition?: string
      locale?: Record<string, string>
      theme?: Record<string, string>
    }
    cssMaxWidth?: number
    cssMaxHeight?: number
  }

  class ImageEditor {
    constructor(container: HTMLElement, options: ImageEditorOptions)
    toDataURL(): string
    loadImageFromURL(url: string, name: string): Promise<void>
    destroy(): void
  }

  export default ImageEditor
}

interface UploadConfig {
  repo: string
  branch: string
  token: string
  path: string
  timestampRename: boolean
  customDomain: string
  allowOverwrite: boolean
}

interface FileFilter {
  name: string
  extensions: string[]
}

interface Settings {
  compress?: {
    tinifyKey?: string
  }
  upload?: {
    githubToken?: string
    githubRepo?: string
    githubBranch?: string
    githubPath?: string
    timestampRename?: boolean
    customDomain?: string
    allowOverwrite?: boolean
  }
  pdf?: {
    apiKey?: string
  }
  theme?: {
    current?: string
  }
}

interface CompressionResult {
  success: boolean
  originalSize?: number
  compressedSize?: number
  savedBytes?: number
  savedPercent?: number
  outputPath?: string
  error?: string
}

interface UploadResult {
  success: boolean
  url?: string
  sha?: string
  error?: string
}

interface ConvertResult {
  success: boolean
  outputPath?: string
  downloadUrl?: string
  error?: string
}

interface ElectronAPI {
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void
  compressImage: (filePath: string, apiKey: string) => Promise<CompressionResult>
  uploadImage: (filePath: string, config: UploadConfig) => Promise<UploadResult>
  uploadImageFromData: (fileName: string, base64Data: string, config: UploadConfig) => Promise<UploadResult>
  convertPdf: (filePath: string, targetFormat: string, apiKey: string) => Promise<ConvertResult>
  selectFile: (filters: FileFilter[]) => Promise<string[]>
  saveFile: (defaultPath: string) => Promise<string>
  selectFolder: () => Promise<string | null>
  saveFilesToFolder: (folderPath: string, files: { name: string; data: string }[]) => Promise<boolean>
  saveFileWithPath: (filePath: string, data: string) => Promise<boolean>
  readFileAsArrayBuffer: (filePath: string) => Promise<any>
  getSettings: () => Promise<Settings>
  setSettings: (settings: Record<string, string | boolean>) => Promise<void>
  // 悬浮球相关 API
  floatingGetPosition: () => Promise<{ x: number; y: number } | null>
  floatingSetPosition: (x: number, y: number) => Promise<boolean>
  floatingSavePosition: (x: number, y: number) => Promise<boolean>
  floatingExpand: () => Promise<{ success: boolean; direction?: 'bottom-right' | 'top-left' | 'top-right' | 'bottom-left' }>
  floatingCollapse: () => Promise<boolean>
  floatingToggle: () => Promise<boolean>
  floatingSetIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void
  floatingGetScreenBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
  getScreenInfo: () => Promise<{ x: number; y: number; width: number; height: number }>
  log: (...args: any[]) => void
  openToolWithFile: (route: string, filePath: string) => void
  openToolWithFileData: (route: string, fileData: { name: string; data: ArrayBuffer; type: string }) => void
  onMainNavigate: (callback: (data: { route: string; filePath: string }) => void) => void
  removeMainNavigateListener: () => void
  onMainNavigateWithData: (callback: (data: { route: string; fileData: { name: string; data: ArrayBuffer; type: string } }) => void) => void
  removeMainNavigateWithDataListener: () => void
  onFloatingLog: (callback: (args: any[]) => void) => void
  removeFloatingLogListener: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}

// x-data-spreadsheet 类型声明
declare module 'x-data-spreadsheet' {
  interface SpreadsheetOptions {
    showToolbar?: boolean
    showBottomBar?: boolean
    view?: {
      height: () => number
      width: () => number
    }
  }

  interface SpreadsheetData {
    styles?: any[]
    rows?: any
  }

  interface SpreadsheetChangeData {
    rows: any
  }

  class Spreadsheet {
    constructor(selector: string, options?: SpreadsheetOptions)
    static locale(lang: string, messages: any): void
    loadData(data: SpreadsheetData): Spreadsheet
    change(callback: (data: SpreadsheetChangeData) => void): Spreadsheet
    validate(): Spreadsheet
  }

  export default Spreadsheet
}