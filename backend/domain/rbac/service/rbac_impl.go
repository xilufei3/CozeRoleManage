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
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/coze-dev/coze-studio/backend/domain/rbac/entity"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/internal/dal/model"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/repository"
)

type rbacServiceImpl struct {
	roleRepo       repository.RoleRepository
	permissionRepo repository.PermissionRepository
}

// NewRBACService 创建RBAC服务实例
func NewRBACService(db *gorm.DB) RBACService {
	return &rbacServiceImpl{
		roleRepo:       repository.NewRoleRepo(db),
		permissionRepo: repository.NewPermissionRepo(db),
	}
}

// ========== 角色管理实现 ==========

func (s *rbacServiceImpl) CreateRole(ctx context.Context, req *CreateRoleRequest) (*entity.Role, error) {
	// 检查角色名是否已存在
	exists, err := s.roleRepo.CheckRoleExists(ctx, req.SpaceID, req.Name)
	if err != nil {
		return nil, fmt.Errorf("check role exists failed: %w", err)
	}
	if exists {
		return nil, errors.New("role name already exists in this space")
	}

	role := &model.RbacRole{
		SpaceID:     req.SpaceID,
		Name:        req.Name,
		Description: req.Description,
		IsSystem:    false,
		CreatorID:   req.CreatorID,
	}

	if err := s.roleRepo.CreateRole(ctx, role); err != nil {
		return nil, fmt.Errorf("create role failed: %w", err)
	}

	return s.modelToEntity(role), nil
}

func (s *rbacServiceImpl) UpdateRole(ctx context.Context, req *UpdateRoleRequest) error {
	role, err := s.roleRepo.GetRoleByID(ctx, req.RoleID)
	if err != nil {
		return fmt.Errorf("get role failed: %w", err)
	}

	// 系统角色不允许修改
	if role.IsSystem {
		return errors.New("system role cannot be modified")
	}

	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Description != "" {
		role.Description = req.Description
	}

	return s.roleRepo.UpdateRole(ctx, role)
}

func (s *rbacServiceImpl) DeleteRole(ctx context.Context, roleID int64) error {
	role, err := s.roleRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		return fmt.Errorf("get role failed: %w", err)
	}

	if role.IsSystem {
		return errors.New("system role cannot be deleted")
	}

	// 删除角色的所有权限配置
	if err := s.permissionRepo.DeleteRolePermissions(ctx, roleID); err != nil {
		return fmt.Errorf("delete role permissions failed: %w", err)
	}

	return s.roleRepo.DeleteRole(ctx, roleID)
}

func (s *rbacServiceImpl) GetRole(ctx context.Context, roleID int64) (*entity.Role, error) {
	role, err := s.roleRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		return nil, err
	}

	// 获取角色的权限
	permissions, err := s.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		return nil, fmt.Errorf("get role permissions failed: %w", err)
	}

	entityRole := s.modelToEntity(role)
	entityRole.Permissions = s.permissionsToEntity(permissions)
	return entityRole, nil
}

func (s *rbacServiceImpl) ListRoles(ctx context.Context, spaceID int64) ([]*entity.Role, error) {
	roles, err := s.roleRepo.GetRolesBySpace(ctx, spaceID)
	if err != nil {
		return nil, err
	}

	result := make([]*entity.Role, 0, len(roles))
	for _, role := range roles {
		result = append(result, s.modelToEntity(role))
	}
	return result, nil
}

// ========== 用户角色分配实现 ==========

func (s *rbacServiceImpl) AssignRoleToUser(ctx context.Context, req *AssignRoleRequest) error {
	// 验证角色是否存在
	_, err := s.roleRepo.GetRoleByID(ctx, req.RoleID)
	if err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	userRole := &model.RbacUserRole{
		SpaceID:    req.SpaceID,
		UserID:     req.UserID,
		RoleID:     req.RoleID,
		AssignedBy: req.AssignedBy,
	}

	return s.roleRepo.AssignRoleToUser(ctx, userRole)
}

func (s *rbacServiceImpl) RemoveUserRole(ctx context.Context, spaceID, userID, roleID int64) error {
	return s.roleRepo.RemoveRoleFromUser(ctx, spaceID, userID, roleID)
}

