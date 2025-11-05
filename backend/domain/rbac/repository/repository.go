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

package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal/model"
)

// RoleRepository 角色仓储接口
type RoleRepository interface {
	CreateRole(ctx context.Context, role *model.RbacRole) error
	GetRoleByID(ctx context.Context, roleID int64) (*model.RbacRole, error)
	GetRolesBySpace(ctx context.Context, spaceID int64) ([]*model.RbacRole, error)
	UpdateRole(ctx context.Context, role *model.RbacRole) error
	DeleteRole(ctx context.Context, roleID int64) error
	CheckRoleExists(ctx context.Context, spaceID int64, roleName string) (bool, error)

	// 用户角色关联
	AssignRoleToUser(ctx context.Context, userRole *model.RbacUserRole) error
	RemoveRoleFromUser(ctx context.Context, spaceID, userID, roleID int64) error
	GetUserRoles(ctx context.Context, spaceID, userID int64) ([]*model.RbacUserRole, error)
	GetRoleUsers(ctx context.Context, roleID int64) ([]*model.RbacUserRole, error)
}

// PermissionRepository 权限仓储接口
type PermissionRepository interface {
	SetRolePermissions(ctx context.Context, permission *model.RbacRoleResourcePermission) error
	GetRolePermissions(ctx context.Context, roleID int64) ([]*model.RbacRoleResourcePermission, error)
	GetRolePermissionsByResourceType(ctx context.Context, roleID int64, resourceType int) ([]*model.RbacRoleResourcePermission, error)
	GetRolePermissionForResource(ctx context.Context, roleID int64, resourceType int, resourceID int64) (*model.RbacRoleResourcePermission, error)
	BatchGetRolePermissions(ctx context.Context, roleIDs []int64) ([]*model.RbacRoleResourcePermission, error)
	DeleteRolePermissions(ctx context.Context, roleID int64) error
	DeleteRolePermissionForResource(ctx context.Context, roleID int64, resourceType int, resourceID int64) error
	GetResourcePermissions(ctx context.Context, resourceType int, resourceID int64) ([]*model.RbacRoleResourcePermission, error)
}

// NewRoleRepo 创建角色仓储
func NewRoleRepo(db *gorm.DB) RoleRepository {
	return dal.NewRoleDAO(db)
}

// NewPermissionRepo 创建权限仓储
func NewPermissionRepo(db *gorm.DB) PermissionRepository {
	return dal.NewPermissionDAO(db)
}




