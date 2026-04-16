// Share types
export interface Share {
  shareId: number
  shareCode: string
  shareName: string | null
  shareMode: number
  expiresAt: string | null
  createdAt: string
  members: Member[]
}

export interface Member {
  id: number
  memberName: string
  role: number
  joinedAt: string
}

export interface ShareInfo {
  shareCode: string
  shareName: string | null
  shareMode: number
  hasPassword: boolean
  expiresAt: string | null
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
  createdAt: string
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