func (s *rbacServiceImpl) GetUserRoles(ctx context.Context, spaceID, userID int64) ([]*entity.Role, error) {
	userRoles, err := s.roleRepo.GetUserRoles(ctx, spaceID, userID)
	if err != nil {
		return nil, err
	}

	roleIDs := make([]int64, 0, len(userRoles))
	for _, ur := range userRoles {
		roleIDs = append(roleIDs, ur.RoleID)
	}

	if len(roleIDs) == 0 {
		return []*entity.Role{}, nil
	}

	roles := make([]*entity.Role, 0, len(roleIDs))
	for _, roleID := range roleIDs {
		role, err := s.roleRepo.GetRoleByID(ctx, roleID)
		if err != nil {
			continue // 跳过已删除的角色
		}
		roles = append(roles, s.modelToEntity(role))
	}

	return roles, nil
}

func (s *rbacServiceImpl) GetUserPermissions(ctx context.Context, spaceID, userID int64) (*entity.UserPermissions, error) {
	// 获取用户的所有角色
	userRoles, err := s.roleRepo.GetUserRoles(ctx, spaceID, userID)
	if err != nil {
		return nil, err
	}

	roleIDs := make([]int64, 0, len(userRoles))
	for _, ur := range userRoles {
		roleIDs = append(roleIDs, ur.RoleID)
	}

	if len(roleIDs) == 0 {
		return &entity.UserPermissions{
			UserID:      userID,
			SpaceID:     spaceID,
			Roles:       []*entity.Role{},
			Permissions: make(map[entity.ResourceType][]entity.Action),
		}, nil
	}

	// 获取所有角色的权限
	permissions, err := s.permissionRepo.BatchGetRolePermissions(ctx, roleIDs)
	if err != nil {
		return nil, err
	}

	// 聚合权限（按资源类型）
	aggregatedPerms := make(map[entity.ResourceType]map[entity.Action]bool)
	for _, perm := range permissions {
		rt := entity.ResourceType(perm.ResourceType)
		if aggregatedPerms[rt] == nil {
			aggregatedPerms[rt] = make(map[entity.Action]bool)
		}
		for _, action := range perm.Actions {
			aggregatedPerms[rt][entity.Action(action)] = true
		}
	}

	// 转换为数组
	result := make(map[entity.ResourceType][]entity.Action)
	for rt, actions := range aggregatedPerms {
		actionList := make([]entity.Action, 0, len(actions))
		for action := range actions {
			actionList = append(actionList, action)
		}
		result[rt] = actionList
	}

	// 获取角色详情
	roles := make([]*entity.Role, 0, len(roleIDs))
	for _, roleID := range roleIDs {
		role, err := s.roleRepo.GetRoleByID(ctx, roleID)
		if err != nil {
			continue
		}
		roles = append(roles, s.modelToEntity(role))
	}

	return &entity.UserPermissions{
		UserID:      userID,
		SpaceID:     spaceID,
		Roles:       roles,
		Permissions: result,
	}, nil
}

// ========== 权限管理实现 ==========

