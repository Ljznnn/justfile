<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/locale/zh-cn'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import Icon from '@/components/common/Icon.vue'

// 图表DOM引用
const chartDom = ref<HTMLElement | null>(null)
const myChart = ref<echarts.ECharts | null>(null)

// 缩放比例
const scaleSize = ref(100)
// 画布宽高
const widthCanvas = ref(720)
const heightCanvas = ref(400)
// 下载文件类型
const downType = ref('1')
// 图形属性颜色
const attrColor = ref('#5470c6')
// 标题位置
const titlePos = ref<'left' | 'center' | 'right'>('center')
// 标题
const title = ref('曲线图')
// 副标题
const subTitle = ref('在线图表制作工具')
// 显示标题开关
const titleSwitch = ref(true)
// 显示副标题开关
const subTitleSwitch = ref(true)
// 水印开关
const watermarkSwitch = ref(false)
// 水印内容
const waterMarkText = ref('JustFile')

// 数据
const columnData = ref(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const valueData = ref([23, 24, 18, 25, 27, 28, 25])

// 抽屉开关
const drawer = ref(false)
// 表格数据
const rowsData = ref<any>({})

// 当前激活的 Tab
const activeTab = ref('canvas')

// 创建水印
const createWatermark = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.height = 100
  ctx!.textAlign = 'center'
  ctx!.textBaseline = 'middle'
  ctx!.globalAlpha = 0.08
  ctx!.font = '20px Microsoft Yahei'
  ctx!.translate(50, 50)
  ctx!.rotate(-Math.PI / 4)
  ctx!.fillText(waterMarkText.value, 0, 0)
  return canvas
}

// 获取图表配置
const getOption = () => ({
  backgroundColor: watermarkSwitch.value ? { image: createWatermark() } : '#fff',
  title: {
    text: titleSwitch.value ? title.value : '',
    subtext: subTitleSwitch.value ? subTitle.value : '',
    left: titlePos.value,
    top: 10,
    padding: titlePos.value === 'center' ? [0, 0, 0, 0] : [0, 40, 0, 40]
  },
  grid: {
    top: 100,
    left: 50,
    right: 30,
    bottom: 50
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: columnData.value
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      type: 'line',
      data: valueData.value,
      smooth: true,
      itemStyle: {
        color: attrColor.value
      },
      lineStyle: {
        color: attrColor.value
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: attrColor.value + '66' },
          { offset: 1, color: attrColor.value + '00' }
        ])
      }
    }
  ]
})

// 初始化图表
const initChart = () => {
  if (!chartDom.value) return
  myChart.value = echarts.init(chartDom.value)
  myChart.value.setOption(getOption())
}

// 更新图表
const updateChart = () => {
  myChart.value?.setOption(getOption())
}

// 缩放画布
const handleScale = () => {
  if (!chartDom.value) return
  const scale = scaleSize.value / 100
  chartDom.value.style.transform = `scale(${scale})`
}

// 更新画布尺寸
const handleResize = () => {
  if (!chartDom.value) return
  chartDom.value.style.width = widthCanvas.value + 'px'
  chartDom.value.style.height = heightCanvas.value + 'px'
  myChart.value?.resize()
}

// 下载图表
const downloadChart = () => {
  const ext = downType.value === '1' ? 'png' : 'jpeg'
  const imgUrl = myChart.value?.getDataURL({
    type: ext as 'png' | 'jpeg',
    pixelRatio: 2
  })
  if (imgUrl) {
    const link = document.createElement('a')
    link.href = imgUrl
    link.download = `chart.${ext}`
    link.click()
    ElMessage.success('下载成功')
  }
}

// 上传文件处理
const fileInput = ref<HTMLInputElement | null>(null)
const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const fileReader = new FileReader()
  fileReader.onload = (ev) => {
    try {
      if (!ev.target?.result) return
      const data = ev.target.result
      const workbook = XLSX.read(data, { type: 'array' })

      let tmpColumnData: string[] = []
      let tmpValueData: number[] = []

      for (const sheet in workbook.Sheets) {
        const sheetArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 }) as any[][]
        if (sheetArray.length === 0) continue

        // 跳过第一行（标题行）
        for (let i = 0; i < sheetArray.length; i++) {
          const row = sheetArray[i]
          if (row && row.length >= 2) {
            tmpColumnData.push(String(row[0] ?? ''))
            tmpValueData.push(Number(row[1]) ?? 0)
          }
        }
        break // 只处理第一个sheet
      }

      if (tmpColumnData.length > 0) {
        columnData.value = tmpColumnData
        valueData.value = tmpValueData
        updateChart()
        updateRowsData()
        ElMessage.success('数据导入成功')
      }
    } catch (err) {
      console.error(err)
      ElMessage.error('文件解析失败')
    }
  }
  fileReader.readAsArrayBuffer(file)
  target.value = ''
}

