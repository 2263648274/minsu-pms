import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

// ========== 管理员端路由（民宿 PMS 单一管理端） ==========
// 路由顺序遵循 PMS 业务优先级：房源 → 订单 → 渠道 → 财务 → 报表
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/admin/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/admin/register',
    name: 'AdminRegister',
    component: () => import('@/views/admin/Register.vue'),
    meta: { title: '注册', requiresAuth: false }
  },
  {
    path: '/admin',
    name: 'AdminLayout',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/admin/dashboard',
    meta: {
      title: '民宿 PMS',
      requiresAuth: true,
      roles: ['admin']
    },
    children: [
      // ========== 仪表盘 ==========
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '仪表盘', icon: 'DataLine', roles: ['admin'] }
      },

      // ========== 房源管理 ==========
      {
        path: 'property',
        name: 'PropertyManage',
        component: () => import('@/views/admin/property/PropertyManage.vue'),
        meta: { title: '房源管理', icon: 'House', roles: ['admin'] }
      },
      {
        path: 'property/rooms',
        name: 'RoomManage',
        component: () => import('@/views/admin/RoomManage.vue'),
        meta: { title: '房型管理', icon: 'OfficeBuilding', roles: ['admin'] }
      },
      {
        path: 'rate',
        name: 'RatePlanManage',
        component: () => import('@/views/admin/RatePlanManage.vue'),
        meta: { title: '房价管理', icon: 'Money', roles: ['admin'] }
      },
      {
        path: 'inventory',
        name: 'InventoryManage',
        component: () => import('@/views/admin/InventoryManage.vue'),
        meta: { title: '库存房态', icon: 'Calendar', roles: ['admin'] }
      },

      // ========== 订单管理 ==========
      {
        path: 'booking',
        name: 'BookingManage',
        component: () => import('@/views/admin/OrderManage.vue'),
        meta: { title: '订单管理', icon: 'List', roles: ['admin'] }
      },

      // ========== 客人管理 ==========
      {
        path: 'guest',
        name: 'GuestManage',
        component: () => import('@/views/admin/CustomerManage.vue'),
        meta: { title: '客人管理', icon: 'User', roles: ['admin'] }
      },

      // ========== 渠道管理（OTA） ==========
      {
        path: 'channel',
        name: 'ChannelManage',
        component: () => import('@/views/admin/ChannelManage.vue'),
        meta: { title: 'OTA 渠道', icon: 'Connection', roles: ['admin'] }
      },
      {
        path: 'channel/sync-log',
        name: 'ChannelSyncLog',
        component: () => import('@/views/admin/ChannelSyncLog.vue'),
        meta: { title: '渠道同步日志', icon: 'Document', roles: ['admin'] }
      },

      // ========== 财务对账 ==========
      {
        path: 'finance',
        name: 'FinanceManage',
        component: () => import('@/views/admin/FinanceManage.vue'),
        meta: { title: '财务对账', icon: 'Wallet', roles: ['admin'] }
      },

      // ========== 报表统计 ==========
      {
        path: 'report',
        name: 'ReportManage',
        component: () => import('@/views/admin/ReportManage.vue'),
        meta: { title: '营业报表', icon: 'TrendCharts', roles: ['admin'] }
      },

      // ========== 个人信息 ==========
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('@/views/admin/Profile.vue'),
        meta: { title: '个人信息', icon: 'UserFilled', roles: ['admin', 'user'] }
      }
    ]
  }
]

// ========== 404 路由 ==========
export const errorRoutes: RouteRecordRaw[] = [
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '404' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/admin/dashboard'
  }
]

// 创建路由（主入口重定向到管理端）
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 主入口：直接进入管理端
    { path: '/', redirect: '/admin/dashboard' },
    ...adminRoutes,
    ...errorRoutes
  ]
})

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: string[]
    icon?: string
  }
}

let pendingRoute: string | null = null

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')
  const isLoggedIn = !!token

  document.title = `${to.meta.title || '页面'} - ${import.meta.env.VITE_APP_TITLE}`

  if (to.meta.requiresAuth === false) {
    if (to.path === '/admin/login' && isLoggedIn) {
      next('/admin/dashboard')
      return
    }
    next()
    return
  }

  if ((to.meta.requiresAuth as boolean | undefined) !== false && !isLoggedIn) {
    pendingRoute = to.fullPath
    next('/admin/login')
    return
  }

  try {
    const { useUserStore } = await import('@/store')
    const userStore = useUserStore()
    if (!userStore.userInfo) {
      await userStore.fetchUserInfo()
    }
    if (to.meta.roles && to.meta.roles.length > 0) {
      const userRole = (userStore.role || 'user').toLowerCase()
      const allowedRoles = to.meta.roles.map((r: string) => r.toLowerCase())
      if (!allowedRoles.includes(userRole)) {
        console.error(`权限不足: 需要 ${to.meta.roles.join(',')}, 当前 ${userRole}`)
        next('/admin/dashboard')
        return
      }
    }
    next()
  } catch (error) {
    console.error('Token验证失败:', error)
    localStorage.removeItem('token')
    const { useUserStore } = await import('@/store')
    const userStore = useUserStore()
    userStore.logout()
    pendingRoute = to.fullPath
    next('/admin/login')
  }
})

export const getPendingRoute = () => pendingRoute
export const clearPendingRoute = () => { pendingRoute = null }

export default router