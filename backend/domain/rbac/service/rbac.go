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

package service

import (
	"context"

	"github.com/coze-dev/coze-studio/backend/domain/rbac/entity"
)

// RBACService RBAC服务接口
type RBACService interface {
	// ---------- 角色管理 ----------

	// CreateRole 创建角色
	CreateRole(ctx context.Context, req *CreateRoleRequest) (*entity.Role, error)

	// UpdateRole 更新角色信息
	UpdateRole(ctx context.Context, req *UpdateRoleRequest) error

	// DeleteRole 删除角色
	DeleteRole(ctx context.Context, roleID int64) error

	// GetRole 获取角色详情
	GetRole(ctx context.Context, roleID int64) (*entity.Role, error)

	// ListRoles 查询空间下的角色列表
	ListRoles(ctx context.Context, spaceID int64) ([]*entity.Role, error)

	// ---------- 用户角色分配 ----------

	// AssignRoleToUser 为用户分配角色
	AssignRoleToUser(ctx context.Context, req *AssignRoleRequest) error

	// RemoveUserRole 移除用户的角色
	RemoveUserRole(ctx context.Context, spaceID, userID, roleID int64) error

	// GetUserRoles 获取用户的角色列表
	GetUserRoles(ctx context.Context, spaceID, userID int64) ([]*entity.Role, error)

	// GetUserPermissions 获取用户的所有权限（聚合）
	GetUserPermissions(ctx context.Context, spaceID, userID int64) (*entity.UserPermissions, error)

	// ---------- 权限管理 ----------

	// SetRolePermissions 批量设置角色权限（覆盖）
	SetRolePermissions(ctx context.Context, req *SetRolePermissionsRequest) error

	// SetRoleResourcePermission 设置角色对单个资源的权限
	SetRoleResourcePermission(ctx context.Context, req *SetResourcePermissionRequest) error

	// GetRolePermissions 获取角色的权限矩阵
	GetRolePermissions(ctx context.Context, roleID int64, resourceType *entity.ResourceType) ([]*entity.Permission, error)

	// GetResourcePermissions 获取资源的权限详情（所有角色对该资源的权限）
	GetResourcePermissions(ctx context.Context, resourceType entity.ResourceType, resourceID int64) ([]*RolePermissionInfo, error)

	// ---------- 权限检查 ----------

	// CheckPermission 检查用户是否有权限执行某操作
	CheckPermission(ctx context.Context, check *entity.PermissionCheck) (bool, error)

	// BatchCheckPermissions 批量检查权限
	BatchCheckPermissions(ctx context.Context, checks []*entity.PermissionCheck) (map[string]bool, error)

	// GetAccessibleResources 获取用户可访问的资源列表（按权限过滤）
	GetAccessibleResources(ctx context.Context, req *GetAccessibleResourcesRequest) ([]int64, error)

	// ---------- 资源查询 ----------

	// GetSpaceAgents 获取空间下的 Agent 列表
	GetSpaceAgents(ctx context.Context, spaceID int64) ([]*AgentBasicInfo, error)

	// ---------- 资源创建辅助 ----------

	// AssignCreatorPermissions 给资源创建者分配所有权限
	// 用于在创建资源时自动授予创建者完整权限
	AssignCreatorPermissions(ctx context.Context, userID string, spaceID int64, resourceType int, resourceID string) error

	// CopyResourcePermissions 复制资源的权限到新资源
	// 用于在复制资源时保持原有的权限设置
	CopyResourcePermissions(ctx context.Context, sourceResourceType int, sourceResourceID string, targetResourceID string, spaceID int64) error
}

// ---------- 请求/响应结构体 ----------

// CreateRoleRequest 创建角色请求
type CreateRoleRequest struct {
	SpaceID     int64  `json:"space_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatorID   int64  `json:"creator_id"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	RoleID      int64  `json:"role_id"`
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// AssignRoleRequest 分配角色请求
type AssignRoleRequest struct {
	SpaceID    int64 `json:"space_id"`
	UserID     int64 `json:"user_id"`
	RoleID     int64 `json:"role_id"`
	AssignedBy int64 `json:"assigned_by"`
}

// SetRolePermissionsRequest 批量设置角色权限请求
type SetRolePermissionsRequest struct {
	RoleID      int64                        `json:"role_id"`
	Permissions []*ResourcePermissionSetting `json:"permissions"`
}

// ResourcePermissionSetting 资源权限设置
type ResourcePermissionSetting struct {
	ResourceType entity.ResourceType `json:"resource_type"`
	ResourceID   int64               `json:"resource_id"` // 0表示所有资源
	Actions      []string            `json:"actions"`
}

// SetResourcePermissionRequest 设置单个资源权限请求
type SetResourcePermissionRequest struct {
	RoleID       int64               `json:"role_id"`
	ResourceType entity.ResourceType `json:"resource_type"`
	ResourceID   int64               `json:"resource_id"`
	Actions      []string            `json:"actions"`
}

// GetAccessibleResourcesRequest 获取可访问资源请求
type GetAccessibleResourcesRequest struct {
	UserID       int64               `json:"user_id"`
	SpaceID      int64               `json:"space_id"`
	ResourceType entity.ResourceType `json:"resource_type"`
	Action       entity.Action       `json:"action"`
}

// RolePermissionInfo 角色权限信息（用于资源权限详情）
type RolePermissionInfo struct {
	RoleID      int64    `json:"role_id"`
	RoleName    string   `json:"role_name"`
	Permissions []string `json:"permissions"`
}

// AgentBasicInfo Agent 基本信息
type AgentBasicInfo struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatorID   int64  `json:"creator_id"`
}




