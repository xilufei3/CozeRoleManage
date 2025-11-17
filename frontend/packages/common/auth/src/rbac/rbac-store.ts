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

import { create } from 'zustand';

import { RBACResourceType, RBACAction } from './constants';
import type { UserPermissions, PermissionCheckResult } from './types';

interface RBACPermissionState {
  // 当前用户的权限数据
  userPermissions: UserPermissions | null;
  // 是否正在加载权限
  loading: boolean;
  // 错误信息
  error: string | null;
  // 当前的space_id和user_id
  currentSpaceId: string | null;
  currentUserId: string | null;
  // 重新加载标志（每次修改角色后+1，触发重新加载）
  reloadFlag: number;
}

interface RBACPermissionActions {
  // 设置用户权限
  setUserPermissions: (permissions: UserPermissions) => void;
  // 清除权限（用户登出或切换空间）
  clearPermissions: () => void;
  // 检查单个权限
  checkPermission: (
    resourceType: RBACResourceType,
    resourceId: string,
    action: RBACAction,
  ) => boolean;
  // 获取资源的所有权限
  getResourcePermissions: (
    resourceType: RBACResourceType,
    resourceId: string,
  ) => RBACAction[];
  // 获取资源的角色权限（不包括直接权限）
  getResourceRolePermissions: (
    resourceType: RBACResourceType,
    resourceId: string,
  ) => RBACAction[];
  // 批量检查权限
  batchCheckPermissions: (
    checks: Array<{
      resourceType: RBACResourceType;
      resourceId: string;
      action: RBACAction;
    }>,
  ) => PermissionCheckResult[];
  // 设置加载状态
  setLoading: (loading: boolean) => void;
  // 设置错误
  setError: (error: string | null) => void;
  // 设置当前上下文
  setContext: (spaceId: string, userId: string) => void;
  // 触发权限重新加载
  triggerReload: () => void;
  // 获取是否需要重新加载
  shouldReload: () => boolean;
}

type RBACPermissionStore = RBACPermissionState & RBACPermissionActions;

