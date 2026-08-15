/**
 * 认证 Service
 * 民宿管理者账号的登录、注册、当前用户信息。
 *
 * 已切真后端：所有方法转发到 ./api 里的真实 HTTP 接口（/api/auth/*、/api/users/*）。
 */
import { login as _login, register as _register, getUserInfo as _getUserInfo, getUserList as _getUserList } from './api'
import type { LoginRequest, LoginResponse, UserInfo, UserListParams, PageResult } from '@/types'

/** 注册请求参数（inline 避免与 domain 类型冲突；Phase 2 统一） */
export interface RegisterRequest {
  username: string
  password: string
  nickname: string
  email?: string
  phone?: string
  inviteCode?: string
}

export const authService = {
  /** 登录 */
  login(data: LoginRequest): Promise<LoginResponse> {
    return _login(data)
  },

  /** 注册 */
  register(data: RegisterRequest): Promise<{ token: string; userInfo: UserInfo }> {
    return _register(data)
  },

  /** 获取当前登录用户信息 */
  getProfile(): Promise<UserInfo> {
    return _getUserInfo()
  },

  /** 获取用户列表（用于多管理员账号场景） */
  listUsers(params: UserListParams): Promise<PageResult<UserInfo>> {
    return _getUserList(params)
  }
}

export type AuthService = typeof authService
export default authService