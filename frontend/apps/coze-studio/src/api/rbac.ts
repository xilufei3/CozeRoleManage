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

import { axiosInstance } from '@coze-arch/bot-http';

const RBAC_API_PREFIX = '/api/rbac';

// 类型定义
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

export interface Permission {
  id: string;
  role_id: string;
  resource_type: number;
  resource_id: string;
  actions: string[];
  created_at: number;
  updated_at: number;
}

export interface RoleDetail extends Role {
  permissions: Permission[];
}

export interface ResourcePermission {
  resource_type: number;
  resource_id: string;
  actions: string[];
}

export interface UserPermissions {
  user_id: string;
  space_id: string;
  roles: Role[];
  permissions: Record<number, string[]>; // resource_type -> actions
  detail_permissions?: Permission[]; // 详细权限列表（包含资源ID）
}

// ---------- 角色管理 ----------

// 创建角色
export const createRole = async (params: {
  space_id: string;
  name: string;
  description?: string;
}): Promise<Role> => {
  const res = await axiosInstance.post(`${RBAC_API_PREFIX}/roles`, params);
  return res.data;
};

// 更新角色
export const updateRole = async (
  roleId: string,
  params: {
    name?: string;
    description?: string;
  },
): Promise<void> => {
  await axiosInstance.put(`${RBAC_API_PREFIX}/roles/${roleId}`, params);
};

// 删除角色
export const deleteRole = async (roleId: string): Promise<void> => {
  await axiosInstance.delete(`${RBAC_API_PREFIX}/roles/${roleId}`);
};

// 获取角色详情
export const getRole = async (roleId: string): Promise<RoleDetail> => {
  const res = await axiosInstance.get(`${RBAC_API_PREFIX}/roles/${roleId}`);
  return res.data;
};

// 查询角色列表
export const listRoles = async (
  spaceId: string,
): Promise<{ roles: Role[]; total: number }> => {
  const res = await axiosInstance.get(`${RBAC_API_PREFIX}/roles`, {
    params: { space_id: spaceId },
  });
  return res.data;
};

// ---------- 权限管理 ----------

// 批量设置角色权限
export const setRolePermissions = async (
  roleId: string,
  params: { permissions: ResourcePermission[] },
): Promise<void> => {
  await axiosInstance.post(
    `${RBAC_API_PREFIX}/roles/${roleId}/permissions/batch`,
    params,
  );
};

// 设置单个资源权限
export const setRoleResourcePermission = async (
  roleId: string,
  resourceId: string,
  params: {
    resource_type: number;
    actions: string[];
  },
): Promise<void> => {
  await axiosInstance.put(
    `${RBAC_API_PREFIX}/roles/${roleId}/resources/${resourceId}/permissions`,
    params,
  );
};

// 获取角色权限矩阵
export const getRolePermissions = async (
  roleId: string,
  resourceType?: number,
): Promise<{ permissions: Permission[] }> => {
  const res = await axiosInstance.get(
    `${RBAC_API_PREFIX}/roles/${roleId}/permissions/matrix`,
    {
      params: resourceType !== undefined ? { resource_type: resourceType } : {},
    },
  );
  return res.data;
};

// 获取资源权限详情
export const getResourcePermissions = async (
  resourceId: string,
  resourceType: number,
): Promise<{
  permissions: Array<{
    role_id: string;
    role_name: string;
    actions: string[];
  }>;
}> => {
  const res = await axiosInstance.get(
    `${RBAC_API_PREFIX}/resources/${resourceId}/permissions`,
    {
      params: { resource_type: resourceType },
    },
  );
  return res.data;
};

// ---------- 用户角色分配 ----------

// 为用户分配角色
export const assignRoleToUser = async (
  userId: string,
  params: {
    space_id: string;
    role_id: string;
  },
): Promise<void> => {
  await axiosInstance.post(`${RBAC_API_PREFIX}/users/${userId}/roles`, params);
};

// 移除用户角色
export const removeUserRole = async (
  userId: string,
  roleId: string,
  spaceId: string,
): Promise<void> => {
  await axiosInstance.delete(
    `${RBAC_API_PREFIX}/users/${userId}/roles/${roleId}`,
    {
      params: { space_id: spaceId },
    },
  );
};

