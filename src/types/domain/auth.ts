/**
 * 认证 & 用户 & 角色 领域类型
 * 民宿管理者账号、登录态、权限角色。
 */
import type { ID, ISODateTime, PageParams } from './common'

// ========== 用户角色 ==========

/** 民宿管理者角色码 */
export type RoleCode = 'admin' | 'manager' | 'frontdesk' | 'cleaner' | 'finance'

/** 角色定义 */
export interface RoleInfo {
  id: ID
  /** 角色名（中文） */
  name: string
  /** 角色码 */
  code: RoleCode
  /** 角色描述 */
  description?: string
  /** 状态：1 启用 0 禁用 */
  status?: 0 | 1
  /** 权限点 ID 集合 */
  permissionIds?: ID[]
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

// ========== 管理员账号 ==========

/** 民宿管理者账号 */
export interface UserInfo {
  id: ID
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
  bio?: string
  /** 主角色码 */
  role: RoleCode
  /** 状态：1 启用 0 禁用 */
  status: 0 | 1
  /** 关联的物业 ID（民宿管理者可能管理多家物业） */
  propertyIds?: ID[]
  /** 最后登录时间 */
  lastLoginAt?: ISODateTime
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

// ========== 登录 / 注册 ==========

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
  /** 记住登录（延长 token 有效期） */
  remember?: boolean
}

/** 登录响应 */
export interface LoginResponse {
  token: string
  /** token 刷新凭证 */
  refreshToken?: string
  /** token 过期时间（秒） */
  expiresIn?: number
  userInfo: UserInfo
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  password: string
  nickname: string
  email?: string
  phone?: string
  /** 邀请码（多租户场景） */
  inviteCode?: string
}

// ========== 列表查询 ==========

/** 用户列表查询参数 */
export interface UserListParams extends PageParams {
  username?: string
  email?: string
  phone?: string
  role?: RoleCode
  status?: 0 | 1
}

/** 角色列表查询参数 */
export interface RoleListParams extends PageParams {
  name?: string
  code?: RoleCode
  status?: 0 | 1
}

// ========== 权限点 ==========

/** 权限点（菜单/按钮粒度） */
export interface Permission {
  id: ID
  /** 权限码（如 property:read、booking:write） */
  code: string
  /** 权限名（中文） */
  name: string
  /** 权限类型 */
  type: 'menu' | 'button' | 'api'
  /** 父权限 ID */
  parentId?: ID
  /** 路由 path（菜单权限专用） */
  path?: string
  /** 图标 */
  icon?: string
}