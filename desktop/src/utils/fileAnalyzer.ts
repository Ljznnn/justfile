import type { Feature } from '@/stores/features'

/**
 * 文件类型分析工具
 * 根据文件扩展名识别类型并返回可用工具列表
 */

/**
 * 文件类型定义
 */
export interface FileInfo {
  /** 文件名 */
  name: string
  /** 文件路径 */
  path: string
  /** 文件扩展名（包含点，如 .jpg） */
  extension: string
  /** 文件大小（字节） */
  size: number
  /** 文件类型分类 */
  type: 'image' | 'pdf' | 'other'
  /** MIME 类型 */
  mimeType: string
}

/**
 * 扩展名到 MIME 类型的映射
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed'
}

/**
 * 图片扩展名列表
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

/**
 * 根据文件路径解析文件信息
 * @param filePath 文件路径
 * @param fileSize 文件大小（可选）
 */
export function analyzeFile(filePath: string, fileSize?: number): FileInfo {
  // 提取文件名
  const name = filePath.split(/[/\\]/).pop() || ''

  // 提取扩展名
  const lastDotIndex = name.lastIndexOf('.')
  const extension = lastDotIndex !== -1 ? name.substring(lastDotIndex).toLowerCase() : ''

  // 判断文件类型
  let type: 'image' | 'pdf' | 'other' = 'other'
  if (IMAGE_EXTENSIONS.includes(extension)) {
    type = 'image'
  } else if (extension === '.pdf') {
    type = 'pdf'
  }

  // 获取 MIME 类型
  const mimeType = EXTENSION_TO_MIME[extension] || 'application/octet-stream'

  return {
    name,
    path: filePath,
    extension,
    size: fileSize || 0,
    type,
    mimeType
  }
}

/**
 * 根据文件信息获取可用工具列表
 * @param fileInfo 文件信息
 * @param features 所有功能列表
 */
export function getAvailableTools(fileInfo: FileInfo, features: Feature[]): Feature[] {
  return features.filter(feature => {
    // 接受任意文件的工具始终可用
    if (feature.acceptAnyFile) return true
    // 检查扩展名匹配
    return feature.supportedExtensions?.includes(fileInfo.extension)
  })
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/**
 * 获取文件类型显示名称
 * @param fileInfo 文件信息
 */
export function getFileTypeLabel(fileInfo: FileInfo): string {
  switch (fileInfo.type) {
    case 'image':
      return '图片'
    case 'pdf':
      return 'PDF'
    default:
      return '文件'
  }
}
