import { defineStore } from 'pinia'
import type { UserInfo, LoginRequest, LoginResponse } from '@/types'
import { login as loginApi, getUserInfo } from '@/services/api'

interface UserState {
  token: string
  userInfo: UserInfo | null
  isLoggedIn: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem('token') || '',
    userInfo: null,
    isLoggedIn: !!localStorage.getItem('token')
  }),

  getters: {
    username: (state) => state.userInfo?.username || '',
    nickname: (state) => state.userInfo?.nickname || '',
    avatar: (state) => state.userInfo?.avatar || '',
    role: (state) => state.userInfo?.role || ''
  },

  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem('token', token)
      this.isLoggedIn = true
    },

    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo
    },

    async login(data: LoginRequest): Promise<LoginResponse> {
      const response = await loginApi(data)
      this.setToken(response.token)
      this.setUserInfo(response.userInfo)
      return response
    },

    async fetchUserInfo() {
      const userInfo = await getUserInfo()
      this.setUserInfo(userInfo)
    },

    updateProfile(data: Partial<UserInfo>) {
      if (this.userInfo) {
        this.userInfo = { ...this.userInfo, ...data }
      }
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.isLoggedIn = false
      localStorage.removeItem('token')
    }
  },
  persist: true
})
