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

import type { RBACResourceType, RBACAction } from './constants';

/**
 * 角色信息
 */
export interface Role {
  id: string;
  space_id: string;
  name: string;
  description: string;
  is_system: boolean;
  creator_id: string;
  created_at: number;
  updated_at: number;
}

/**
 * 权限信息
 */
export interface Permission {
  id: string;
  role_id: string;
  resource_type: number;
  resource_id: string | number;
  actions: string[];
  created_at: number;
  updated_at: number;
}

/**
 * 用户权限
 */
export interface UserPermissions {
  user_id: string;
  space_id: string;
  roles: Role[];
  permissions: Record<number, string[]>; // resource_type -> actions
  detail_permissions?: Permission[]; // 详细权限列表（包含资源ID）
}

/**
 * 权限检查结果
 * hasPermission: true=有权限, false=无权限, undefined=权限未加载（降级策略：允许操作）
 */
export interface PermissionCheckResult {
  resourceType: RBACResourceType;
  resourceId: string;
  action: RBACAction;
  hasPermission: boolean | undefined;
}

/**
 * 资源权限信息（用于注入到资源对象中）
 */
export interface ResourcePermissions {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
  execute?: boolean;
  publish?: boolean;
  install?: boolean;
  manage?: boolean;
  query?: boolean;
}

