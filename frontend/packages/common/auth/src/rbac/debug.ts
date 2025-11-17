/*
 * Copyright 2025 coze-dev Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRBACPermissionStore } from './rbac-store';

/**
 * RBAC调试工具
 * 在浏览器控制台使用: window.RBAC_DEBUG()
 */
export const setupRBACDebug = () => {
  if (typeof window !== 'undefined') {
    (window as any).RBAC_DEBUG = () => {
      const store = useRBACPermissionStore.getState();
      console.group('🔐 RBAC 权限调试信息');
      console.log('1. 当前用户ID:', store.currentUserId);
      console.log('2. 当前空间ID:', store.currentSpaceId);
      console.log('3. 权限加载状态:', store.loading ? '加载中...' : '已加载');
      console.log('4. 错误信息:', store.error || '无');
      console.log('5. 权限数据:', store.userPermissions);

      if (store.userPermissions) {
        console.log('6. 角色列表:', store.userPermissions.roles);
        console.log('7. 聚合权限:', store.userPermissions.permissions);
        console.log('8. 详细权限:', store.userPermissions.detail_permissions);
      } else {
        console.warn('⚠️  权限数据为空！将使用降级模式（显示所有资源）');
      }

      console.groupEnd();
      return store;
    };

    console.log('✅ RBAC调试工具已注册，使用 window.RBAC_DEBUG() 查看权限状态');
  }
};

