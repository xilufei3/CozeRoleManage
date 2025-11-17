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

import { useShallow } from 'zustand/react/shallow';

import {
  useRBACPermissionStore,
  RBACResourceType,
  RBACAction,
} from '@coze-common/auth';
import { useBotInfoStore } from '../store/bot-info';
import { getBotDetailIsReadonlyByState } from '../utils/get-read-only';
import { usePageRuntimeStore } from '../store/page-runtime';
import { useCollaborationStore } from '../store/collaboration';

/**
 * 检查是否应该只读（用于控制编辑功能）
 * 注意：这个 hook 只控制是否可编辑，不控制组件是否显示
 * 如果没有 read 权限，用户根本进不了这个页面，所以不需要检查 read 权限
 */
export const useBotDetailIsReadonly = (): boolean => {
  const { editable, isPreview } = usePageRuntimeStore(
    useShallow(state => ({
      editable: state.editable,
      isPreview: state.isPreview,
    })),
  );
  const editLockStatus = useCollaborationStore(state => state.editLockStatus);

  // 获取 botId 和 creator_id 用于 RBAC 权限检查
  const { botId, creator_id } = useBotInfoStore(
    useShallow(state => ({
      botId: state.botId,
      creator_id: state.creator_id,
    })),
  );

  // 从 RBAC store 获取当前用户ID（优先从 userPermissions.user_id 获取，其次从 currentUserId 获取）
  const userPermissions = useRBACPermissionStore(
    state => state.userPermissions,
  );
  const storeCurrentUserId = useRBACPermissionStore(
    state => state.currentUserId,
  );
  const currentUserId =
    userPermissions?.user_id || storeCurrentUserId || '';
  const isCreatedByUser = creator_id === currentUserId;

  // 获取权限检查方法
  const getResourceRolePermissions = useRBACPermissionStore(
    state => state.getResourceRolePermissions,
  );

  // 🔑 权限检查策略：
  // - 如果是用户自己创建的agent，默认有所有权限（可编辑）
  // - 如果不是用户创建的，只检查角色权限（不包括直接权限）
  let hasUpdatePermission: boolean | undefined;
  if (isCreatedByUser) {
    // 用户创建的agent：默认有所有权限（除了create）
    hasUpdatePermission = true;
  } else {
    // 非用户创建的agent：只检查角色权限
    const roleActions = getResourceRolePermissions(
      RBACResourceType.Agent,
      botId || '',
    );
    hasUpdatePermission = roleActions.includes(RBACAction.Update);
  }

  // 如果明确没有 update 权限，返回 true（只读）
  const isReadonlyByRBAC = hasUpdatePermission === false;

  // 综合判断：业务只读状态 || RBAC 权限检查
  const businessReadonly = getBotDetailIsReadonlyByState({
    editable,
    isPreview,
    editLockStatus,
  });

  return businessReadonly || isReadonlyByRBAC;
};