func (s *rbacServiceImpl) SetRolePermissions(ctx context.Context, req *SetRolePermissionsRequest) error {
	// 验证角色是否存在
	_, err := s.roleRepo.GetRoleByID(ctx, req.RoleID)
	if err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	// 批量设置权限
	for _, perm := range req.Permissions {
		permission := &model.RbacRoleResourcePermission{
			RoleID:       req.RoleID,
			ResourceType: int32(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      model.StringArray(perm.Actions),
		}

		if err := s.permissionRepo.SetRolePermissions(ctx, permission); err != nil {
			return fmt.Errorf("set permission failed: %w", err)
		}
	}

	return nil
}

func (s *rbacServiceImpl) SetRoleResourcePermission(ctx context.Context, req *SetResourcePermissionRequest) error {
	permission := &model.RbacRoleResourcePermission{
		RoleID:       req.RoleID,
		ResourceType: int32(req.ResourceType),
		ResourceID:   req.ResourceID,
		Actions:      model.StringArray(req.Actions),
	}

	return s.permissionRepo.SetRolePermissions(ctx, permission)
}

func (s *rbacServiceImpl) GetRolePermissions(ctx context.Context, roleID int64, resourceType *entity.ResourceType) ([]*entity.Permission, error) {
	var permissions []*model.RbacRoleResourcePermission
	var err error

	if resourceType != nil {
		permissions, err = s.permissionRepo.GetRolePermissionsByResourceType(ctx, roleID, int(*resourceType))
	} else {
		permissions, err = s.permissionRepo.GetRolePermissions(ctx, roleID)
	}

	if err != nil {
		return nil, err
	}

	return s.permissionsToEntity(permissions), nil
}

func (s *rbacServiceImpl) GetResourcePermissions(ctx context.Context, resourceType entity.ResourceType, resourceID int64) ([]*RolePermissionInfo, error) {
	permissions, err := s.permissionRepo.GetResourcePermissions(ctx, int(resourceType), resourceID)
	if err != nil {
		return nil, err
	}

	result := make([]*RolePermissionInfo, 0, len(permissions))
	for _, perm := range permissions {
		role, err := s.roleRepo.GetRoleByID(ctx, perm.RoleID)
		if err != nil {
			continue
		}

		result = append(result, &RolePermissionInfo{
			RoleID:      role.ID,
			RoleName:    role.Name,
			Permissions: []string(perm.Actions),
		})
	}

	return result, nil
}

// ========== 权限检查实现 ==========

func (s *rbacServiceImpl) CheckPermission(ctx context.Context, check *entity.PermissionCheck) (bool, error) {
	// 获取用户的所有角色
	userRoles, err := s.roleRepo.GetUserRoles(ctx, check.SpaceID, check.UserID)
	if err != nil {
		return false, err
	}

	if len(userRoles) == 0 {
		return false, nil
	}

	roleIDs := make([]int64, 0, len(userRoles))
	for _, ur := range userRoles {
		roleIDs = append(roleIDs, ur.RoleID)
	}

	// 获取所有角色的权限
	permissions, err := s.permissionRepo.BatchGetRolePermissions(ctx, roleIDs)
	if err != nil {
		return false, err
	}

	// 检查是否有匹配的权限
	for _, perm := range permissions {
		// 资源类型匹配
		if entity.ResourceType(perm.ResourceType) != check.ResourceType {
			continue
		}

		// 资源ID匹配（0表示所有资源，或者精确匹配）
		if perm.ResourceID != 0 && perm.ResourceID != check.ResourceID {
			continue
		}

		// 检查操作权限
		for _, action := range perm.Actions {
			if entity.Action(action) == check.Action {
				return true, nil
			}
		}
	}

	return false, nil
}

func (s *rbacServiceImpl) BatchCheckPermissions(ctx context.Context, checks []*entity.PermissionCheck) (map[string]bool, error) {
	result := make(map[string]bool)

	for i, check := range checks {
		hasPermission, err := s.CheckPermission(ctx, check)
		if err != nil {
			return nil, err
		}
		key := fmt.Sprintf("%d_%d_%d_%s", check.ResourceType, check.ResourceID, i, check.Action)
		result[key] = hasPermission
	}

	return result, nil
}

func (s *rbacServiceImpl) GetAccessibleResources(ctx context.Context, req *GetAccessibleResourcesRequest) ([]int64, error) {
	userPerms, err := s.GetUserPermissions(ctx, req.SpaceID, req.UserID)
	if err != nil {
		return nil, err
	}

	// 检查用户是否有该资源类型的指定操作权限
	actions, ok := userPerms.Permissions[req.ResourceType]
	if !ok {
		return []int64{}, nil
	}

	hasPermission := false
	for _, action := range actions {
		if action == req.Action {
			hasPermission = true
			break
		}
	}

	if !hasPermission {
		return []int64{}, nil
	}

	// TODO: 这里需要根据具体资源类型查询数据库获取资源ID列表
	// 当前返回空列表，实际使用时需要查询对应的资源表
	return []int64{}, nil
}

// ========== 辅助方法 ==========

func (s *rbacServiceImpl) modelToEntity(role *model.RbacRole) *entity.Role {
	return &entity.Role{
		ID:          role.ID,
		SpaceID:     role.SpaceID,
		Name:        role.Name,
		Description: role.Description,
		IsSystem:    role.IsSystem,
		CreatorID:   role.CreatorID,
		CreatedAt:   role.CreatedAt,
		UpdatedAt:   role.UpdatedAt,
	}
}

func (s *rbacServiceImpl) permissionsToEntity(permissions []*model.RbacRoleResourcePermission) []*entity.Permission {
	result := make([]*entity.Permission, 0, len(permissions))
	for _, perm := range permissions {
		result = append(result, &entity.Permission{
			ID:           perm.ID,
			RoleID:       perm.RoleID,
			ResourceType: entity.ResourceType(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      []string(perm.Actions),
			CreatedAt:    perm.CreatedAt,
			UpdatedAt:    perm.UpdatedAt,
		})
	}
	return result
}


