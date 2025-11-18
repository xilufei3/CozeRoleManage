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

// 导出常量
export {
  RBACResourceType,
  RBACAction,
  RESOURCE_ACTIONS_MAP,
  RESOURCE_TYPE_NAMES,
  ACTION_NAMES_ZH,
  ACTION_NAMES_EN,
} from './constants';

// 导出类型
export type {
  Role,
  Permission,
  UserPermissions,
  PermissionCheckResult,
  ResourcePermissions,
} from './types';

// 导出Store
import { useRBACPermissionStore } from './rbac-store';

export { useRBACPermissionStore } from './rbac-store';

// 导出便捷方法
export const triggerRBACReload = () => {
  const store = useRBACPermissionStore.getState();
  store.triggerReload();
};

// 导出Hooks
export {
  useInitRBACPermissions,
  useRBACPermission,
  useRBACTypePermission,
  useRBACResourcePermissions,
  useRBACBatchPermissions,
  useRBACHasAnyPermission,
  useRBACHasAllPermissions,
  createLoadUserPermissions,
} from './use-rbac-permission';

// 导出调试工具
export { setupRBACDebug } from './debug';

