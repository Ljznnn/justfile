<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import Icon from '@/components/common/Icon.vue'
import { useShareStore } from '@/stores/share'
import { shareApi } from '@/api/share'
import type { CreateShareRequest, JoinShareRequest } from '@/types/share'

const router = useRouter()
const shareStore = useShareStore()

/**
 * 生成随机昵称
 * 组合形容词和名词，生成有趣的昵称
 */
function generateRandomNickname(): string {
  const adjectives = [
    '犯困的', '摸鱼的', '发呆的', '熬夜的', '加班的', '打盹的',
    '佛系的', '社恐的', '社牛的', '内卷的', '躺平的', '摆烂的',
    '快乐的', '忧伤的', '高冷的', '呆萌的', '傲娇的', '调皮的',
    '勤劳的', '懒惰的', '机智的', '憨憨的', '聪明的', '迷糊的'
  ]
  const nouns = [
    '小乌龟', '小猫咪', '小狗狗', '小兔子', '小企鹅', '小熊猫',
    '程序员', '设计师', '产品经理', '打工人', '干饭人', '摸鱼达人',
    '小可爱', '大聪明', '小迷糊', '老司机', '萌新', '大佬',
    '咸鱼', '卷王', '社畜', '小透明', '大魔王', '小天使'
  ]
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}`
}

// Tab state
const activeTab = ref<'create' | 'join'>('create')

// Create form - 默认有效期24小时，昵称随机生成
const createForm = ref<CreateShareRequest>({
  shareName: '',
  password: '',
  shareMode: 0,
  expiresInHours: 24,
  creatorName: generateRandomNickname()
})

/**
 * 重新生成随机昵称
 */
function regenerateNickname() {
  createForm.value.creatorName = generateRandomNickname()
}

/**
 * 重新生成加入昵称
 */
function regenerateJoinNickname() {
  joinForm.value.memberName = generateRandomNickname()
}
const createLoading = ref(false)

// Join form
const joinCode = ref('')
const joinForm = ref<JoinShareRequest>({
  password: '',
  memberName: generateRandomNickname()
})
const joinLoading = ref(false)

// Expiration options for Element Plus select
const expireOptions = [
  { label: '永不过期', value: undefined as number | undefined },
  { label: '1小时', value: 1 },
  { label: '24小时', value: 24 },
  { label: '3天', value: 72 },
  { label: '7天', value: 168 }
]

// History shares stored locally
interface HistoryShare {
  shareCode: string
  shareId: number
  shareName: string | null
  isCreator: boolean
  createdAt: string
  expiresAt: string | null
  memberCount: number
  fileCount: number
}

const historyShares = ref<HistoryShare[]>([])
const showHistory = ref(false)
const refreshingHistory = ref(false)

/**
 * 从本地存储加载历史分享记录
 */
function loadHistory() {
  const stored = localStorage.getItem('jf_share_history')
  if (stored) {
    try {
      historyShares.value = JSON.parse(stored)
    } catch {
      historyShares.value = []
    }
  }
}

/**
 * 刷新历史分享记录的信息（成员数、文件数、过期时间、分享名称）
 * 在每次进入页面时调用
 */
async function refreshHistoryInfo() {
  if (historyShares.value.length === 0) return

  refreshingHistory.value = true
  const updates: Promise<void>[] = []

  for (const share of historyShares.value) {
    updates.push(
      shareApi.getShareInfo(share.shareCode)
        .then(info => {
          share.memberCount = info.memberCount
          share.fileCount = info.fileCount
          share.expiresAt = info.expiresAt
          share.shareName = info.shareName
        })
        .catch(() => {
          // 分享可能已过期或被删除，保持原数据
        })
    )
  }

  await Promise.all(updates)
  // 更新本地存储
  localStorage.setItem('jf_share_history', JSON.stringify(historyShares.value))
  refreshingHistory.value = false
}

/**
 * 保存分享到历史记录
 * @param share 分享信息
 * @param isCreator 是否为创建者
 */
function saveToHistory(share: { shareCode: string; shareId: number; shareName: string | null; expiresAt: string | null }, isCreator: boolean, memberCount: number = 1, fileCount: number = 0) {
  const existing = historyShares.value.findIndex(h => h.shareCode === share.shareCode)
  if (existing >= 0) {
    historyShares.value[existing].memberCount = memberCount
    historyShares.value[existing].fileCount = fileCount
    historyShares.value[existing].shareName = share.shareName
  } else {
    historyShares.value.unshift({
      shareCode: share.shareCode,
      shareId: share.shareId,
      shareName: share.shareName,
      isCreator,
      createdAt: new Date().toISOString(),
      expiresAt: share.expiresAt,
      memberCount,
      fileCount
    })
  }
  // 只保留最近20条
  if (historyShares.value.length > 20) {
    historyShares.value = historyShares.value.slice(0, 20)
  }
  localStorage.setItem('jf_share_history', JSON.stringify(historyShares.value))
}

/**
 * 从历史记录中移除分享
 * @param shareCode 分享码
 */
function removeFromHistory(shareCode: string) {
  historyShares.value = historyShares.value.filter(h => h.shareCode !== shareCode)
  localStorage.setItem('jf_share_history', JSON.stringify(historyShares.value))
}

/**
 * 格式化时间显示
 * @param dateStr 时间字符串
 */
function formatTime(dateStr: string | null): string {
  if (!dateStr) return '永不过期'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  if (diff < 0) return '已过期'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟后过期`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时后过期`
  return `${Math.floor(diff / 86400000)}天后过期`
}

/**
 * 创建分享
 */
async function handleCreate() {
  createLoading.value = true
  try {
    const share = await shareStore.createShare({
      ...createForm.value,
      password: createForm.value.password || undefined
    })
    saveToHistory(share, true, share.members.length, 0)
    ElMessage.success('分享创建成功，请进入分享空间上传文件')
    router.push(`/share/${share.shareCode}`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '创建失败')
  } finally {
    createLoading.value = false
  }
}

/**
 * 加入分享
 */
async function handleJoin() {
  if (!joinCode.value.trim()) {
    ElMessage.warning('请输入分享码')
    return
  }

  joinLoading.value = true
  try {
    // 先获取分享信息检查是否需要密码
    const info = await shareStore.getShareInfo(joinCode.value.trim().toUpperCase())

    if (info.hasPassword && !joinForm.value.password) {
      ElMessage.warning('该分享需要密码')
      return
    }

    const share = await shareStore.joinShare(joinCode.value.trim().toUpperCase(), {
      ...joinForm.value,
      password: joinForm.value.password || undefined
    })
    saveToHistory(share, shareStore.isCreator, share.members.length, shareStore.files.length)
    ElMessage.success('加入成功')
    router.push(`/share/${joinCode.value.trim().toUpperCase()}`)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加入失败')
  } finally {
    joinLoading.value = false
  }
}

/**
 * 打开历史分享
 * @param shareCode 分享码
 * @param isCreator 是否为创建者
 */
async function openHistoryShare(shareCode: string, isCreator: boolean) {
  shareStore.setIsCreator(isCreator)
  router.push(`/share/${shareCode}`)
}

onMounted(async () => {
  loadHistory()
  await refreshHistoryInfo()
})
</script>

<template>
  <div class="max-w-xl mx-auto">
    <!-- Back -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- Title -->
    <h1 class="text-primary font-semibold mb-4 title-line">文件共享</h1>

    <!-- History Shares - Always visible -->
    <div v-if="historyShares.length > 0" class="mb-6">
      <div
        class="theme-card p-3 cursor-pointer select-none"
        @click="showHistory = !showHistory"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name="history-line" :size="16" class="text-accent" />
            <span class="text-secondary text-sm font-medium">我的分享记录</span>
            <span class="text-xs text-muted">({{ historyShares.length }})</span>
          </div>
          <Icon :name="showHistory ? 'arrow-up-s-line' : 'arrow-down-s-line'" :size="16" class="text-muted" />
        </div>
      </div>

      <div v-show="showHistory" class="mt-2 space-y-2 max-h-64 overflow-y-auto history-list">
        <!-- 刷新中提示 -->
        <div v-if="refreshingHistory" class="flex items-center justify-center py-4">
          <div class="w-4 h-4 border border-accent border-t-transparent rounded-full animate-spin"></div>
          <span class="text-muted text-xs ml-2">刷新中...</span>
        </div>

        <!-- 历史记录列表 -->
        <div
          v-for="share in historyShares"
          :key="share.shareCode"
          class="history-card flex items-center gap-3 p-3 rounded-lg cursor-pointer"
          @click="openHistoryShare(share.shareCode, share.isCreator)"
        >
          <div class="history-icon w-8 h-8 rounded-full flex items-center justify-center" :class="share.isCreator ? 'creator' : 'member'">
            <Icon :name="share.isCreator ? 'vip-crown-line' : 'user-line'" :size="14" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-primary text-sm font-medium">{{ share.shareName || share.shareCode }}</span>
              <span v-if="share.shareName" class="text-muted text-xs font-mono">{{ share.shareCode }}</span>
            </div>
            <p class="text-muted text-xs mt-1">
              {{ share.memberCount }}人 · {{ share.fileCount }}文件 · {{ formatTime(share.expiresAt) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="history-tag text-xs px-2 py-1 rounded" :class="share.isCreator ? 'creator' : 'member'">
              {{ share.isCreator ? '我创建' : '我加入' }}
            </span>
            <button
              class="remove-btn w-6 h-6 rounded flex items-center justify-center"
              @click.stop="removeFromHistory(share.shareCode)"
              title="移除记录"
            >
              <Icon name="close-line" :size="12" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button
        class="theme-button px-4 py-2 text-sm"
        :class="{ 'bg-button-primary text-on-primary': activeTab === 'create' }"
        @click="activeTab = 'create'"
      >
        创建分享
      </button>
      <button
        class="theme-button px-4 py-2 text-sm"
        :class="{ 'bg-button-primary text-on-primary': activeTab === 'join' }"
        @click="activeTab = 'join'"
      >
        加入分享
      </button>
    </div>

    <!-- Create Form -->
    <div v-if="activeTab === 'create'" class="theme-card p-6 space-y-4">
      <div>
        <label class="block text-sm text-secondary font-medium mb-1.5">分享名称</label>
        <input
          v-model="createForm.shareName"
          type="text"
          class="theme-input w-full px-3 py-2 text-sm"
          placeholder="给这个分享起个名字吧"
          maxlength="100"
        />
      </div>

      <div>
        <label class="block text-sm text-muted mb-1.5">你的昵称</label>
        <div class="flex gap-2">
          <input
            v-model="createForm.creatorName"
            type="text"
            class="theme-input flex-1 px-3 py-2 text-sm"
            placeholder="你的昵称"
          />
          <button
            type="button"
            class="theme-button px-2 py-1 text-xs flex items-center gap-1"
            @click="regenerateNickname"
            title="换一个"
          >
            <Icon name="refresh-line" :size="14" />
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm text-muted mb-1.5">访问密码（可选）</label>
        <input
          v-model="createForm.password"
          type="password"
          class="theme-input w-full px-3 py-2 text-sm"
          placeholder="留空则无需密码"
        />
      </div>

      <div>
        <label class="block text-sm text-muted mb-1.5">上传权限</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" v-model="createForm.shareMode" :value="0" />
            <span class="text-sm text-secondary">仅创建者可上传</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" v-model="createForm.shareMode" :value="1" />
            <span class="text-sm text-secondary">所有成员可上传</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm text-muted mb-1.5">有效期</label>
        <el-select
          v-model="createForm.expiresInHours"
          placeholder="选择有效期"
          class="expire-select"
        >
          <el-option
            v-for="opt in expireOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <button
        class="theme-button-primary w-full py-2.5 text-sm font-medium"
        :disabled="createLoading"
        @click="handleCreate"
      >
        {{ createLoading ? '创建中...' : '创建分享' }}
      </button>
    </div>

    <!-- Join Form -->
    <div v-if="activeTab === 'join'" class="theme-card p-6 space-y-4">
      <div>
        <label class="block text-sm text-muted mb-1.5">分享码</label>
        <input
          v-model="joinCode"
          type="text"
          class="theme-input w-full px-3 py-2 text-sm uppercase"
          placeholder="输入6位分享码"
          maxlength="8"
        />
      </div>

      <div>
        <label class="block text-sm text-muted mb-1.5">你的昵称</label>
        <div class="flex gap-2">
          <input
            v-model="joinForm.memberName"
            type="text"
            class="theme-input flex-1 px-3 py-2 text-sm"
            placeholder="你的昵称"
          />
          <button
            type="button"
            class="theme-button px-2 py-1 text-xs flex items-center gap-1"
            @click="regenerateJoinNickname"
            title="换一个"
          >
            <Icon name="refresh-line" :size="14" />
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm text-muted mb-1.5">访问密码</label>
        <input
          v-model="joinForm.password"
          type="password"
          class="theme-input w-full px-3 py-2 text-sm"
          placeholder="如果分享需要密码"
        />
      </div>

      <button
        class="theme-button-primary w-full py-2.5 text-sm font-medium"
        :disabled="joinLoading"
        @click="handleJoin"
      >
        {{ joinLoading ? '加入中...' : '加入分享' }}
      </button>
    </div>

    <!-- Description -->
    <div class="theme-card p-4 mt-6">
      <p class="text-muted text-xs leading-relaxed">
        文件共享功能允许你创建一个临时分享空间，无需登录即可与他人共享文件。
        支持大文件分片上传，断点续传，可选密码保护和有效期设置。
      </p>
    </div>
  </div>
</template>

<style scoped>
.bg-button-primary {
  background: var(--bg-button-primary);
  color: var(--text-on-primary);
}

/* History list scroll */
.history-list {
  scrollbar-width: thin;
  scrollbar-color: var(--border-input) transparent;
}
.history-list::-webkit-scrollbar {
  width: 4px;
}
.history-list::-webkit-scrollbar-track {
  background: transparent;
}
.history-list::-webkit-scrollbar-thumb {
  background: var(--border-input);
  border-radius: 2px;
}
.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

/* History card styles */
.history-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  transition: all 0.2s ease;
}
.history-card:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.history-icon {
  background: var(--bg-input);
}
.history-icon.creator {
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.15);
}
.history-icon.member {
  color: var(--muted);
}

.history-tag {
  font-size: 10px;
}
.history-tag.creator {
  background: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}
.history-tag.member {
  background: var(--bg-input);
  color: var(--muted);
}

.remove-btn {
  color: var(--muted);
  background: transparent;
  transition: all 0.2s;
}
.remove-btn:hover {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

/* Element Plus select 样式适配 - 保持与其他输入框一致的高度 */
.expire-select {
  width: 100%;
}
.expire-select :deep(.el-input__wrapper) {
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 6px;
  box-shadow: none;
  padding: 1px 11px;
  height: 34px;
}
.expire-select :deep(.el-input__wrapper:hover) {
  border-color: var(--border-input-hover);
}
.expire-select :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent);
}
.expire-select :deep(.el-input__inner) {
  color: var(--text-primary);
  font-size: 14px;
  height: 32px;
  line-height: 32px;
}
.expire-select :deep(.el-input__suffix) {
  height: 32px;
}
.expire-select :deep(.el-input__suffix-inner) {
  height: 32px;
  display: flex;
  align-items: center;
}
</style>