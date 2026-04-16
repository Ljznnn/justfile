// 分享状态常量
export const SHARE_STATUS = {
  CLOSED: 0,   // 已关闭
  ACTIVE: 1,   // 活跃中
  EXPIRED: 2   // 已过期
} as const

// Share types
export interface Share {
  shareId: number
  shareCode: string
  shareName: string | null
  shareMode: number
  status: number  // 分享状态：0-已关闭, 1-活跃, 2-已过期
  expiresAt: number | null  // 时间戳（毫秒）
  createdAt: number         // 时间戳（毫秒）
  creator: boolean          // 当前用户是否为创建者
  members: Member[]
}

export interface Member {
  id: number
  memberName: string
  role: number
  joinedAt: number  // 时间戳（毫秒）
}

export interface ShareInfo {
  shareCode: string
  shareName: string | null
  shareMode: number
  status: number  // 分享状态：0-已关闭, 1-活跃, 2-已过期
  hasPassword: boolean
  expiresAt: number | null  // 时间戳（毫秒）
  memberCount: number
  fileCount: number
}

export interface SharedFile {
  id: number
  originalName: string
  fileSize: number
  mimeType: string
  uploaderName: string
  uploadState: number
  createdAt: number  // 时间戳（毫秒）
}

// Request types
export interface CreateShareRequest {
  shareName?: string
  password?: string
  shareMode?: number
  expiresInHours?: number
  creatorName?: string
}

export interface JoinShareRequest {
  password?: string
  memberName?: string
}

// Upload types
export interface UploadProgress {
  fileId: number | null
  filename: string
  progress: number
  uploadedBytes: number
  totalBytes: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}
