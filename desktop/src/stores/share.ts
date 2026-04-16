import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shareApi, getFingerprint } from '@/api/share'
import type { Share, ShareInfo, SharedFile, CreateShareRequest, JoinShareRequest, UploadProgress } from '@/types/share'
import { SHARE_STATUS } from '@/types/share'

export const useShareStore = defineStore('share', () => {
  // State
  const currentShare = ref<Share | null>(null)
  const shareInfo = ref<ShareInfo | null>(null)
  const files = ref<SharedFile[]>([])
  const uploads = ref<UploadProgress[]>([])
  const fingerprint = ref<string>(getFingerprint())

  /**
   * 当前用户是否为分享创建者
   * 在创建/加入分享时设置
   */
  const _isCreator = ref<boolean>(false)

  // Computed
  const isCreator = computed(() => {
    // 优先使用 currentShare 中的 creator 字段
    if (currentShare.value?.creator !== undefined) {
      return currentShare.value.creator
    }
    return _isCreator.value
  })

  /**
   * 分享是否已过期
   */
  const isExpired = computed(() => {
    return currentShare.value?.status === SHARE_STATUS.EXPIRED
  })

  /**
   * 分享是否已关闭
   */
  const isClosed = computed(() => {
    return currentShare.value?.status === SHARE_STATUS.CLOSED
  })

  /**
   * 分享是否活跃（未过期且未关闭）
   */
  const isActive = computed(() => {
    return currentShare.value?.status === SHARE_STATUS.ACTIVE
  })

  const canUpload = computed(() => {
    if (!currentShare.value) return false
    // 已过期或已关闭不允许上传
    if (isExpired.value || isClosed.value) return false
    // 创建者始终可上传，其他成员根据分享模式判断
    return isCreator.value || currentShare.value.shareMode === 1
  })

  /**
   * 是否可以下载文件
   * 已过期或已关闭不允许下载
   */
  const canDownload = computed(() => {
    return isActive.value
  })

  // Actions
  async function createShare(request: CreateShareRequest) {
    currentShare.value = await shareApi.createShare(request)
    shareInfo.value = null
    files.value = []
    uploads.value = []
    _isCreator.value = true // 创建者
    return currentShare.value
  }

  async function getShareInfo(shareCode: string) {
    shareInfo.value = await shareApi.getShareInfo(shareCode)
    return shareInfo.value
  }

  async function joinShare(shareCode: string, request: JoinShareRequest) {
    currentShare.value = await shareApi.joinShare(shareCode, request)
    await loadFiles()
    // 从后端返回的 creator 字段判断
    _isCreator.value = currentShare.value.creator || false
    return currentShare.value
  }

  async function loadFiles() {
    if (!currentShare.value) return
    files.value = await shareApi.getFiles(currentShare.value.shareId)
  }

  async function deleteFile(fileId: number) {
    await shareApi.deleteFile(fileId)
    await loadFiles()
  }

  async function closeShare(shareCode: string) {
    await shareApi.closeShare(shareCode)
    reset()
  }

  function addUpload(upload: UploadProgress) {
    uploads.value.push(upload)
  }

  function updateUpload(index: number, update: Partial<UploadProgress>) {
    if (uploads.value[index]) {
      Object.assign(uploads.value[index], update)
    }
  }

  function removeUpload(index: number) {
    uploads.value.splice(index, 1)
  }

  function reset() {
    currentShare.value = null
    shareInfo.value = null
    files.value = []
    uploads.value = []
    _isCreator.value = false
  }

  /**
   * 设置当前用户是否为创建者
   * 用于从历史记录进入分享时恢复状态
   * @param value 是否为创建者
   */
  function setIsCreator(value: boolean) {
    _isCreator.value = value
  }

  return {
    currentShare,
    shareInfo,
    files,
    uploads,
    fingerprint,
    isCreator,
    isExpired,
    isClosed,
    isActive,
    canUpload,
    canDownload,
    createShare,
    getShareInfo,
    joinShare,
    loadFiles,
    deleteFile,
    closeShare,
    addUpload,
    updateUpload,
    removeUpload,
    reset,
    setIsCreator
  }
})