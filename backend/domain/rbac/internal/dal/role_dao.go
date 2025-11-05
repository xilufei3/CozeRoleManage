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
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal/model"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal/query"
)

type RoleDAO struct {
	query *query.Query
}

func NewRoleDAO(db *gorm.DB) *RoleDAO {
	return &RoleDAO{
		query: query.Use(db),
	}
}

// CreateRole 创建角色
func (dao *RoleDAO) CreateRole(ctx context.Context, role *model.RbacRole) error {
	return dao.query.RbacRole.WithContext(ctx).Create(role)
}

// GetRoleByID 根据ID获取角色
func (dao *RoleDAO) GetRoleByID(ctx context.Context, roleID int64) (*model.RbacRole, error) {
	return dao.query.RbacRole.WithContext(ctx).Where(
		dao.query.RbacRole.ID.Eq(roleID),
		dao.query.RbacRole.DeletedAt.IsNull(),
	).First()
}

// GetRolesBySpace 获取空间下的所有角色
func (dao *RoleDAO) GetRolesBySpace(ctx context.Context, spaceID int64) ([]*model.RbacRole, error) {
	return dao.query.RbacRole.WithContext(ctx).Where(
		dao.query.RbacRole.SpaceID.Eq(spaceID),
		dao.query.RbacRole.DeletedAt.IsNull(),
	).Find()
}

// UpdateRole 更新角色
func (dao *RoleDAO) UpdateRole(ctx context.Context, role *model.RbacRole) error {
	_, err := dao.query.RbacRole.WithContext(ctx).Where(
		dao.query.RbacRole.ID.Eq(role.ID),
		dao.query.RbacRole.DeletedAt.IsNull(),
	).Updates(role)
	return err
}

// DeleteRole 删除角色（软删除）
func (dao *RoleDAO) DeleteRole(ctx context.Context, roleID int64) error {
	now := time.Now().UnixMilli()
	_, err := dao.query.RbacRole.WithContext(ctx).Where(
		dao.query.RbacRole.ID.Eq(roleID),
		dao.query.RbacRole.DeletedAt.IsNull(),
	).Update(dao.query.RbacRole.DeletedAt, now)
	return err
}

// AssignRoleToUser 分配角色给用户
func (dao *RoleDAO) AssignRoleToUser(ctx context.Context, userRole *model.RbacUserRole) error {
	return dao.query.RbacUserRole.WithContext(ctx).Create(userRole)
}

// RemoveRoleFromUser 移除用户的角色
func (dao *RoleDAO) RemoveRoleFromUser(ctx context.Context, spaceID, userID, roleID int64) error {
	_, err := dao.query.RbacUserRole.WithContext(ctx).Where(
		dao.query.RbacUserRole.SpaceID.Eq(spaceID),
		dao.query.RbacUserRole.UserID.Eq(userID),
		dao.query.RbacUserRole.RoleID.Eq(roleID),
	).Delete()
	return err
}

// GetUserRoles 获取用户的所有角色
func (dao *RoleDAO) GetUserRoles(ctx context.Context, spaceID, userID int64) ([]*model.RbacUserRole, error) {
	return dao.query.RbacUserRole.WithContext(ctx).Where(
		dao.query.RbacUserRole.SpaceID.Eq(spaceID),
		dao.query.RbacUserRole.UserID.Eq(userID),
	).Find()
}

// GetRoleUsers 获取拥有该角色的所有用户
func (dao *RoleDAO) GetRoleUsers(ctx context.Context, roleID int64) ([]*model.RbacUserRole, error) {
	return dao.query.RbacUserRole.WithContext(ctx).Where(
		dao.query.RbacUserRole.RoleID.Eq(roleID),
	).Find()
}

// CheckRoleExists 检查角色是否存在
func (dao *RoleDAO) CheckRoleExists(ctx context.Context, spaceID int64, roleName string) (bool, error) {
	_, err := dao.query.RbacRole.WithContext(ctx).Where(
		dao.query.RbacRole.SpaceID.Eq(spaceID),
		dao.query.RbacRole.Name.Eq(roleName),
		dao.query.RbacRole.DeletedAt.IsNull(),
	).First()

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}




