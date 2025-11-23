import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from './api';

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

import DashboardComponent from './components/DashboardComponent.vue'
import UserManage from './components/UserManage.vue'
import UserAttendence from './components/UserAttendence.vue'
import ArticleManage from './components/ArticleManage.vue'
import ArticleCreate from './components/ArticleCreate.vue'
import EditorView from './views/EditorView.vue';
import CreateView from './views/CreateView.vue';

import EditorComponent from './components/EditorComponent.vue';
import EditorCreateComponent from './components/EditorCreateComponent.vue';
import GroupManage from './components/GroupManage.vue';
import LearningProgress from './components/LearningProgress.vue';
import HomeCoverManage from './components/HomeCoverManage.vue';
import MedalManage from './components/MedalManage.vue';
import MedalGrant from './components/MedalGrant.vue';
import AuditLogManage from './components/AuditLogManage.vue';

const router = createRouter({
    history: createWebHistory("/admin/"),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            children: [
                {
                    path: '/user-manage/users',
                    name: 'user_manage_users',
                    component: UserManage,
                    meta: { requiresAuth: true, permission: 'user_management' }
                },
                {
                    path: '/user-manage/attendence',
                    name: 'user_manage_attendence',
                    component: UserAttendence,
                    meta: { requiresAuth: true, permission: 'user_management' }
                },
                {
                    path: '',
                    name: 'home_default',
                    component: DashboardComponent
                },
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    component: DashboardComponent
                },
                {
                    path: '/article/manage',
                    name: 'article_manage',
                    component: ArticleManage,
                    meta: { requiresAuth: true, permission: 'article_management' }
                },
                {
                    path: '/article/create',
                    name: 'article_create',
                    component: ArticleCreate,
                    meta: { requiresAuth: true, permission: 'article_management' }
                },
                {
                    path: '/group/manage',
                    name: 'group_manage',
                    component: GroupManage,
                    meta: { requiresAuth: true, permission: 'user_management' }
                },
                {
                    path: '/learningprgress/manage',
                    name: 'learningprgress_manage',
                    component: LearningProgress,
                    meta: { requiresAuth: true, permission: 'user_management' }
                },
                {
                    path: '/homepage/cover',
                    name: 'homepage_cover',
                    component: HomeCoverManage,
                    meta: { requiresAuth: true, permission: 'system_management' }
                },
                {
                    path: '/medal/manage',
                    name: 'medal_manage',
                    component: MedalManage,
                    meta: { requiresAuth: true, permission: 'medal_management' }
                },
                {
                    path: '/medal/grant',
                    name: 'medal_grant',
                    component: MedalGrant,
                    meta: { requiresAuth: true, permission: 'medal_management' }
                },
                {
                    path: '/audit/logs',
                    name: 'audit_logs',
                    component: AuditLogManage,
                    meta: { requiresAuth: true, permission: 'system_management' }
                }
            ]
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/register',
            name: 'register',
            component: RegisterView
        },
        {
            path: '/editor',
            name: 'editor',
            component: EditorView,
        },
        {
            path: '/public',
            name: 'public',
            component: CreateView,
        }
    ]
})

// 全局路由守卫：检查权限
router.beforeEach(async (to, from, next) => {
  // 公开路由，无需验证
  const publicPages = ['/login', '/register', '/editor', '/public'];
  const authRequired = !publicPages.includes(to.path);
  const token = localStorage.getItem('token_backend');

  // 需要登录但未登录
  if (authRequired && !token) {
    ElMessage.error('请先登录');
    return next('/login');
  }

  // 检查路由权限
  if (to.meta.requiresAuth && to.meta.permission) {
    try {
      // 获取当前用户权限
      const permRes = await api({
        url: '/permissions/user/self',
        method: 'get'
      });

      if (permRes.data.code !== 200) {
        ElMessage.error('获取权限信息失败');
        return next('/dashboard');
      }

      const userMode = permRes.data.user_mode;
      const requiredPermission = to.meta.permission;

      // 如果是 admin 用户，直接放行
      if (userMode === 'admin') {
        return next();
      }

      // 普通用户检查权限
      const userPermissions = permRes.data.permissions.map(p => p.name);

      // 检查是否有所需权限
      if (!userPermissions.includes(requiredPermission)) {
        ElMessage.error(`您没有访问此页面的权限（需要: ${requiredPermission}）`);
        return next('/dashboard');
      }
    } catch (error) {
      console.error('权限验证失败:', error);
      ElMessage.error('权限验证失败');
      return next('/dashboard');
    }
  }

  next();
});

export default router
