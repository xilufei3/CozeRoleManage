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

package rbac

// ========== 角色管理 API ==========

// CreateRoleRequest 创建角色请求
type CreateRoleRequest struct {
	SpaceID     int64  `json:"space_id,string" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// CreateRoleResponse 创建角色响应
type CreateRoleResponse struct {
	Code int64     `json:"code"`
	Msg  string    `json:"msg"`
	Data *RoleInfo `json:"data"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	RoleID      int64  `path:"roleId,string" binding:"required"`
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// UpdateRoleResponse 更新角色响应
type UpdateRoleResponse struct {
	Code int64  `json:"code"`
	Msg  string `json:"msg"`
}

// DeleteRoleRequest 删除角色请求
type DeleteRoleRequest struct {
	RoleID int64 `path:"roleId,string" binding:"required"`
}

// DeleteRoleResponse 删除角色响应
type DeleteRoleResponse struct {
	Code int64  `json:"code"`
	Msg  string `json:"msg"`
}

// GetRoleRequest 获取角色详情请求
type GetRoleRequest struct {
	RoleID int64 `path:"roleId,string" binding:"required"`
}

// GetRoleResponse 获取角色详情响应
type GetRoleResponse struct {
	Code int64           `json:"code"`
	Msg  string          `json:"msg"`
	Data *RoleDetailInfo `json:"data"`
}

// ListRolesRequest 查询角色列表请求
type ListRolesRequest struct {
	SpaceID int64 `query:"space_id,string" binding:"required"`
}

// ListRolesResponse 查询角色列表响应
type ListRolesResponse struct {
	Code int64          `json:"code"`
	Msg  string         `json:"msg"`
	Data *ListRolesData `json:"data"`
}

// ListRolesData 角色列表数据
type ListRolesData struct {
	Roles []*RoleInfo `json:"roles"`
	Total int         `json:"total"`
}

// ========== 用户角色分配 API ==========

// AssignRoleRequest 分配角色请求
type AssignRoleRequest struct {
	UserID  int64 `path:"userId,string" binding:"required"`
	SpaceID int64 `json:"space_id,string" binding:"required"`
	RoleID  int64 `json:"role_id,string" binding:"required"`
}

// AssignRoleResponse 分配角色响应
type AssignRoleResponse struct {
	Code int64  `json:"code"`
	Msg  string `json:"msg"`
}

// RemoveUserRoleRequest 移除用户角色请求
type RemoveUserRoleRequest struct {
	UserID  int64 `path:"userId,string" binding:"required"`
	RoleID  int64 `path:"roleId,string" binding:"required"`
	SpaceID int64 `query:"space_id,string" binding:"required"`
}

// RemoveUserRoleResponse 移除用户角色响应
type RemoveUserRoleResponse struct {
	Code int64  `json:"code"`
	Msg  string `json:"msg"`
}

// GetUserRolesRequest 获取用户角色列表请求
type GetUserRolesRequest struct {
	UserID  int64 `path:"userId,string" binding:"required"`
	SpaceID int64 `query:"space_id,string" binding:"required"`
}

// GetUserRolesResponse 获取用户角色列表响应
type GetUserRolesResponse struct {
	Code int64          `json:"code"`
	Msg  string         `json:"msg"`
	Data *UserRolesData `json:"data"`
}

// UserRolesData 用户角色数据
type UserRolesData struct {
	Roles []*RoleInfo `json:"roles"`
}

// GetUserPermissionsRequest 获取用户权限请求
type GetUserPermissionsRequest struct {
	UserID  int64 `path:"userId,string" binding:"required"`
	SpaceID int64 `query:"space_id,string" binding:"required"`
}

// GetUserPermissionsResponse 获取用户权限响应
type GetUserPermissionsResponse struct {
	Code int64                `json:"code"`
	Msg  string               `json:"msg"`
	Data *UserPermissionsData `json:"data"`
}

// UserPermissionsData 用户权限数据
type UserPermissionsData struct {
	UserID      int64                       `json:"user_id,string"`
	SpaceID     int64                       `json:"space_id,string"`
	Roles       []*RoleInfo                 `json:"roles"`
	Permissions map[int][]string            `json:"permissions"` // resourceType -> actions
}

// ========== 权限管理 API ==========

// SetRolePermissionsRequest 批量设置角色权限请求
type SetRolePermissionsRequest struct {
	RoleID      int64                         `path:"roleId,string" binding:"required"`
	Permissions []*ResourcePermissionSetting  `json:"permissions" binding:"required"`
}

// ResourcePermissionSetting 资源权限设置
type ResourcePermissionSetting struct {
	ResourceType int      `json:"resource_type" binding:"required"`
	ResourceID   int64    `json:"resource_id,string"`
	Actions      []string `json:"actions" binding:"required"`
}

// SetRolePermissionsResponse 批量设置角色权限响应
type SetRolePermissionsResponse struct {
	Code int64  `json:"code"`
	Msg  string `json:"msg"`
}

// SetRoleResourcePermissionRequest 设置角色对单个资源的权限请求
type SetRoleResourcePermissionRequest struct {
	RoleID       int64    `path:"roleId,string" binding:"required"`
	ResourceID   int64    `path:"resourceId,string" binding:"required"`
	ResourceType int      `json:"resource_type" binding:"required"`
	Actions      []string `json:"actions" binding:"required"`
}

// SetRoleResourcePermissionResponse 设置角色对单个资源的权限响应
type SetRoleResourcePermissionResponse struct {
	Code int64  `json:"code"`
	Msg  string `json:"msg"`
}

// GetRolePermissionsRequest 获取角色权限矩阵请求
type GetRolePermissionsRequest struct {
	RoleID       int64  `path:"roleId,string" binding:"required"`
	ResourceType *int   `query:"resource_type,omitempty"`
}

// GetRolePermissionsResponse 获取角色权限矩阵响应
type GetRolePermissionsResponse struct {
	Code int64                `json:"code"`
	Msg  string               `json:"msg"`
	Data *RolePermissionsData `json:"data"`
}

// RolePermissionsData 角色权限数据
type RolePermissionsData struct {
	Permissions []*PermissionInfo `json:"permissions"`
}

// GetResourcePermissionsRequest 获取资源权限详情请求
type GetResourcePermissionsRequest struct {
	ResourceID   int64 `path:"resourceId,string" binding:"required"`
	ResourceType int   `query:"resource_type" binding:"required"`
}

// GetResourcePermissionsResponse 获取资源权限详情响应
type GetResourcePermissionsResponse struct {
	Code int64                    `json:"code"`
	Msg  string                   `json:"msg"`
	Data *ResourcePermissionsData `json:"data"`
}

// ResourcePermissionsData 资源权限数据
type ResourcePermissionsData struct {
	ResourceType int                    `json:"resource_type"`
	ResourceID   int64                  `json:"resource_id,string"`
	Permissions  []*RolePermissionInfo  `json:"permissions"`
}

// RolePermissionInfo 角色权限信息
type RolePermissionInfo struct {
	RoleID   int64    `json:"role_id,string"`
	RoleName string   `json:"role_name"`
	Actions  []string `json:"actions"`
}

// ========== 权限检查 API ==========

// CheckPermissionRequest 单个权限检查请求
type CheckPermissionRequest struct {
	UserID       int64  `json:"user_id,string" binding:"required"`
	SpaceID      int64  `json:"space_id,string" binding:"required"`
	ResourceType int    `json:"resource_type" binding:"required"`
	ResourceID   int64  `json:"resource_id,string"`
	Action       string `json:"action" binding:"required"`
}

// CheckPermissionResponse 单个权限检查响应
type CheckPermissionResponse struct {
	Code int64                  `json:"code"`
	Msg  string                 `json:"msg"`
	Data *PermissionCheckResult `json:"data"`
}

// PermissionCheckResult 权限检查结果
type PermissionCheckResult struct {
	HasPermission bool `json:"has_permission"`
}

// BatchCheckPermissionsRequest 批量权限检查请求
type BatchCheckPermissionsRequest struct {
	UserID  int64                   `json:"user_id,string" binding:"required"`
	SpaceID int64                   `json:"space_id,string" binding:"required"`
	Checks  []*PermissionCheckItem  `json:"checks" binding:"required"`
}

// PermissionCheckItem 权限检查项
type PermissionCheckItem struct {
	ResourceType int      `json:"resource_type"`
	ResourceID   int64    `json:"resource_id,string"`
	Actions      []string `json:"actions"`
}

// BatchCheckPermissionsResponse 批量权限检查响应
type BatchCheckPermissionsResponse struct {
	Code int64                       `json:"code"`
	Msg  string                      `json:"msg"`
	Data *BatchPermissionCheckResult `json:"data"`
}

// BatchPermissionCheckResult 批量权限检查结果
type BatchPermissionCheckResult struct {
	Results map[string]bool `json:"results"` // key: "{resourceType}_{resourceID}_{action}"
}

// ========== 数据结构 ==========

// RoleInfo 角色基本信息
type RoleInfo struct {
	ID          int64  `json:"id,string"`
	SpaceID     int64  `json:"space_id,string"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsSystem    bool   `json:"is_system"`
	CreatorID   int64  `json:"creator_id,string"`
	CreatedAt   int64  `json:"created_at"`
	UpdatedAt   int64  `json:"updated_at"`
}

// RoleDetailInfo 角色详细信息（包含权限）
type RoleDetailInfo struct {
	*RoleInfo
	Permissions []*PermissionInfo `json:"permissions"`
}

// PermissionInfo 权限信息
type PermissionInfo struct {
	ID           int64    `json:"id,string"`
	RoleID       int64    `json:"role_id,string"`
	ResourceType int      `json:"resource_type"`
	ResourceID   int64    `json:"resource_id,string"`
	Actions      []string `json:"actions"`
	CreatedAt    int64    `json:"created_at"`
	UpdatedAt    int64    `json:"updated_at"`
}


