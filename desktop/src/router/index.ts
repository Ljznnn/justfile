import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue')
    },
    {
      path: '/image/compress',
      name: 'ImageCompress',
      component: () => import('@/views/ImageCompress.vue')
    },
    {
      path: '/image/upload',
      name: 'ImageUpload',
      component: () => import('@/views/ImageUpload.vue')
    },
    {
      path: '/image/split',
      name: 'ImageSplit',
      component: () => import('@/views/ImageSplit.vue')
    },
    {
      path: '/image/editor',
      name: 'ImageEditor',
      component: () => import('@/views/ImageEditor.vue')
    },
    {
      path: '/pdf/editor',
      name: 'PdfEditor',
      component: () => import('@/views/PdfEditor.vue')
    },
    {
      path: '/share',
      name: 'FileShare',
      component: () => import('@/views/FileShare.vue')
    },
    {
      path: '/share/:code',
      name: 'ShareDetail',
      component: () => import('@/views/ShareDetail.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue')
    }
  ]
})

export default router