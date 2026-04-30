import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Feature {
  id: string
  name: string
  description: string
  icon: string
  route: string
  category: string
  /** 支持的文件扩展名列表 */
  supportedExtensions?: string[]
  /** 是否接受任意文件类型 */
  acceptAnyFile?: boolean
}

export const useFeaturesStore = defineStore('features', () => {
  const categories = ref([
    { id: 'share', name: '文件共享', icon: 'share' },
    { id: 'image', name: '图片处理', icon: 'image' },
    { id: 'office', name: '办公处理', icon: 'document' }
  ])

  const features = ref<Feature[]>([
    {
      id: 'file-share',
      name: '文件共享',
      description: '创建或加入共享，安全传输文件',
      icon: 'share',
      route: '/share',
      category: 'share',
      acceptAnyFile: true  // 支持所有文件类型
    },
    {
      id: 'image-compress',
      name: '图片压缩',
      description: '智能压缩图片，保持画质',
      icon: 'compress',
      route: '/image/compress',
      category: 'image',
      supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    },
    {
      id: 'image-upload',
      name: '图床上传',
      description: '上传图片到 GitHub 仓库',
      icon: 'upload',
      route: '/image/upload',
      category: 'image',
      supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    },
    {
      id: 'image-split',
      name: '图片切分',
      description: '九宫格切图，自定义行列',
      icon: 'split',
      route: '/image/split',
      category: 'image',
      supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    },
    {
      id: 'image-editor',
      name: '图片编辑',
      description: '裁剪、标注、滤镜等',
      icon: 'edit',
      route: '/image/editor',
      category: 'image',
      supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    },
    {
      id: 'pdf-editor',
      name: 'PDF 编辑',
      description: '页面排序、删除、旋转',
      icon: 'edit',
      route: '/pdf/editor',
      category: 'office',
      supportedExtensions: ['.pdf']
    },
    {
      id: 'line-chart',
      name: '曲线图',
      description: '导入表格数据生成曲线图',
      icon: 'chart',
      route: '/chart/line',
      category: 'office',
      supportedExtensions: ['.xls', '.xlsx', '.csv']
    }
  ])

  const getFeaturesByCategory = computed(() => {
    return (categoryId: string) => {
      return features.value.filter(f => f.category === categoryId)
    }
  })

  /**
   * 根据文件扩展名获取可用的工具列表
   * @param extension 文件扩展名（包含点，如 .jpg）
   */
  const getFeaturesByExtension = computed(() => {
    return (extension: string) => {
      const ext = extension.toLowerCase()
      return features.value.filter(f => {
        // 接受任意文件的工具始终返回
        if (f.acceptAnyFile) return true
        // 检查扩展名匹配
        return f.supportedExtensions?.includes(ext)
      })
    }
  })

  return {
    categories,
    features,
    getFeaturesByCategory,
    getFeaturesByExtension
  }
})
