/**
 * 图片处理工具类
 */

/**
 * 图片切分选项
 */
export interface SplitOptions {
  rows: number
  cols: number
}

/**
 * 图片压缩选项
 */
export interface CompressOptions {
  maxSizeMB: number
  maxWidthOrHeight?: number
  quality?: number
}

/**
 * 裁剪选项
 */
export interface CropOptions {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 切分结果
 */
export interface SplitResult {
  blob: Blob
  url: string
  index: number
  row: number
  col: number
}

/**
 * 加载图片
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 图片切分
 * @param file 图片文件
 * @param options 切分选项
 */
export async function splitImage(
  file: File,
  options: SplitOptions
): Promise<SplitResult[]> {
  const { rows, cols } = options
  const img = await loadImage(file)

  const pieceWidth = Math.floor(img.naturalWidth / cols)
  const pieceHeight = Math.floor(img.naturalHeight / rows)
  const results: SplitResult[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const canvas = document.createElement('canvas')
      canvas.width = pieceWidth
      canvas.height = pieceHeight

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        img,
        col * pieceWidth,
        row * pieceHeight,
        pieceWidth,
        pieceHeight,
        0,
        0,
        pieceWidth,
        pieceHeight
      )

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png')
      })

      results.push({
        blob,
        url: URL.createObjectURL(blob),
        index: row * cols + col,
        row,
        col
      })
    }
  }

  return results
}

/**
 * 图片压缩（使用 Canvas）
 * @param file 图片文件
 * @param options 压缩选项
 */
export async function compressImage(
  file: File,
  options: CompressOptions
): Promise<{ blob: Blob; url: string; originalSize: number; compressedSize: number }> {
  const { maxSizeMB, maxWidthOrHeight = 1920, quality = 0.8 } = options
  const img = await loadImage(file)

  let width = img.naturalWidth
  let height = img.naturalHeight

  // 按比例缩放
  if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
    const ratio = Math.min(maxWidthOrHeight / width, maxWidthOrHeight / height)
    width = Math.floor(width * ratio)
    height = Math.floor(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)

  // 根据目标大小调整质量
  let currentQuality = quality
  let blob = await canvasToBlob(canvas, currentQuality)

  // 如果仍然太大，降低质量
  const targetSize = maxSizeMB * 1024 * 1024
  while (blob.size > targetSize && currentQuality > 0.1) {
    currentQuality -= 0.1
    blob = await canvasToBlob(canvas, currentQuality)
  }

  return {
    blob,
    url: URL.createObjectURL(blob),
    originalSize: file.size,
    compressedSize: blob.size
  }
}

/**
 * 图片裁剪
 */
export async function cropImage(
  file: File,
  options: CropOptions
): Promise<{ blob: Blob; url: string }> {
  const { x, y, width, height } = options
  const img = await loadImage(file)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, 0.9)

  return {
    blob,
    url: URL.createObjectURL(blob)
  }
}

/**
 * Canvas 转 Blob
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality)
  })
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * 下载文件
 */
export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 批量下载（打包为 ZIP）
 */
export async function downloadAsZip(
  files: { blob: Blob; name: string }[],
  zipName: string
): Promise<void> {
  // 动态导入 JSZip（需要安装）
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  files.forEach(({ blob, name }) => {
    zip.file(name, blob)
  })

  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  downloadFile(url, zipName)
  URL.revokeObjectURL(url)
}

const ImageProcessor = {
  loadImage,
  splitImage,
  compressImage,
  cropImage,
  formatFileSize,
  downloadFile,
  downloadAsZip
}

export default ImageProcessor
