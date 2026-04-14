<script setup lang="ts">
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import 'tui-image-editor/dist/tui-image-editor.css'
import ImageEditor from 'tui-image-editor'

// 中文菜单
const locale_zh = {
  ZoomIn: '放大',
  ZoomOut: '缩小',
  Hand: '手掌',
  History: '历史',
  Resize: '调整宽高',
  Crop: '裁剪',
  DeleteAll: '全部删除',
  Delete: '删除',
  Undo: '撤销',
  Redo: '反撤销',
  Reset: '重置',
  Flip: '镜像',
  Rotate: '旋转',
  Draw: '画笔',
  Shape: '形状标注',
  Icon: '图标标注',
  Text: '文字标注',
  Mask: '遮罩',
  Filter: '滤镜',
  Bold: '加粗',
  Italic: '斜体',
  Underline: '下划线',
  Left: '左对齐',
  Center: '居中',
  Right: '右对齐',
  Color: '颜色',
  'Text size': '字体大小',
  Custom: '自定义',
  Square: '正方形',
  Apply: '应用',
  Cancel: '取消',
  'Flip X': 'X 轴',
  'Flip Y': 'Y 轴',
  Range: '区间',
  Stroke: '描边',
  Fill: '填充',
  Circle: '圆',
  Triangle: '三角',
  Rectangle: '矩形',
  Free: '曲线',
  Straight: '直线',
  Arrow: '箭头',
  'Arrow-2': '箭头2',
  'Arrow-3': '箭头3',
  'Star-1': '星星1',
  'Star-2': '星星2',
  Polygon: '多边形',
  Location: '定位',
  Heart: '心形',
  Bubble: '气泡',
  'Custom icon': '自定义图标',
  'Load Mask Image': '加载蒙层图片',
  Grayscale: '灰度',
  Blur: '模糊',
  Sharpen: '锐化',
  Emboss: '浮雕',
  'Remove White': '除去白色',
  Distance: '距离',
  Brightness: '亮度',
  Noise: '噪音',
  'Color Filter': '彩色滤镜',
  Sepia: '棕色',
  Sepia2: '棕色2',
  Invert: '负片',
  Pixelate: '像素化',
  Threshold: '阈值',
  Tint: '色调',
  Multiply: '正片叠底',
  Blend: '混合色',
  Width: '宽度',
  Height: '高度',
  'Lock Aspect Ratio': '锁定宽高比例'
}

// 深色主题样式
const customTheme = {
  "common.bi.image": "",
  "common.bisize.width": "0px",
  "common.bisize.height": "0px",
  "common.backgroundImage": "none",
  "common.backgroundColor": "var(--bg-card)",
  "common.border": "1px solid var(--border-color)",

  "header.backgroundImage": "none",
  "header.backgroundColor": "var(--bg-card)",
  "header.border": "0px",

  "loadButton.backgroundColor": "var(--bg-button)",
  "loadButton.border": "1px solid var(--border-button)",
  "loadButton.color": "var(--text-primary)",
  "loadButton.fontFamily": "NotoSans, sans-serif",
  "loadButton.fontSize": "12px",
  "loadButton.display": "none",

  "downloadButton.backgroundColor": "var(--accent)",
  "downloadButton.border": "1px solid var(--accent)",
  "downloadButton.color": "var(--text-on-primary)",
  "downloadButton.fontFamily": "NotoSans, sans-serif",
  "downloadButton.fontSize": "12px",
  "downloadButton.display": "none",

  "menu.normalIcon.color": "var(--text-muted)",
  "menu.activeIcon.color": "var(--accent)",
  "menu.disabledIcon.color": "var(--border-color)",
  "menu.hoverIcon.color": "var(--text-secondary)",
  "submenu.normalIcon.color": "var(--text-muted)",
  "submenu.activeIcon.color": "var(--accent)",

  "menu.iconSize.width": "24px",
  "menu.iconSize.height": "24px",
  "submenu.iconSize.width": "32px",
  "submenu.iconSize.height": "32px",

  "submenu.backgroundColor": "var(--bg-secondary)",
  "submenu.partition.color": "var(--border-color)",

  "submenu.normalLabel.color": "var(--text-muted)",
  "submenu.normalLabel.fontWeight": "lighter",
  "submenu.activeLabel.color": "var(--text-primary)",
  "submenu.activeLabel.fontWeight": "lighter",

  "checkbox.border": "1px solid var(--border-color)",
  "checkbox.backgroundColor": "var(--bg-input)",

  "range.pointer.color": "var(--accent)",
  "range.bar.color": "var(--border-color)",
  "range.subbar.color": "var(--bg-button)",

  "range.disabledPointer.color": "var(--text-muted)",
  "range.disabledBar.color": "var(--border-color)",
  "range.disabledSubbar.color": "var(--bg-input)",

  "range.value.color": "var(--text-primary)",
  "range.value.fontWeight": "lighter",
  "range.value.fontSize": "11px",
  "range.value.border": "1px solid var(--border-color)",
  "range.value.backgroundColor": "var(--bg-input)",
  "range.title.color": "var(--text-primary)",
  "range.title.fontWeight": "lighter",

  "colorpicker.button.border": "1px solid var(--border-color)",
  "colorpicker.title.color": "var(--text-primary)",
}

const props = defineProps<{
  imgUrl: string
}>()

const emit = defineEmits<{
  (e: 'save', blob: Blob): void
}>()

const instance = ref<any>(null)
const editorContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  nextTick(() => {
    initEditor()
  })
})

watch(() => props.imgUrl, () => {
  if (instance.value && props.imgUrl) {
    instance.value.loadImageFromURL(props.imgUrl, 'image')
  }
})

onUnmounted(() => {
  if (instance.value) {
    instance.value.destroy()
  }
})

const initEditor = () => {
  if (!editorContainer.value) return

  const containerWidth = editorContainer.value.offsetWidth
  const containerHeight = editorContainer.value.offsetHeight

  instance.value = new ImageEditor(editorContainer.value, {
    includeUI: {
      loadImage: {
        path: props.imgUrl,
        name: 'image'
      },
      menu: ['resize', 'crop', 'rotate', 'draw', 'shape', 'text', 'filter'],
      initMenu: '',
      menuBarPosition: 'left',
      locale: locale_zh,
      theme: customTheme
    },
    cssMaxWidth: containerWidth - 100,
    cssMaxHeight: containerHeight - 100,
    usageStatistics: false
  })

  // 等待编辑器完全初始化后再调整样式
  setTimeout(() => {
    const mainEl = document.getElementsByClassName('tui-image-editor-main')[0] as HTMLElement
    if (mainEl) {
      mainEl.style.top = '0'
    }

    const resetBtn = document.getElementsByClassName('tie-btn-reset tui-image-editor-item help')[0] as HTMLElement
    if (resetBtn) {
      resetBtn.style.display = 'none'
    }
  }, 100)
}

const save = () => {
  if (!instance.value) return

  const base64String = instance.value.toDataURL()
  const arr = base64String.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const blob = new Blob([u8arr], { type: mime })
  emit('save', blob)
}

defineExpose({
  save
})
</script>

<template>
  <div ref="editorContainer" class="image-editor-container"></div>
</template>

<style scoped>
.image-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>