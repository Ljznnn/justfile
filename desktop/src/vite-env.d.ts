/// <reference types="vite/client" />

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
}

interface FileFilter {
  name: string
  extensions: string[]
}

interface Settings {
  tinifyKey?: string
  githubToken?: string
  githubRepo?: string
  githubBranch?: string
  githubPath?: string
  pdfApiKey?: string
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
  convertPdf: (filePath: string, targetFormat: string, apiKey: string) => Promise<ConvertResult>
  selectFile: (filters: FileFilter[]) => Promise<string[]>
  saveFile: (defaultPath: string) => Promise<string>
  getSettings: () => Promise<Settings>
  setSettings: (settings: Settings) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}