import { defineStore } from 'pinia'

// Only two themes:
// 'light' → Light mode (Linear design system structure, light colors)
// 'linear' → Dark mode (Linear design system complete dark theme, display name is "深色模式")
type Theme = 'light' | 'linear'

interface ThemeState {
  theme: Theme
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    theme: (localStorage.getItem('theme') as Theme) || 'light'
  }),

  getters: {
    isDark: (state) => state.theme === 'linear',
    isLinear: (state) => state.theme === 'linear'
  },

  actions: {
    setTheme(theme: Theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      this.applyTheme()
    },

    toggleTheme() {
      // Toggle: light ↔ linear (dark)
      this.setTheme(this.theme === 'light' ? 'linear' : 'light')
    },

    initTheme() {
      this.applyTheme()
    },

    applyTheme() {
      document.documentElement.removeAttribute('data-theme')
      if (this.theme !== 'light') {
        document.documentElement.setAttribute('data-theme', this.theme)
      }
    }
  },
  persist: true
})
