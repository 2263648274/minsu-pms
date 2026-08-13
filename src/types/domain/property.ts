/**
 * 物业 & 房型 & 房间 领域类型
 * 民宿 PMS 的核心物理资源模型：一栋物业下挂多个房型，每个房型下挂多个房间。
 */
import type { ID, ISODateTime, PageParams, Money } from './common'

// ========== 物业（Property） ==========

/** 物业类型 */
export type PropertyType = 'minsu' | 'hotel' | 'apartment' | 'villa' | 'hostel' | 'b&b'

/** 物业状态 */
export type PropertyStatus = 'active' | 'suspended' | 'closed'

/** 物业（一家民宿/酒店） */
export interface Property {
  id: ID
  /** 物业名（展示用） */
  name: string
  /** 内部编号 */
  code: string
  type: PropertyType
  status: PropertyStatus
  // 地址
  country?: string
  province?: string
  city: string
  district?: string
  address: string
  /** 经纬度 */
  longitude?: number
  latitude?: number
  // 联系
  phone?: string
  email?: string
  // 证照
  businessLicense?: string
  /** 消防证编号 */
  fireLicense?: string
  /** 特种行业许可证编号 */
  specialLicense?: string
  // 发票
  /** 发票抬头 */
  invoiceTitle?: string
  /** 税号 */
  taxNumber?: string
  /** 开户行 */
  bankName?: string
  /** 银行账号 */
  bankAccount?: string
  // 配置
  /** 入住时间（HH:mm） */
  checkInTime?: string
  /** 退房时间（HH:mm） */
  checkOutTime?: string
  /** 是否允许加床 */
  extraBedAllowed?: boolean
  /** 是否允许携带宠物 */
  petsAllowed?: boolean
  /** 配套设施（物业级） */
  amenities?: string[]
  /** 封面图 */
  cover?: string
  /** 图集 */
  gallery?: string[]
  description?: string
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

// ========== 房型（RoomType） ==========

/** 房型分类 */
export type RoomTypeCategory = 'single' | 'double' | 'twin' | 'family' | 'suite' | 'dorm' | 'studio'

/** 床型 */
export type BedType = 'single' | 'double' | 'queen' | 'king' | 'sofa' | 'bunk'

/** 房型（同一物业下的房间分类） */
export interface RoomType {
  id: ID
  propertyId: ID
  /** 房型名（如"豪华大床房"） */
  name: string
  /** 房型分类 */
  category: RoomTypeCategory
  /** 面积（㎡） */
  area: number
  /** 可住人数 */
  capacity: number
  /** 床型 + 张数 */
  beds: Array<{ type: BedType; count: number }>
  /** 楼层范围（多个不连续楼层） */
  floors: number[]
  /** 房间总数 */
  totalRooms: number
  /** 配套设施（房型级） */
  amenities: string[]
  /** 封面图 */
  cover?: string
  /** 图集 */
  gallery?: string[]
  /** 基础价（单位：分） */
  basePrice: Money
  description?: string
  /** 排序 */
  sort?: number
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

/** 房型列表查询参数 */
export interface RoomTypeListParams extends PageParams {
  propertyId?: ID
  category?: RoomTypeCategory
}

// ========== 房间（Room） ==========

/** 房间状态 */
export type RoomStatus = 'vacant' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order'

/** 房间（房型下的具体房间） */
export interface Room {
  id: ID
  propertyId: ID
  roomTypeId: ID
  /** 房间号（如 101、5-A） */
  roomNo: string
  /** 楼层 */
  floor: number
  /** 可住人数（覆盖房型默认值） */
  capacity: number
  /** 当前状态 */
  status: RoomStatus
  /** 是否可售卖 */
  forSale: boolean
  /** 配套设施（房间级，覆盖房型） */
  amenities?: string[]
  /** 房间实拍图 */
  photos?: string[]
  /** 备注 */
  description?: string
  createdAt?: ISODateTime
  updatedAt?: ISODateTime
}

/** 房间列表查询参数 */
export interface RoomListParams extends PageParams {
  propertyId?: ID
  roomTypeId?: ID
  roomNo?: string
  status?: RoomStatus
  floor?: number
  forSale?: boolean
}

// ========== 物业列表查询 ==========

/** 物业列表查询参数 */
export interface PropertyListParams extends PageParams {
  type?: PropertyType
  status?: PropertyStatus
  city?: string
}