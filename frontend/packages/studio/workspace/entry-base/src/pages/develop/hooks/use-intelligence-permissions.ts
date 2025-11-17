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
import type { IntelligenceData } from '@coze-arch/idl/intelligence_api';
import { IntelligenceType } from '@coze-arch/idl/intelligence_api';
import {
  useRBACBatchPermissions,
  useRBACPermissionStore,
  type ResourcePermissions,
  RBACResourceType,
  RBACAction,
  RESOURCE_ACTIONS_MAP,
} from '@coze-common/auth';
import { useUserInfo } from '@coze-foundation/account-adapter';

/**
 * 扩展IntelligenceData类型，添加权限信息
 */
export interface IntelligenceDataWithPermissions extends IntelligenceData {
  rbac_permissions?: ResourcePermissions;
}

/**
 * 为Intelligence列表注入RBAC权限信息并过滤无read权限的Agent
 * @param intelligences Intelligence列表
 * @returns 带权限信息且已过滤的Intelligence列表
 */
export const useIntelligencesWithPermissions = (
  intelligences: IntelligenceData[] | undefined,
): IntelligenceDataWithPermissions[] => {
  // 获取当前用户ID
  const currentUser = useUserInfo();
  const currentUserId = currentUser?.user_id_str || '';

  // 获取权限store的方法
  const getResourceRolePermissions = useRBACPermissionStore(
    state => state.getResourceRolePermissions,
  );

  // 只处理Agent类型（IntelligenceType.Bot = 1）
  const agentsForPermissionCheck = useMemo(() => {
    if (!intelligences) return [];

    return intelligences
      .filter(item => item.type === IntelligenceType.Bot)
      .map(item => ({
        res_id: item.basic_info?.id || '',
        res_type: RBACResourceType.Agent, // Agent的RBAC类型是4
        id: item.basic_info?.id || '',
      }));
  }, [intelligences]);

  // 批量获取权限（包含角色权限和直接权限）
  const permissionsMap = useRBACBatchPermissions(agentsForPermissionCheck);

  // 注入权限并过滤
  return useMemo(() => {
    if (!intelligences) return [];

    return intelligences.filter(item => {
      // 只对Agent进行权限检查
      if (item.type !== IntelligenceType.Bot) {
        // 非Agent类型（如Project）直接显示
        return true;
      }

      const agentId = item.basic_info?.id || '';
      const permissions = permissionsMap.get(agentId);

      // 降级策略：如果没有权限信息，默认显示
      if (!permissions || Object.keys(permissions).length === 0) {
        console.log(
          '[Agent RBAC Filter] 资源无权限信息，默认显示:',
          agentId,
          item.basic_info?.name,
        );
        return true;
      }

      // 检查read权限
      const hasReadPermission = permissions.read !== false;

      console.log(
        `[Agent Action] 资源: ${agentId} "${item.basic_info?.name}"`,
        '\n  权限对象:',
        permissions,
        '\n  read权限:',
        permissions.read,
        '\n  显示:',
        hasReadPermission,
      );

      return hasReadPermission;
    }).map(item => {
      // 为Agent注入权限信息
      if (item.type === IntelligenceType.Bot) {
        const agentId = item.basic_info?.id || '';
        // 获取资源创建者ID：优先从basic_info.owner_id获取，其次从owner_info.user_id获取
        const ownerId =
          item.basic_info?.owner_id || item.owner_info?.user_id || '';
        const isCreatedByUser = ownerId === currentUserId;

        let permissions = permissionsMap.get(agentId) || {};

        // 🔑 权限调整策略：
        // - 如果是用户自己创建的agent，默认有所有权限（除了create）
        // - 如果不是用户创建的，只使用角色权限（不包括直接权限）
        if (isCreatedByUser) {
          // 用户创建的agent：显示所有支持的权限（除了create）
          const allActions = RESOURCE_ACTIONS_MAP[RBACResourceType.Agent] || [];
          const fullPermissions: ResourcePermissions = {};
          allActions.forEach(action => {
            if (action !== RBACAction.Create) {
              fullPermissions[action] = true;
            }
          });
          permissions = fullPermissions;
        } else {
          // 非用户创建的agent：只使用角色权限（不包括直接权限）
          const roleActions = getResourceRolePermissions(
            RBACResourceType.Agent,
            agentId,
          );
          const rolePermissions: ResourcePermissions = {};
          const possibleActions = RESOURCE_ACTIONS_MAP[RBACResourceType.Agent] || [];
          possibleActions.forEach(action => {
            rolePermissions[action] = roleActions.includes(action);
          });
          permissions = rolePermissions;
        }

        return {
          ...item,
          rbac_permissions: permissions,
        } as IntelligenceDataWithPermissions;
      }
      return item as IntelligenceDataWithPermissions;
    });
  }, [intelligences, permissionsMap, currentUserId, getResourceRolePermissions]);
};

