// ========== 通用类型 ==========

// 通用响应结构
export interface Response<T = any> {
  code: number
  message: string
  data: T
}

// 分页参数
export interface PageParams {
  page?: number
  pageSize?: number
}

// 分页结果
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ========== 用户类型（保留用于登录/权限） ==========

// 用户信息
export interface UserInfo {
  id: number
  username: string
  nickname?: string
  realName?: string
  email?: string
  phone?: string
  avatar?: string
  bio?: string
  role?: string
  status?: number
  createdAt?: string
  updatedAt?: string
}

// 登录请求
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应
export interface LoginResponse {
  token: string
  userInfo: UserInfo
}

// 用户列表参数
export interface UserListParams extends PageParams {
  username?: string
  email?: string
  status?: number
}

// ========== 角色类型（保留） ==========

// 角色信息
export interface RoleInfo {
  id: number
  name: string
  code: string
  description?: string
  status?: number
  /** 权限点 ID 集合 */
  permissionIds?: number[]
  createdAt?: string
  updatedAt?: string
}

// 角色列表参数
export interface RoleListParams extends PageParams {
  name?: string
  code?: string
  status?: number
}

// ========== 内容类型（保留 - 用户端 Hero/Content） ==========

export interface HeroCard {
  id: number
  title: string
  description: string
  image?: string
  link?: string
  order?: number
}

export interface ContentCard {
  id: number
  title: string
  description?: string
  image?: string
  link?: string
  category?: string
  order?: number
}

// ========== 民宿业务类型 ==========

// 房间类型枚举
export type RoomType = 'single' | 'double' | 'family' | 'suite' | 'dorm'

// 房间状态枚举：空闲 / 已入住 / 待打扫 / 维修中
export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order'

// 房间信息
export interface RoomInfo {
  id: number
  roomNo: string // 房间号 如 101
  type: RoomType // 房型
  floor: number // 楼层
  capacity: number // 可入住人数
  price: number // 单晚价格（元）
  area: number // 面积（㎡）
  facilities: string[] // 配套设施
  status: RoomStatus // 当前状态
  description?: string // 备注
  cover?: string // 封面图
  createdAt?: string
  updatedAt?: string
}

// 房间列表参数
export interface RoomListParams extends PageParams {
  roomNo?: string
  type?: RoomType
  status?: RoomStatus
  floor?: number
  propertyId?: number
  roomTypeId?: number
}

// 订单状态枚举：待支付 / 已确认 / 已入住 / 已退房 / 已完成 / 已取消 / 已退款 / 未到店
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'no_show'

// 订单信息
export interface OrderInfo {
  id: number
  orderNo: string // 订单号
  customerId: number // 客户ID
  customerName: string // 客户姓名（冗余便于展示）
  customerPhone: string // 客户电话
  roomId: number // 房间ID
  roomNo: string // 房间号
  roomType: RoomType // 房型
  checkInDate: string // 入住日期 YYYY-MM-DD
  checkOutDate: string // 退房日期 YYYY-MM-DD
  nights: number // 入住夜数
  guests: number // 入住人数
  totalAmount: number // 总价
  status: OrderStatus
  remark?: string
  /** 取消原因 */
  cancelReason?: string
  createdAt?: string
  updatedAt?: string
}

// 订单列表参数
export interface OrderListParams extends PageParams {
  orderNo?: string
  customerName?: string
  roomNo?: string
  status?: OrderStatus
  checkInDateFrom?: string
  checkInDateTo?: string
}

// 客户信息
export interface CustomerInfo {
  id: number
  name: string // 姓名
  phone: string // 手机号
  idCard?: string // 身份证号
  gender?: 'male' | 'female' | 'other'
  birthday?: string
  address?: string
  vipLevel?: 0 | 1 | 2 | 3 // 0 普通 1 银卡 2 金卡 3 钻石
  totalOrders: number // 历史订单数
  totalSpend: number // 累计消费
  remark?: string
  /** 是否黑名单 */
  blacklisted?: boolean
  /** 黑名单原因 */
  blacklistReason?: string
  createdAt?: string
  updatedAt?: string
}

// 客户列表参数
export interface CustomerListParams extends PageParams {
  name?: string
  phone?: string
  vipLevel?: 0 | 1 | 2 | 3
}

// 仪表盘统计
export interface DashboardStats {
  // 房间维度
  totalRooms: number
  vacantRooms: number
  occupiedRooms: number
  cleaningRooms: number
  maintenanceRooms: number
  occupancyRate: number // 入住率 %
  // 订单维度
  totalOrders: number
  pendingOrders: number
  checkedInOrders: number
  todayCheckIns: number
  todayCheckOuts: number
  // 营收维度
  todayRevenue: number // 今日营收
  monthRevenue: number // 本月营收
  totalRevenue: number // 累计营收
  // 客户维度
  totalCustomers: number
  newCustomersThisMonth: number
}