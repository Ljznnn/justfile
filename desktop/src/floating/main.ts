import { createApp } from 'vue'
import FloatingApp from './FloatingApp.vue'

// 创建独立的 Vue 应用实例
const app = createApp(FloatingApp)

// 挂载到 #app 元素
app.mount('#app')