// 获取用户角色列表
export const getUserRoles = async (
  userId: string,
  spaceId: string,
): Promise<{ roles: Role[] }> => {
  const res = await axiosInstance.get(
    `${RBAC_API_PREFIX}/users/${userId}/roles`,
    {
      params: { space_id: spaceId },
    },
  );
  return res.data;
};

// 获取用户权限
export const getUserPermissions = async (
  userId: string,
  spaceId: string,
): Promise<UserPermissions> => {
  const res = await axiosInstance.get(
    `${RBAC_API_PREFIX}/users/${userId}/permissions`,
    {
      params: { space_id: spaceId },
    },
  );
  return res.data;
};

// ---------- 权限检查 ----------

// 单个权限检查
export const checkPermission = async (params: {
  user_id: string;
  space_id: string;
  resource_type: number;
  resource_id: string;
  action: string;
}): Promise<{ has_permission: boolean }> => {
  const res = await axiosInstance.post(`${RBAC_API_PREFIX}/check`, params);
  return res.data;
};

// 批量权限检查
export const batchCheckPermissions = async (params: {
  user_id: string;
  space_id: string;
  checks: Array<{
    resource_type: number;
    resource_id: string;
    actions: string[];
  }>;
}): Promise<{ results: Record<string, boolean> }> => {
  const res = await axiosInstance.post(
    `${RBAC_API_PREFIX}/batch-check`,
    params,
  );
  return res.data;
};

// ---------- 资源管理 ----------

// 获取空间下的资源列表（用于权限分配）
export interface SpaceResource {
  res_id?: string;
  id?: string;
  name?: string;
  res_type?: number;
  res_sub_type?: number;
  icon?: string;
  creator_name?: string;
  creator_avatar?: string;
  creator_id?: string; // 创建者ID
}

export const getSpaceResources = async (
  spaceId: string,
  resTypeFilter?: number[],
): Promise<{
  resource_list: SpaceResource[];
  has_more: boolean;
  cursor?: string;
}> => {
  try {
    const res = await axiosInstance.post(
      '/api/plugin_api/library_resource_list',
      {
        space_id: spaceId,
        res_type_filter: resTypeFilter,
        size: 100,
      },
    );

    // axios 拦截器已经处理过响应，res 就是实际数据
    // 如果 res 有 resource_list，直接返回 res
    if (res && 'resource_list' in res) {
      return {
        resource_list: (res as any).resource_list || [],
        has_more: (res as any).has_more || false,
        cursor: (res as any).cursor,
      };
    }

    // 否则返回 res.data
    return res.data || { resource_list: [], has_more: false };
  } catch (error) {
    console.error('[RBAC] 加载资源列表失败:', error);
    // 如果出错，返回空数据而不是抛出错误
    return { resource_list: [], has_more: false };
  }
};

// Agent 资源接口
export interface AgentResource {
  id?: string;
  name?: string;
  description?: string;
  creator_id?: string; // 创建者ID
}

// 获取空间下的 Agent 列表（返回所有Agent，不进行权限过滤）
export const getSpaceAgents = async (
  spaceId: string,
): Promise<{
  agents: AgentResource[];
  total?: number;
}> => {
  try {
    const res = await axiosInstance.get('/api/rbac/resources/agents', {
      params: { space_id: spaceId },
    });

    // 后端返回结构: { code: 0, msg: "", data: { agents: [...], total: number } }
    // axios 拦截器可能已经处理过响应，需要检查实际结构
    let responseData;
    if (res.data?.data) {
      // 标准结构：{ code: 0, data: { agents: [...], total: number } }
      responseData = res.data.data;
    } else if (res.data?.agents) {
      // 直接返回数据：{ agents: [...], total: number }
      responseData = res.data;
    } else {
      // 可能是拦截器处理后的结构
      responseData = res.data;
    }

    const agents = (responseData?.agents || []).map((agent: any) => ({
      id: String(agent.id || agent.ID || ''),
      name: agent.name || agent.Name || '未命名 Agent',
      description: agent.description || agent.Description || '',
      creator_id: agent.creator_id || agent.CreatorID || agent.creatorId || '',
    }));

    return {
      agents,
      total: responseData?.total || responseData?.Total || agents.length,
    };
  } catch (error) {
    console.error('[RBAC] 加载 Agent 列表失败:', error);
    return { agents: [], total: 0 };
  }
};
