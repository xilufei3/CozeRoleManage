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

package dal

import (
	"context"

	"gorm.io/gorm"

	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal/model"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal/query"
)

type PermissionDAO struct {
	query *query.Query
}

func NewPermissionDAO(db *gorm.DB) *PermissionDAO {
	return &PermissionDAO{
		query: query.Use(db),
	}
}

// CreatePermission 创建权限配置
func (dao *PermissionDAO) CreatePermission(ctx context.Context, permission *model.RbacRoleResourcePermission) error {
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Create(permission)
}

// SetRolePermissions 设置角色对资源的权限（覆盖）
func (dao *PermissionDAO) SetRolePermissions(ctx context.Context, permission *model.RbacRoleResourcePermission) error {
	// 使用原生 SQL 删除旧的权限配置（避免 reflect.New(nil) 错误）
	err := dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB().
		Where("role_id = ? AND resource_type = ? AND resource_id = ?",
			permission.RoleID, permission.ResourceType, permission.ResourceID).
		Delete(&model.RbacRoleResourcePermission{}).Error
	if err != nil {
		return err
	}

	// 创建新的权限配置
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Create(permission)
}

// GetRolePermissions 获取角色的所有权限
func (dao *PermissionDAO) GetRolePermissions(ctx context.Context, roleID int64) ([]*model.RbacRoleResourcePermission, error) {
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Where(
		dao.query.RbacRoleResourcePermission.RoleID.Eq(roleID),
	).Find()
}

// GetRolePermissionsByResourceType 获取角色对某类型资源的权限
func (dao *PermissionDAO) GetRolePermissionsByResourceType(ctx context.Context, roleID int64, resourceType int) ([]*model.RbacRoleResourcePermission, error) {
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Where(
		dao.query.RbacRoleResourcePermission.RoleID.Eq(roleID),
		dao.query.RbacRoleResourcePermission.ResourceType.Eq(int32(resourceType)),
	).Find()
}

// GetRolePermissionForResource 获取角色对特定资源的权限
func (dao *PermissionDAO) GetRolePermissionForResource(ctx context.Context, roleID int64, resourceType int, resourceID int64) (*model.RbacRoleResourcePermission, error) {
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Where(
		dao.query.RbacRoleResourcePermission.RoleID.Eq(roleID),
		dao.query.RbacRoleResourcePermission.ResourceType.Eq(int32(resourceType)),
		dao.query.RbacRoleResourcePermission.ResourceID.Eq(resourceID),
	).First()
}

// BatchGetRolePermissions 批量获取多个角色的权限
func (dao *PermissionDAO) BatchGetRolePermissions(ctx context.Context, roleIDs []int64) ([]*model.RbacRoleResourcePermission, error) {
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Where(
		dao.query.RbacRoleResourcePermission.RoleID.In(roleIDs...),
	).Find()
}

// DeleteRolePermissions 删除角色的所有权限
func (dao *PermissionDAO) DeleteRolePermissions(ctx context.Context, roleID int64) error {
	// 使用原生 SQL 删除（避免 reflect.New(nil) 错误）
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB().
		Where("role_id = ?", roleID).
		Delete(&model.RbacRoleResourcePermission{}).Error
}

// DeleteRolePermissionForResource 删除角色对特定资源的权限
func (dao *PermissionDAO) DeleteRolePermissionForResource(ctx context.Context, roleID int64, resourceType int, resourceID int64) error {
	// 使用原生 SQL 删除（避免 reflect.New(nil) 错误）
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB().
		Where("role_id = ? AND resource_type = ? AND resource_id = ?",
			roleID, resourceType, resourceID).
		Delete(&model.RbacRoleResourcePermission{}).Error
}

// GetResourcePermissions 获取资源的所有权限配置（所有角色对该资源的权限）
func (dao *PermissionDAO) GetResourcePermissions(ctx context.Context, resourceType int, resourceID int64) ([]*model.RbacRoleResourcePermission, error) {
	return dao.query.RbacRoleResourcePermission.WithContext(ctx).Where(
		dao.query.RbacRoleResourcePermission.ResourceType.Eq(int32(resourceType)),
		dao.query.RbacRoleResourcePermission.ResourceID.Eq(resourceID),
	).Find()
}

// CreateUserResourcePermission 创建用户资源权限
func (dao *PermissionDAO) CreateUserResourcePermission(ctx context.Context, permission *model.RbacUserResourcePermission) error {
	db := dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB()
	return db.Table(model.TableNameRbacUserResourcePermission).Create(permission).Error
}

// GetUserPermissionsByResource 获取资源的所有用户权限
func (dao *PermissionDAO) GetUserPermissionsByResource(ctx context.Context, spaceID int64, resourceType int, resourceID string) ([]*model.RbacUserResourcePermission, error) {
	var permissions []*model.RbacUserResourcePermission
	db := dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB()
	err := db.Table(model.TableNameRbacUserResourcePermission).
		Where("space_id = ? AND resource_type = ? AND resource_id = ?", spaceID, resourceType, resourceID).
		Find(&permissions).Error
	return permissions, err
}

// GetUserDirectPermissions 获取用户的所有直接权限（不通过角色）
func (dao *PermissionDAO) GetUserDirectPermissions(ctx context.Context, spaceID int64, userID string) ([]*model.RbacUserResourcePermission, error) {
	var permissions []*model.RbacUserResourcePermission
	db := dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB()
	err := db.Table(model.TableNameRbacUserResourcePermission).
		Where("space_id = ? AND user_id = ?", spaceID, userID).
		Find(&permissions).Error
	return permissions, err
}

// DeleteUserResourcePermission 删除资源的用户权限
func (dao *PermissionDAO) DeleteUserResourcePermission(ctx context.Context, spaceID int64, resourceType int, resourceID string) error {
	db := dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB()
	return db.Table(model.TableNameRbacUserResourcePermission).
		Where("space_id = ? AND resource_type = ? AND resource_id = ?", spaceID, resourceType, resourceID).
		Delete(&model.RbacUserResourcePermission{}).Error
}


