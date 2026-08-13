import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import gsap from 'gsap'

import App from './App.vue'
import router from './router'
import { useThemeStore } from '@/store/modules/theme'
import './styles/main.scss'

// 注册GSAP为全局属性
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $gsap: typeof gsap
  }
}

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn as any
})

app.config.globalProperties.$gsap = gsap

// 初始化主题
const themeStore = useThemeStore()
themeStore.initTheme()

app.mount('#app')
