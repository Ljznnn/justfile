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

  ipcMain.handle('image:upload', async (_, filePath: string, config: { repo: string; branch: string; token: string; path: string }) => {
    try {
      const fileName = path.basename(filePath)
      const fileBuffer = fs.readFileSync(filePath)
      const base64Content = fileBuffer.toString('base64')

      const uploadPath = `${config.path}/${Date.now()}_${fileName}`
      const url = `https://api.github.com/repos/${config.repo}/contents/${uploadPath}`

      await axios.put(url, {
        message: `Upload ${fileName}`,
        content: base64Content,
        branch: config.branch || 'main'
      }, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      const imageUrl = `https://raw.githubusercontent.com/${config.repo}/${config.branch || 'main'}/${uploadPath}`
      return { success: true, url: imageUrl }
    } catch (error: unknown) {
      const err = error as Error
      return { success: false, error: err.message || 'Upload failed' }
    }
  })
}