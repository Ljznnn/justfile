import axios from 'axios'
import type { Share, ShareInfo, SharedFile, CreateShareRequest, JoinShareRequest } from '@/types/share'

const API_BASE = 'http://localhost:8080/justfile/api'

// Get or generate fingerprint
function getFingerprint(): string {
  let fingerprint = localStorage.getItem('jf_fingerprint')
  if (!fingerprint) {
    fingerprint = generateUUID()
    localStorage.setItem('jf_fingerprint', fingerprint)
  }
  return fingerprint
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'X-Fingerprint': getFingerprint()
  }
})

// Update fingerprint header on each request
api.interceptors.request.use(config => {
  config.headers['X-Fingerprint'] = getFingerprint()
  return config
})

export const shareApi = {
  // Share management
  async createShare(request: CreateShareRequest): Promise<Share> {
    const response = await api.post('/shares', request)
    return response.data.data
  },

  async getShareInfo(shareCode: string): Promise<ShareInfo> {
    const response = await api.get(`/shares/${shareCode}`)
    return response.data.data
  },

  async joinShare(shareCode: string, request: JoinShareRequest): Promise<Share> {
    const response = await api.post(`/shares/${shareCode}/join`, request)
    return response.data.data
  },

  async closeShare(shareCode: string): Promise<void> {
    await api.delete(`/shares/${shareCode}`)
  },

  /**
   * 更新分享名称
   * @param shareCode 分享码
   * @param shareName 新的分享名称
   */
  async updateShareName(shareCode: string, shareName: string): Promise<void> {
    await api.patch(`/shares/${shareCode}/name`, { shareName })
  },

  // Files
  async getFiles(shareId: number): Promise<SharedFile[]> {
    const response = await api.get(`/files/share/${shareId}`)
    return response.data.data
  },

  getFileDownloadUrl(fileId: number): string {
    return `${API_BASE}/files/${fileId}/download`
  },

  async deleteFile(fileId: number): Promise<void> {
    await api.delete(`/files/${fileId}`)
  }
}

export { getFingerprint }
