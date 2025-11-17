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

import { useMemo } from 'react';
import type { ResourceInfo } from '@coze-arch/bot-api/plugin_develop';
import {
  useRBACBatchPermissions,
  type ResourcePermissions,
} from '@coze-common/auth';

import { mapResTypeToRBACType } from './rbac-resource-type-mapper';

/**
 * 扩展ResourceInfo类型，添加权限信息
 */
export interface ResourceInfoWithPermissions extends ResourceInfo {
  rbac_permissions?: ResourcePermissions;
}

/**
 * 为资源列表注入RBAC权限信息
 * @param resources 资源列表
 * @returns 带权限信息的资源列表
 */
export const useInjectResourcePermissions = (
  resources: ResourceInfo[] | undefined,
): ResourceInfoWithPermissions[] => {
  // 转换资源类型：将 library_resource_list 的 res_type 转换为 RBAC 的 resource_type
  const resourcesWithRBACType = useMemo(() => {
    if (!resources) return [];

    return resources.map(resource => {
      const rbacType = mapResTypeToRBACType(resource.res_type);
      return {
        ...resource,
        // 添加转换后的RBAC资源类型
        rbac_resource_type: rbacType,
      };
    });
  }, [resources]);

  // 使用批量权限Hook获取所有资源的权限
  // 注意：传入的资源需要有正确的 res_type（RBAC类型）
  const resourcesForPermissionCheck = useMemo(() => {
    return resourcesWithRBACType.map(r => ({
      ...r,
      res_type: r.rbac_resource_type, // 使用RBAC类型进行权限检查
    }));
  }, [resourcesWithRBACType]);

  const permissionsMap = useRBACBatchPermissions(resourcesForPermissionCheck);

  return useMemo(() => {
    if (!resourcesWithRBACType || resourcesWithRBACType.length === 0) {
      return [];
    }

    // 为每个资源注入权限信息
    return resourcesWithRBACType.map(resource => {
      const resourceId = resource.res_id || resource.id || '';
      const permissions = permissionsMap.get(resourceId);

      return {
        ...resource,
        rbac_permissions: permissions || {},
      };
    });
  }, [resourcesWithRBACType, permissionsMap]);
};

/**
 * 过滤掉没有read权限的资源
 * @param resources 带权限信息的资源列表
 * @returns 过滤后的资源列表
 */
export const useFilterReadableResources = (
  resources: ResourceInfoWithPermissions[],
): ResourceInfoWithPermissions[] => {
  return useMemo(() => {
    // 如果没有加载权限信息，默认显示所有资源（降级策略）
    // 如果有权限信息，则只显示有read权限的资源
    const filtered = resources.filter(resource => {
      const permissions = resource.rbac_permissions;

      // 降级策略：如果没有权限信息（空对象或undefined），默认可见
      if (!permissions || Object.keys(permissions).length === 0) {
        console.log(
          '[RBAC Filter] 资源无权限信息，默认显示:',
          resource.res_id,
          resource.name,
        );
        return true;
      }

      // 如果有权限信息，检查read权限
      // read === true 或 read === undefined 都应该显示
      // 只有明确设置为 false 时才隐藏
      const hasReadPermission = permissions.read !== false;
      console.log(
        '[RBAC Filter] 资源权限检查:',
        resource.res_id,
        resource.name,
        'read权限:',
        permissions.read,
        '显示:',
        hasReadPermission,
      );
      return hasReadPermission;
    });

    console.log(
      '[RBAC Filter] 过滤结果:',
      `${filtered.length}/${resources.length}`,
    );
    return filtered;
  }, [resources]);
};

/**
 * 综合Hook：注入权限并过滤
 * @param resources 原始资源列表
 * @returns 带权限信息且已过滤的资源列表
 */
export const useResourcesWithPermissions = (
  resources: ResourceInfo[] | undefined,
): ResourceInfoWithPermissions[] => {
  const resourcesWithPermissions = useInjectResourcePermissions(resources);
  return useFilterReadableResources(resourcesWithPermissions);
};

