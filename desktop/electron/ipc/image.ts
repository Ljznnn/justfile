import { ipcMain } from 'electron'
import axios from 'axios'
import path from 'path'
import fs from 'fs'

export function registerImageIpcHandlers() {
  ipcMain.handle('image:compress', async (_, filePath: string, apiKey: string) => {
    try {
      const stats = fs.statSync(filePath)
      const originalSize = stats.size
      const fileBuffer = fs.readFileSync(filePath)

      const response = await axios.post('https://api.tinify.com/shrink', fileBuffer, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          'Content-Type': 'application/octet-stream'
        }
      })

      const compressedUrl = response.data.output.url
      const compressedResponse = await axios.get(compressedUrl, { responseType: 'arraybuffer' })

      const compressedSize = compressedResponse.data.length
      const savedBytes = originalSize - compressedSize
      const savedPercent = Math.round((savedBytes / originalSize) * 100)

      const outputPath = path.join(
        path.dirname(filePath),
        `compressed_${path.basename(filePath, path.extname(filePath))}.png`
      )
      fs.writeFileSync(outputPath, Buffer.from(compressedResponse.data))

      return {
        success: true,
        originalSize,
        compressedSize,
        savedBytes,
        savedPercent,
        outputPath
      }
    } catch (error: unknown) {
      const err = error as Error
      return { success: false, error: err.message || 'Compression failed' }
    }
  })

  ipcMain.handle('image:upload', async (_, filePath: string, config: { repo: string; branch: string; token: string; path: string; timestampRename: boolean; customDomain: string; allowOverwrite: boolean }) => {
    try {
      const originalName = path.basename(filePath)
      const ext = path.extname(originalName)
      const fileBuffer = fs.readFileSync(filePath)
      const base64Content = fileBuffer.toString('base64')

      // 根据配置决定文件名
      let fileName: string
      if (config.timestampRename) {
        const now = new Date()
        const timestamp = now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0') +
          String(now.getMilliseconds()).padStart(3, '0')
        fileName = timestamp + ext
      } else {
        fileName = originalName
      }

      const uploadPath = config.path ? `${config.path}/${fileName}` : fileName
      const apiUrl = `https://api.github.com/repos/${config.repo}/contents/${uploadPath}`
      const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }

      // 检查文件是否已存在
      let sha: string | undefined
      try {
        const checkRes = await axios.get(`${apiUrl}?ref=${config.branch || 'main'}`, { headers })
        sha = checkRes.data.sha
      } catch {
        // 文件不存在，忽略
      }

      // 文件已存在且不允许覆盖
      if (sha && !config.allowOverwrite) {
        return { success: false, error: '文件已存在，请开启"允许覆盖"或修改文件名' }
      }

      // 上传或更新文件
      const payload: Record<string, any> = {
        message: 'Upload by JustFile',
        content: base64Content,
        branch: config.branch || 'main'
      }
      if (sha) {
        payload.sha = sha
      }

      await axios.put(apiUrl, payload, { headers })

      // 生成返回 URL
      let imageUrl: string
      if (config.customDomain) {
        const domain = config.customDomain.replace(/\/$/, '')
        imageUrl = `${domain}/${uploadPath}`
      } else {
        imageUrl = `https://raw.githubusercontent.com/${config.repo}/${config.branch || 'main'}/${uploadPath}`
      }

      return { success: true, url: imageUrl }
    } catch (error: unknown) {
      const err = error as Error
      return { success: false, error: err.message || 'Upload failed' }
    }
  })
}