// 更新表格数据
const updateRowsData = () => {
  const res: any = {}
  const len = Math.max(columnData.value.length, valueData.value.length)
  for (let i = 0; i < len; i++) {
    res[i] = {
      cells: {
        0: { text: columnData.value[i] ?? '' },
        1: { text: String(valueData.value[i] ?? '') }
      }
    }
  }
  rowsData.value = res
}

// Spreadsheet数据转echarts数据
const toEchartsData = (data: any) => {
  const tmpColumn: string[] = []
  const tmpValue: number[] = []
  for (const item in data.rows) {
    if (item === 'len') continue
    tmpColumn.push(data.rows[item]?.cells?.[0]?.text ?? '')
    tmpValue.push(Number(data.rows[item]?.cells?.[1]?.text) ?? 0)
  }
  return [tmpColumn, tmpValue]
}

// 打开编辑数据抽屉
let spreadsheetInstance: any = null
const openEditor = () => {
  drawer.value = true
}

// 抽屉打开后初始化 Spreadsheet
const onDrawerOpened = async () => {
  await nextTick()

  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        // 先销毁之前的实例
        if (spreadsheetInstance) {
          spreadsheetInstance = null
        }

        // 清空容器内容
        const container = document.getElementById('spreadsheet-container')
        if (!container) {
          console.error('Spreadsheet container not found')
          return
        }
        container.innerHTML = ''

        Spreadsheet.locale('zh-cn', (window as any).x_spreadsheet?.$messages?.['zh-cn'])

        const height = container.clientHeight || 400
        const width = container.clientWidth || window.innerWidth - 40

        spreadsheetInstance = new Spreadsheet('#spreadsheet-container', {
          showToolbar: false,
          showBottomBar: false,
          view: {
            height: () => height,
            width: () => width
          }
        })
          .loadData({
            styles: [
              {
                bgcolor: '#f4f5f8',
                textwrap: true,
                border: {
                  top: ['thin', '#0366d6'],
                  bottom: ['thin', '#0366d6'],
                  right: ['thin', '#0366d6'],
                  left: ['thin', '#0366d6']
                }
              }
            ],
            rows: rowsData.value
          })
          .change((data: any) => {
            const [newColumn, newValue] = toEchartsData(data)
            columnData.value = newColumn
            valueData.value = newValue
            updateChart()
          })
      } catch (e) {
        console.error('Failed to initialize spreadsheet:', e)
      }
    }, 100)
  })
}

// 处理从悬浮球传来的文件
async function handleFloatingFile() {
  const globalPath = (window as any).__floatingFilePath
  if (globalPath?.value) {
    const filePath = globalPath.value
    globalPath.value = null

    try {
      const uint8Array = await window.electronAPI.readFileAsArrayBuffer(filePath)
      if (uint8Array) {
        const workbook = XLSX.read(uint8Array, { type: 'array' })
        let tmpColumnData: string[] = []
        let tmpValueData: number[] = []

        for (const sheet in workbook.Sheets) {
          const sheetArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 }) as any[][]
          if (sheetArray.length === 0) continue

          for (let i = 0; i < sheetArray.length; i++) {
            const row = sheetArray[i]
            if (row && row.length >= 2) {
              tmpColumnData.push(String(row[0] ?? ''))
              tmpValueData.push(Number(row[1]) ?? 0)
            }
          }
          break
        }

        if (tmpColumnData.length > 0) {
          columnData.value = tmpColumnData
          valueData.value = tmpValueData
          updateChart()
          updateRowsData()
        }
      }
    } catch (e) {
      console.error('Failed to load file from path:', e)
    }
  }
}

onMounted(() => {
  initChart()
  updateRowsData()
  handleFloatingFile()
})

watch(() => (window as any).__filePathChanged?.value, () => {
  handleFloatingFile()
})

