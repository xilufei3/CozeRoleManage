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

import { useEffect, useMemo } from 'react';

import { RBACResourceType, RBACAction, RESOURCE_ACTIONS_MAP } from './constants';
import { useRBACPermissionStore } from './rbac-store';
import type { ResourcePermissions } from './types';

/**
 * 从后端加载用户权限
 * 注意：此函数需要传入axios实例，因为在common包中无法直接导入@coze-arch/bot-http
 */
export const createLoadUserPermissions = (axiosInstance: {
  get: (url: string, config?: unknown) => Promise<{ data: unknown }>;
}) => {
  return async (userId: string, spaceId: string) => {
    try {
      const res = await axiosInstance.get(
        `/api/rbac/users/${userId}/permissions`,
        {
          params: { space_id: spaceId },
        },
      );

      // axios拦截器可能已经解包了响应
      // 检查res是否已经是数据本身（有user_id字段）或者需要从res.data获取
      if (res && typeof res === 'object' && 'user_id' in res) {
        console.log('[RBAC] 权限数据（已解包）:', res);
        return res;
      }

      console.log('[RBAC] 权限数据（从data获取）:', res.data);
      return res.data;
    } catch (error) {
      console.error('[RBAC] 加载用户权限失败:', error);
      return null;
    }
  };
};

/**
 * 初始化RBAC权限（在用户登录或切换空间时调用）
 * @param userId 用户ID
 * @param spaceId 空间ID
 * @param axiosInstance axios实例（从@coze-arch/bot-http导入）
 */
