<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <router-link to="/admin/dashboard" class="logo">
          <el-icon :size="22" color="#67c23a"><HomeFilled /></el-icon>
          <span v-if="!sidebarCollapsed">民宿管理系统</span>
        </router-link>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        :unique-opened="true"
        router
        background-color="var(--sidebar-bg)"
        text-color="var(--sidebar-text)"
        active-text-color="var(--primary-color)"
      >
        <template v-for="menuRoute in menuRoutes" :key="menuRoute.path">
          <el-sub-menu v-if="menuRoute.children && menuRoute.children.length" :index="menuRoute.path">
            <template #title>
              <el-icon><component :is="menuRoute.meta?.icon" /></el-icon>
              <span>{{ menuRoute.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in menuRoute.children"
              :key="child.path"
              :index="`${menuRoute.path}/${child.path}`"
            >
              <el-icon><component :is="child.meta?.icon" /></el-icon>
              <span>{{ child.meta?.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="menuRoute.path">
            <el-icon><component :is="menuRoute.meta?.icon" /></el-icon>
            <span>{{ menuRoute.meta?.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </aside>

    <!-- 主体区域 -->
    <div class="main-container">
      <!-- 顶部导航 -->
      <header class="header">
        <div class="header-left">
          <el-button
            :icon="sidebarCollapsed ? Expand : Fold"
            circle
            @click="toggleSidebar"
          />
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item.path"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- 主题切换 -->
          <el-button
            :icon="themeStore.isDark ? Sunny : Moon"
            circle
            @click="themeStore.toggleTheme()"
          />

          <!-- 用户下拉菜单 -->
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :src="userStore.avatar" :size="32">
                {{ userStore.username.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ userStore.nickname || userStore.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容区域 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore, useUserStore } from '@/store'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Fold,
  Expand,
  User,
  ArrowDown,
  SwitchButton,
  Sunny,
  Moon,
  HomeFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const userStore = useUserStore()

const sidebarCollapsed = ref(false)

// 菜单路由（排除 login 和重定向路由）
const menuRoutes = computed(() => {
  const layoutRoute = router.options.routes.find(r => r.path === '/admin')
  return layoutRoute?.children?.filter(r => r.path !== 'login' && !r.redirect) || []
})

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 面包屑
const breadcrumbs = computed(() => {
  const matched = route.matched.filter(r => r.meta?.title)
  return matched.map(r => ({
    path: r.path,
    title: r.meta?.title as string
  }))
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/admin/profile')
      break
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        userStore.logout()
        router.push('/admin/login')
        ElMessage.success('已退出登录')
      })
      break
  }
}
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: var(--bg-color);
}

.sidebar {
  width: 220px;
  height: 100%;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  transition: width var(--transition-base);
  flex-shrink: 0;
  overflow-x: hidden;

  &.collapsed {
    width: 64px;

    .logo span {
      display: none;
    }
  }

  .sidebar-header {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    border-bottom: 1px solid var(--border-color);

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 18px;
      font-weight: bold;
    }
  }

  :deep(.el-menu) {
    border-right: none;
  }
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: var(--transition-base);

      &:hover {
        background: var(--bg-color);
      }

      .username {
        font-size: 14px;
        color: var(--text-primary);
      }
    }
  }
}

.content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

// 移动端适配
@media (max-width: 768px) {
  .sidebar {
    width: 0;
    &:not(.collapsed) {
      width: 200px;
    }
  }

  .header {
    height: 56px;
    padding: 0 12px;
  }

  .header-left .el-breadcrumb {
    display: none;
  }

  .content {
    padding: 12px;
  }

  .username {
    display: none;
  }
}
</style>
