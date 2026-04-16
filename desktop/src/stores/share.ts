import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shareApi, getFingerprint } from '@/api/share'
import type { Share, ShareInfo, SharedFile, CreateShareRequest, JoinShareRequest, UploadProgress } from '@/types/share'

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
  const isCreator = computed(() => _isCreator.value)

  const canUpload = computed(() => {
    if (!currentShare.value) return false
    // 创建者始终可上传，其他成员根据分享模式判断
    return _isCreator.value || currentShare.value.shareMode === 1
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
    // 通过检查成员列表判断是否为创建者
    // 创建者的 role 为 1，但需要知道哪个成员是当前用户
    // 由于后端不返回 fingerprint，我们通过创建者指纹比对
    _isCreator.value = false // 默认非创建者，创建分享时会设置为 true
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
    canUpload,
    createShare,
    getShareInfo,
    joinShare,
    loadFiles,
    deleteFile,
    addUpload,
    updateUpload,
    removeUpload,
    reset,
    setIsCreator
  }
})