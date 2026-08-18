import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import type { Response } from '@/types'
import { ElMessage } from 'element-plus'

/** 后端每个请求都会返回 X-Request-ID 响应头（RequestLoggingFilter） */
const REQUEST_ID_HEADER = 'x-request-id'

type WithRequestId = { requestId?: string }

function extractRequestId(error: AxiosError): string | null {
  const value = error.response?.headers?.[REQUEST_ID_HEADER]
  return typeof value === 'string' && value ? value : null
}

/** 错误提示追加请求标识，便于用户把现象和后端日志对上（不含敏感字段） */
function withRequestId(message: string, requestId: string | null): string {
  return requestId ? `${message}（请求标识 ${requestId}）` : message
}

/**
 * 把任意请求异常转成给用户看的描述：错误消息 + 请求标识（存在时）。
 * 页面级错误态统一用它，避免各页手拼。
 */
export function describeError(e: unknown): string {
  if (e instanceof Error) {
    return withRequestId(e.message, (e as Error & WithRequestId).requestId ?? null)
  }
  return String(e)
}

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
    // 业务错误（HTTP 200 + envelope 错误码）同样带 X-Request-ID
    const requestId = typeof response.headers?.[REQUEST_ID_HEADER] === 'string'
      ? response.headers[REQUEST_ID_HEADER] as string
      : null
    const err = new Error(message || '请求失败') as Error & WithRequestId
    if (requestId) err.requestId = requestId
    ElMessage.error(withRequestId(message || '请求失败', requestId))
    return Promise.reject(err)
  },
  (error: AxiosError) => {
    const requestId = extractRequestId(error)
    const tagged = error as AxiosError & WithRequestId
    if (requestId) tagged.requestId = requestId

    if (error.code === 'ECONNABORTED') {
      ElMessage.error(withRequestId('请求超时，请稍后重试', requestId))
      return Promise.reject(tagged)
    }
    if (error.message.includes('Network Error')) {
      ElMessage.error('网络错误，请检查网络连接')
      return Promise.reject(tagged)
    }
    if (error.response) {
      const { status } = error.response
      switch (status) {
        case 401:
          // 登录失效：清理状态并回登录页，不走“空数据”展示
          ElMessage.error('未授权，请重新登录')
          localStorage.removeItem('token')
          window.location.href = '/admin/login'
          break
        case 403:
          ElMessage.error(withRequestId('没有权限访问', requestId))
          break
        case 404:
          ElMessage.error(withRequestId('请求的资源不存在', requestId))
          break
        case 500:
          ElMessage.error(withRequestId('服务器错误', requestId))
          break
        default:
          ElMessage.error(withRequestId('请求失败', requestId))
      }
    }
    return Promise.reject(tagged)
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
