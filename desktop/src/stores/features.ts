import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Feature {
  id: string
  name: string
  description: string
  icon: string
  route: string
  category: string
}

export const useFeaturesStore = defineStore('features', () => {
  const categories = ref([
    { id: 'image', name: '图片处理', icon: 'image' },
    { id: 'office', name: '办公处理', icon: 'document' }
  ])

  const features = ref<Feature[]>([
    {
      id: 'image-compress',
      name: '图片压缩',
      description: '智能压缩图片，保持画质',
      icon: 'compress',
      route: '/image/compress',
      category: 'image'
    },
    {
      id: 'image-upload',
      name: '图床上传',
      description: '上传图片到 GitHub 仓库',
      icon: 'upload',
      route: '/image/upload',
      category: 'image'
    },
    {
      id: 'image-split',
      name: '图片切分',
      description: '九宫格切图，自定义行列',
      icon: 'split',
      route: '/image/split',
      category: 'image'
    },
    {
      id: 'image-editor',
      name: '图片编辑',
      description: '裁剪、标注、滤镜等',
      icon: 'edit',
      route: '/image/editor',
      category: 'image'
    },
    {
      id: 'pdf-convert',
      name: 'PDF 转 Word',
      description: 'PDF 文档转换为 Word',
      icon: 'pdf',
      route: '/pdf/convert',
      category: 'office'
    },
    {
      id: 'pdf-merge',
      name: 'PDF 合并',
      description: '合并多个 PDF 文件',
      icon: 'merge',
      route: '/pdf/merge',
      category: 'office'
    }
  ])

  const getFeaturesByCategory = computed(() => {
    return (categoryId: string) => {
      return features.value.filter(f => f.category === categoryId)
    }
  })

  return {
    categories,
    features,
    getFeaturesByCategory
  }
})