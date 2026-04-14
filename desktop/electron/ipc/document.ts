import { ipcMain } from 'electron'
import axios from 'axios'
import path from 'path'
import fs from 'fs'

export function registerDocumentIpcHandlers() {
  ipcMain.handle('document:convert', async (_, filePath: string, targetFormat: string, apiKey: string) => {
    try {
      const fileBuffer = fs.readFileSync(filePath)
      const base64Content = fileBuffer.toString('base64')

      const response = await axios.post('https://api.pdf.co/v1/pdf/convert/to/docx', {
        file: base64Content,
        name: path.basename(filePath, path.extname(filePath)) + '.docx'
      }, {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (response.data.error) {
        return { success: false, error: response.data.message || 'Conversion failed' }
      }

      const downloadUrl = response.data.url
      const convertedResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' })

      const outputPath = path.join(
        path.dirname(filePath),
        `${path.basename(filePath, path.extname(filePath))}.docx`
      )
      fs.writeFileSync(outputPath, Buffer.from(convertedResponse.data))

      return { success: true, outputPath, downloadUrl }
    } catch (error: unknown) {
      const err = error as Error
      return { success: false, error: err.message || 'Conversion failed' }
    }
  })
}