export const useRBACPermissionStore = create<RBACPermissionStore>(
  (set, get) => ({
    // 初始状态
    userPermissions: null,
    loading: false,
    error: null,
    currentSpaceId: null,
    currentUserId: null,
    reloadFlag: 0,

    // 设置用户权限
    setUserPermissions: (permissions: UserPermissions) => {
      set({
        userPermissions: permissions,
        loading: false,
        error: null,
      });
    },

    // 清除权限
    clearPermissions: () => {
      set({
        userPermissions: null,
        loading: false,
        error: null,
        currentSpaceId: null,
        currentUserId: null,
      });
    },

    // 检查单个权限
    checkPermission: (
      resourceType: RBACResourceType,
      resourceId: string,
      action: RBACAction,
    ): boolean => {
      const { userPermissions } = get();
      if (!userPermissions || !userPermissions.detail_permissions) {
        return false;
      }

      // 🔑 策略：合并所有权限源（角色权限+直接权限），取并集
      // 需要检查所有匹配的权限记录，因为同一个资源可能有多个权限记录（来自不同角色或直接权限）

      // 1. 检查"所有资源"(resource_id=0)的权限（可能有多个记录，需要全部检查）
      const allResourcePerms = userPermissions.detail_permissions.filter(
        perm =>
          perm.resource_type === resourceType &&
          (perm.resource_id === '0' || perm.resource_id === 0),
      );

      for (const perm of allResourcePerms) {
        if (perm.actions.includes(action)) {
          return true; // 找到匹配的权限
        }
      }

      // 2. 检查具体资源的权限（可能有多个记录，需要全部检查）
      // 注意：resourceId可能是字符串或数字，需要统一比较
      const specificPerms = userPermissions.detail_permissions.filter(perm => {
        if (perm.resource_type !== resourceType) {
          return false;
        }
        // 统一转换为字符串进行比较
        const permResourceId = String(perm.resource_id);
        const targetResourceId = String(resourceId);
        return permResourceId === targetResourceId;
      });

      for (const perm of specificPerms) {
        if (perm.actions.includes(action)) {
          return true; // 找到匹配的权限
        }
      }

      return false;
    },

    // 获取资源的所有权限
    getResourcePermissions: (
      resourceType: RBACResourceType,
      resourceId: string,
    ): RBACAction[] => {
      const { userPermissions } = get();
      if (!userPermissions || !userPermissions.detail_permissions) {
        return [];
      }

      const actions = new Set<RBACAction>();

      // 🔑 收集所有权限源（角色权限+直接权限），取并集
      // 需要检查所有匹配的权限记录，因为同一个资源可能有多个权限记录

      // 1. 收集"所有资源"的权限（可能有多个记录）
      const allResourcePerms = userPermissions.detail_permissions.filter(
        perm =>
          perm.resource_type === resourceType &&
          (perm.resource_id === '0' || perm.resource_id === 0),
      );

      for (const perm of allResourcePerms) {
        perm.actions.forEach(action => {
          actions.add(action as RBACAction);
        });
      }

      // 2. 收集具体资源的权限（可能有多个记录）
      // 注意：resourceId可能是字符串或数字，需要统一比较
      const specificPerms = userPermissions.detail_permissions.filter(perm => {
        if (perm.resource_type !== resourceType) {
          return false;
        }
        // 统一转换为字符串进行比较
        const permResourceId = String(perm.resource_id);
        const targetResourceId = String(resourceId);
        return permResourceId === targetResourceId;
      });

      for (const perm of specificPerms) {
        perm.actions.forEach(action => {
          actions.add(action as RBACAction);
        });
      }

      return Array.from(actions);
    },

    // 获取资源的角色权限（不包括直接权限）
    getResourceRolePermissions: (
      resourceType: RBACResourceType,
      resourceId: string,
    ): RBACAction[] => {
      const { userPermissions } = get();
      if (!userPermissions || !userPermissions.detail_permissions) {
        return [];
      }

      const actions = new Set<RBACAction>();

      // 🔑 只收集角色权限（role_id !== 0），不包括直接权限（role_id === 0）

      // 1. 收集"所有资源"的角色权限（可能有多个记录）
      const allResourceRolePerms = userPermissions.detail_permissions.filter(
        perm => {
          const roleId = String(perm.role_id);
          return (
            perm.resource_type === resourceType &&
            (perm.resource_id === '0' || perm.resource_id === 0) &&
            roleId !== '0' // 只包括角色权限
          );
        },
      );

      for (const perm of allResourceRolePerms) {
        perm.actions.forEach(action => {
          actions.add(action as RBACAction);
        });
      }

      // 2. 收集具体资源的角色权限（可能有多个记录）
      // 注意：resourceId可能是字符串或数字，需要统一比较
      const specificRolePerms = userPermissions.detail_permissions.filter(
        perm => {
          const roleId = String(perm.role_id);
          if (perm.resource_type !== resourceType || roleId === '0') {
            return false; // 只包括角色权限
          }
          // 统一转换为字符串进行比较
          const permResourceId = String(perm.resource_id);
          const targetResourceId = String(resourceId);
          return permResourceId === targetResourceId;
        },
      );

      for (const perm of specificRolePerms) {
        perm.actions.forEach(action => {
          actions.add(action as RBACAction);
        });
      }

      return Array.from(actions);
    },

    // 批量检查权限
    batchCheckPermissions: (
      checks: Array<{
        resourceType: RBACResourceType;
        resourceId: string;
        action: RBACAction;
      }>,
    ): PermissionCheckResult[] => {
      const { checkPermission } = get();

      return checks.map(check => ({
        resourceType: check.resourceType,
        resourceId: check.resourceId,
        action: check.action,
        hasPermission: checkPermission(
          check.resourceType,
          check.resourceId,
          check.action,
        ),
      }));
    },

    // 设置加载状态
    setLoading: (loading: boolean) => {
      set({ loading });
    },

    // 设置错误
    setError: (error: string | null) => {
      set({ error, loading: false });
    },

    // 设置当前上下文
    setContext: (spaceId: string, userId: string) => {
      set({ currentSpaceId: spaceId, currentUserId: userId });
    },

    // 触发权限重新加载
    triggerReload: () => {
      set(state => ({ reloadFlag: state.reloadFlag + 1 }));
      console.log('[RBAC Store] 触发权限重新加载');
    },

    // 获取是否需要重新加载
    shouldReload: () => {
      return get().reloadFlag > 0;
    },
  }),
);