onUnmounted(() => {
  myChart.value?.dispose()
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- 返回 -->
    <router-link to="/" class="inline-flex items-center gap-1.5 text-muted hover:text-secondary mb-4">
      <Icon name="arrow-left-s-line" :size="14" />
      <span class="text-xs">返回</span>
    </router-link>

    <!-- 标题 -->
    <h1 class="text-primary font-semibold mb-6 title-line" style="font-size: var(--font-size-title)">曲线图</h1>

    <!-- 配置面板 -->
    <div class="theme-card p-6 mb-6">
      <!-- 操作按钮行 -->
      <div class="flex items-center gap-4 mb-6 pb-5" style="border-bottom: 1px solid var(--border-color)">
        <el-button type="primary" @click="downloadChart">
          <Icon name="download-line" :size="16" class="mr-1.5" />
          下载图表
        </el-button>
        <el-radio-group v-model="downType" size="default">
          <el-radio-button value="1">PNG</el-radio-button>
          <el-radio-button value="2">JPEG</el-radio-button>
        </el-radio-group>
        <div class="flex-1"></div>
        <el-button @click="fileInput?.click()">
          <Icon name="upload-line" :size="16" class="mr-1.5" />
          导入数据
        </el-button>
        <el-button @click="openEditor">
          <Icon name="edit-line" :size="16" class="mr-1.5" />
          编辑数据
        </el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".xls,.xlsx,.csv"
          class="hidden"
          @change="handleFileUpload"
        />
      </div>

      <!-- Tabs 配置项 -->
      <el-tabs v-model="activeTab" class="config-tabs">
        <!-- 画布设置 -->
        <el-tab-pane label="画布" name="canvas">
          <div class="config-content">
            <div class="config-item">
              <span class="config-label">宽度</span>
              <el-input-number v-model="widthCanvas" :min="100" :max="2000" :step="10" @change="handleResize" />
              <span class="config-unit">px</span>
            </div>
            <div class="config-item">
              <span class="config-label">高度</span>
              <el-input-number v-model="heightCanvas" :min="100" :max="2000" :step="10" @change="handleResize" />
              <span class="config-unit">px</span>
            </div>
            <div class="config-item">
              <span class="config-label">缩放</span>
              <el-input-number v-model="scaleSize" :min="10" :max="200" :step="10" @change="handleScale" />
              <span class="config-unit">%</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 标题设置 -->
        <el-tab-pane label="标题" name="title">
          <div class="config-content">
            <div class="config-item">
              <el-checkbox v-model="titleSwitch" @change="updateChart" />
              <span class="config-label">标题</span>
              <el-input v-model="title" @blur="updateChart" placeholder="输入标题" class="flex-1" />
            </div>
            <div class="config-item">
              <el-checkbox v-model="subTitleSwitch" @change="updateChart" />
              <span class="config-label">副标题</span>
              <el-input v-model="subTitle" @blur="updateChart" placeholder="输入副标题" class="flex-1" />
            </div>
            <div class="config-item">
              <span class="config-label">位置</span>
              <el-radio-group v-model="titlePos" @change="updateChart">
                <el-radio-button value="left">左对齐</el-radio-button>
                <el-radio-button value="center">居中</el-radio-button>
                <el-radio-button value="right">右对齐</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </el-tab-pane>

        <!-- 图形属性 -->
        <el-tab-pane label="图形" name="style">
          <div class="config-content">
            <div class="config-item">
              <span class="config-label">线条颜色</span>
              <el-color-picker v-model="attrColor" @change="updateChart" />
            </div>
          </div>
        </el-tab-pane>

        <!-- 水印设置 -->
        <el-tab-pane label="水印" name="watermark">
          <div class="config-content">
            <div class="config-item">
              <el-checkbox v-model="watermarkSwitch" @change="updateChart" />
              <span class="config-label">显示水印</span>
            </div>
            <div v-if="watermarkSwitch" class="config-item">
              <span class="config-label">水印内容</span>
              <el-input v-model="waterMarkText" @input="updateChart" placeholder="请输入水印内容" class="flex-1" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 图表区域 -->
    <div class="theme-card p-6">
      <div class="flex justify-center items-center overflow-auto" style="min-height: 450px">
        <div
          ref="chartDom"
          class="bg-white rounded-lg"
          :style="{ width: widthCanvas + 'px', height: heightCanvas + 'px' }"
        ></div>
      </div>
    </div>

    <!-- 说明 -->
    <div class="mt-6 theme-card p-5">
      <p class="text-muted text-sm leading-relaxed">
        曲线图适合展示数据随时间变化的趋势。支持导入 Excel/CSV 文件，第一列为X轴数据，第二列为Y轴数据。
        也可点击"编辑数据"在线编辑表格内容。
      </p>
    </div>

    <!-- 数据编辑抽屉 -->
    <el-drawer
      v-model="drawer"
      direction="btt"
      title="编辑数据"
      :size="50"
      @opened="onDrawerOpened"
    >
      <div id="spreadsheet-container" class="spreadsheet-wrapper"></div>
    </el-drawer>
  </div>
</template>

<style scoped>
.spreadsheet-wrapper {
  width: 100%;
  flex: 1 1 auto;
  min-height: 300px;
  overflow: hidden;
  background: #fff;
}

:deep(#spreadsheet-container) {
  width: 100%;
  height: 100%;
}

:deep(#spreadsheet-container .x-spreadsheet) {
  width: 100% !important;
  height: 100% !important;
}

/* Tabs 样式 */
:deep(.config-tabs) {
  --el-tabs-header-height: 36px;
}

:deep(.config-tabs .el-tabs__header) {
  margin-bottom: 0;
}

:deep(.config-tabs .el-tabs__item) {
  padding: 0 20px;
  font-size: 14px;
  color: var(--text-muted);
}

:deep(.config-tabs .el-tabs__item.is-active) {
  color: var(--accent);
  font-weight: 500;
}

:deep(.config-tabs .el-tabs__item:hover) {
  color: var(--accent);
}

:deep(.config-tabs .el-tabs__active-bar) {
  background-color: var(--accent);
}

:deep(.config-tabs .el-tabs__content) {
  padding: 16px 0;
}

/* 配置内容区域 */
.config-content {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 40px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-label {
  font-size: 14px;
  color: var(--text-muted);
  min-width: 70px;
}

.config-unit {
  font-size: 14px;
  color: var(--text-muted);
}
</style>
