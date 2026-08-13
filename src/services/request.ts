import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import type { Response } from '@/types'
import { ElMessage } from 'element-plus'

/**
 * 内部 axios 实例（带拦截器）
 */
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// 响应拦截器（解包 Response.data）
instance.interceptors.response.use(
  (response: AxiosResponse<Response<unknown>>) => {
    const { code, message, data } = response.data
    if (code === 200 || code === 0) {
      return data as unknown as AxiosResponse // 返回 data，绕过 axios 内部处理
    }
    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error: AxiosError) => {
    if (error.message.includes('Network Error')) {
      ElMessage.error('网络错误，请检查网络连接')
      return Promise.reject(error)
    }
    if (error.response) {
      const { status } = error.response
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          localStorage.removeItem('token')
          window.location.href = '/admin/login'
          break
        case 403:
          ElMessage.error('没有权限访问')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器错误')
          break
        default:
          ElMessage.error('请求失败')
      }
    }
    return Promise.reject(error)
  }
)

/**
 * 统一请求函数。
 * axios 拦截器已自动解包 Response.data，调用方拿到的就是真实数据 T，无需 .data。
 */
function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  // 拦截器返回的是 response.data（已解包），运行时正确
  // 类型层强制 Promise<T>，避免调用方多写一次 .data
  return instance.request(config) as unknown as Promise<T>
}

export default request