export const useInitRBACPermissions = (
  userId: string,
  spaceId: string,
  axiosInstance?: {
    get: (url: string, config?: unknown) => Promise<{ data: unknown }>;
  },
) => {
  const { setUserPermissions, setLoading, setError, setContext } =
    useRBACPermissionStore();
  const reloadFlag = useRBACPermissionStore(state => state.reloadFlag);

  useEffect(() => {
    // 如果没有必要的参数，直接返回
    if (!userId || !spaceId || !axiosInstance) {
      console.log('[RBAC] 等待用户信息和空间信息...');
      return;
    }

    let isMounted = true; // 防止组件卸载后更新状态

    const loadPermissions = async () => {
      try {
        console.log('[RBAC] 开始加载权限...', { userId, spaceId, reloadFlag });

        if (!isMounted) return;
        setLoading(true);
        setContext(spaceId, userId);

        const loadUserPermissions = createLoadUserPermissions(axiosInstance);
        const permissions = await loadUserPermissions(userId, spaceId);

        if (!isMounted) return;

        if (permissions && typeof permissions === 'object') {
          // 类型断言，因为从API返回的数据符合UserPermissions接口
          setUserPermissions(permissions as import('./types').UserPermissions);
          console.log('[RBAC] 权限加载成功', permissions);
        } else {
          setError('加载权限失败');
          console.warn('[RBAC] 权限加载失败，将使用降级模式');
        }
      } catch (error) {
        console.error('[RBAC] 权限加载异常:', error);
        if (isMounted) {
          setError('权限加载异常');
        }
      }
    };

    loadPermissions();

    return () => {
      isMounted = false;
    };
    // 注意：不要把 axiosInstance 放在依赖数组中，它是稳定的引用
    // reloadFlag 变化时会触发重新加载
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, spaceId, reloadFlag]);

  // 🔑 监听 reloadFlag 变化时，主动重新拉取权限
  useEffect(() => {
    if (!userId || !spaceId || !axiosInstance) return;
    const loadUserPermissions = createLoadUserPermissions(axiosInstance);
    let isMounted = true;
    (async () => {
      setLoading(true);
      const permissions = await loadUserPermissions(userId, spaceId);
      if (!isMounted) return;
      if (permissions && typeof permissions === 'object') {
        setUserPermissions(permissions as import('./types').UserPermissions);
      }
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [reloadFlag]);
};

/**
 * 检查单个权限
 * @param resourceType 资源类型
 * @param resourceId 资源ID（'0'表示所有资源）
 * @param action 操作类型
 * @returns 权限状态：true=有权限, false=无权限, undefined=权限未加载（降级策略：允许操作）
 */
export const useRBACPermission = (
  resourceType: RBACResourceType,
  resourceId: string,
  action: RBACAction,
): boolean | undefined => {
  return useRBACPermissionStore(state =>
    state.checkPermission(resourceType, resourceId, action),
  );
};

/**
 * 检查资源类型级别的权限（用于create等不需要具体资源ID的操作）
 * @param resourceType 资源类型
 * @param action 操作类型
 * @returns 权限状态：true=有权限, false=无权限, undefined=权限未加载（降级策略：允许操作）
 */
export const useRBACTypePermission = (
  resourceType: RBACResourceType,
  action: RBACAction,
): boolean | undefined => {
  return useRBACPermissionStore(state =>
    state.checkPermission(resourceType, '0', action),
  );
};

/**
 * 获取资源的所有权限（返回权限对象）
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @returns 资源权限对象
 */
export const useRBACResourcePermissions = (
  resourceType: RBACResourceType,
  resourceId: string,
): ResourcePermissions => {
  const getResourcePermissions = useRBACPermissionStore(
    state => state.getResourcePermissions,
  );

  return useMemo(() => {
    const actions = getResourcePermissions(resourceType, resourceId);
    const permissions: ResourcePermissions = {};

    // 根据资源类型获取所有可能的操作
    const possibleActions = RESOURCE_ACTIONS_MAP[resourceType] || [];

    // 为每个可能的操作设置权限状态
    possibleActions.forEach(action => {
      permissions[action] = actions.includes(action);
    });

    return permissions;
  }, [getResourcePermissions, resourceType, resourceId]);
};

/**
 * 批量获取资源列表的权限信息
 * @param resources 资源列表
 * @returns 资源权限映射表 (resourceId -> ResourcePermissions)
 */
export const useRBACBatchPermissions = <
  T extends { res_id?: string; id?: string; res_type?: number },
>(
  resources: T[],
): Map<string, ResourcePermissions> => {
  const getResourcePermissions = useRBACPermissionStore(
    state => state.getResourcePermissions,
  );
  const userPermissions = useRBACPermissionStore(
    state => state.userPermissions,
  );

  return useMemo(() => {
    const permissionsMap = new Map<string, ResourcePermissions>();

    // 降级策略1：如果没有加载用户权限，返回空Map（显示所有资源）
    if (!userPermissions) {
      console.log(
        '[RBAC Batch] 权限未加载，返回空Map，将使用降级策略',
      );
      return permissionsMap;
    }

    // 降级策略2：如果用户没有任何角色，给予完整权限（类似Owner）
    if (
      !userPermissions.roles ||
      userPermissions.roles.length === 0 ||
      !userPermissions.detail_permissions ||
      userPermissions.detail_permissions.length === 0
    ) {
      console.warn(
        '[RBAC Batch] 用户没有分配角色或权限为空，使用降级策略：授予完整权限',
      );
      // 返回空Map，这样所有资源的 rbac_permissions 都是空对象，会被默认显示
      return permissionsMap;
    }

    console.log(
      '[RBAC Batch] 为',
      resources.length,
      '个资源批量检查权限',
    );

    resources.forEach(resource => {
      const resourceId = resource.res_id || resource.id;
      const resourceType = resource.res_type as RBACResourceType;

      if (!resourceId || !resourceType) {
        return;
      }

      let actions = getResourcePermissions(resourceType, resourceId);

      const currentUserId = (userPermissions as any)?.user_id;
      const isSelfCreator =
        currentUserId && String((resource as any)?.creator_id) === String(currentUserId);
      if (isSelfCreator) {
        const possibleActions = RESOURCE_ACTIONS_MAP[resourceType] || [];
        actions = Array.from(
          new Set([
            ...actions,
            ...possibleActions.filter(a => a !== RBACAction.Create),
          ]),
        );
      }

      const permissions: ResourcePermissions = {};

      // 根据资源类型获取所有可能的操作
      const possibleActions = RESOURCE_ACTIONS_MAP[resourceType] || [];

      // 为每个可能的操作设置权限状态
      possibleActions.forEach(action => {
        permissions[action] = actions.includes(action);
      });

      permissionsMap.set(resourceId, permissions);
    });

    return permissionsMap;
  }, [resources, getResourcePermissions, userPermissions]);
};

/**
 * 检查是否有任意一个权限
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @param actions 操作列表
 * @returns 是否有任意一个权限
 */
export const useRBACHasAnyPermission = (
  resourceType: RBACResourceType,
  resourceId: string,
  actions: RBACAction[],
): boolean => {
  const checkPermission = useRBACPermissionStore(
    state => state.checkPermission,
  );

  return useMemo(
    () =>
      actions.some(action =>
        checkPermission(resourceType, resourceId, action),
      ),
    [checkPermission, resourceType, resourceId, actions],
  );
};

/**
 * 检查是否有所有权限
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @param actions 操作列表
 * @returns 是否有所有权限
 */
export const useRBACHasAllPermissions = (
  resourceType: RBACResourceType,
  resourceId: string,
  actions: RBACAction[],
): boolean => {
  const checkPermission = useRBACPermissionStore(
    state => state.checkPermission,
  );

  return useMemo(
    () =>
      actions.every(action =>
        checkPermission(resourceType, resourceId, action),
      ),
    [checkPermission, resourceType, resourceId, actions],
  );
};

