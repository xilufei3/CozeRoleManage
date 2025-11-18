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
	db             *gorm.DB
}

// NewRBACService 创建RBAC服务实例
func NewRBACService(db *gorm.DB) RBACService {
	return &rbacServiceImpl{
		roleRepo:       repository.NewRoleRepo(db),
		permissionRepo: repository.NewPermissionRepo(db),
		db:             db,
	}
}

// ---------- 角色管理实现 ----------

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

// ---------- 用户角色分配实现 ----------

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

    var permissions []*model.RbacRoleResourcePermission
    if len(roleIDs) > 0 {
        permissions, err = s.permissionRepo.BatchGetRolePermissions(ctx, roleIDs)
        if err != nil {
            return nil, err
        }
    } else {
        permissions = []*model.RbacRoleResourcePermission{}
    }

	// 🔑 获取用户的直接权限（不通过角色）
	userDirectPermissions, err := s.permissionRepo.GetUserDirectPermissions(ctx, spaceID, fmt.Sprintf("%d", userID))
	if err != nil {
		return nil, fmt.Errorf("failed to get user direct permissions: %w", err)
	}

	// 聚合权限（按资源类型和资源ID）
	// 先收集所有资源(resource_id=0)的权限
	allResourcePerms := make(map[entity.ResourceType]map[entity.Action]bool)
	// 再收集具体资源的权限
	specificResourcePerms := make(map[string]map[entity.Action]bool) // key: "resourceType_resourceID"

	// 🔑 处理角色权限
	for _, perm := range permissions {
		rt := entity.ResourceType(perm.ResourceType)

		if perm.ResourceID == 0 {
			// 所有资源的权限
			if allResourcePerms[rt] == nil {
				allResourcePerms[rt] = make(map[entity.Action]bool)
			}
			for _, action := range perm.Actions {
				allResourcePerms[rt][entity.Action(action)] = true
			}
		} else {
			// 具体资源的权限
			key := fmt.Sprintf("%d_%d", rt, perm.ResourceID)
			if specificResourcePerms[key] == nil {
				specificResourcePerms[key] = make(map[entity.Action]bool)
			}
			for _, action := range perm.Actions {
				specificResourcePerms[key][entity.Action(action)] = true
			}
		}
	}

	// 🔑 处理用户直接权限（不通过角色）
	for _, userPerm := range userDirectPermissions {
		rt := entity.ResourceType(userPerm.ResourceType)

		// 将resource_id转换为int64进行判断
		var resourceIDInt int64
		fmt.Sscanf(userPerm.ResourceID, "%d", &resourceIDInt)

		if resourceIDInt == 0 || userPerm.ResourceID == "0" {
			// 所有资源的权限
			if allResourcePerms[rt] == nil {
				allResourcePerms[rt] = make(map[entity.Action]bool)
			}
			for _, action := range userPerm.Actions {
				allResourcePerms[rt][entity.Action(action)] = true
			}
		} else {
			// 具体资源的权限
			key := fmt.Sprintf("%d_%s", rt, userPerm.ResourceID)
			if specificResourcePerms[key] == nil {
				specificResourcePerms[key] = make(map[entity.Action]bool)
			}
			for _, action := range userPerm.Actions {
				specificResourcePerms[key][entity.Action(action)] = true
			}
		}
	}

	// 聚合权限：所有资源的权限 + 具体资源的权限 + 用户直接权限 取并集
	aggregatedPerms := make(map[entity.ResourceType]map[entity.Action]bool)

	// 首先添加所有资源的权限
	for rt, actions := range allResourcePerms {
		if aggregatedPerms[rt] == nil {
			aggregatedPerms[rt] = make(map[entity.Action]bool)
		}
		for action := range actions {
			aggregatedPerms[rt][action] = true
		}
	}

	// 然后合并具体资源的权限
	for key, actions := range specificResourcePerms {
		// 从 key 中解析出 resourceType
		var rt entity.ResourceType
		var resID int64
		fmt.Sscanf(key, "%d_%d", &rt, &resID)

		if aggregatedPerms[rt] == nil {
			aggregatedPerms[rt] = make(map[entity.Action]bool)
		}
		for action := range actions {
			aggregatedPerms[rt][action] = true
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

	// 转换详细权限列表（包含角色权限和用户直接权限）
	detailPerms := make([]*entity.Permission, 0, len(permissions)+len(userDirectPermissions))

	// 添加角色权限
	for _, perm := range permissions {
		detailPerms = append(detailPerms, &entity.Permission{
			ID:           perm.ID,
			RoleID:       perm.RoleID,
			ResourceType: entity.ResourceType(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      []string(perm.Actions),
			CreatedAt:    perm.CreatedAt,
			UpdatedAt:    perm.UpdatedAt,
		})
	}

	// 🔑 添加用户直接权限
	for _, userPerm := range userDirectPermissions {
		var resourceIDInt int64
		fmt.Sscanf(userPerm.ResourceID, "%d", &resourceIDInt)

		detailPerms = append(detailPerms, &entity.Permission{
			ID:           userPerm.ID,
			RoleID:       0, // 直接权限，不属于任何角色
			ResourceType: entity.ResourceType(userPerm.ResourceType),
			ResourceID:   resourceIDInt,
			Actions:      []string(userPerm.Actions),
			CreatedAt:    userPerm.CreatedAt,
			UpdatedAt:    userPerm.UpdatedAt,
		})
	}

	return &entity.UserPermissions{
		UserID:            userID,
		SpaceID:           spaceID,
		Roles:             roles,
		Permissions:       result,
		DetailPermissions: detailPerms,
	}, nil
}

// ---------- 权限管理实现 ----------

func (s *rbacServiceImpl) SetRolePermissions(ctx context.Context, req *SetRolePermissionsRequest) error {
	// 验证角色是否存在
	_, err := s.roleRepo.GetRoleByID(ctx, req.RoleID)
	if err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	// 先删除该角色的所有旧权限
	if err := s.permissionRepo.DeleteRolePermissions(ctx, req.RoleID); err != nil {
		return fmt.Errorf("delete old permissions failed: %w", err)
	}

	// 批量插入新权限
	for _, perm := range req.Permissions {
		// 跳过空的权限配置
		if len(perm.Actions) == 0 {
			continue
		}

		// 验证并过滤操作权限
		validActions := s.validateAndFilterActions(perm.ResourceType, perm.Actions)
		if len(validActions) == 0 {
			continue // 如果过滤后没有有效操作，跳过
		}

		permission := &model.RbacRoleResourcePermission{
			RoleID:       req.RoleID,
			ResourceType: int32(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      model.StringArray(validActions),
		}

		// 使用 GORM 的 Create 直接插入（避免重复删除）
		if err := s.permissionRepo.CreatePermission(ctx, permission); err != nil {
			return fmt.Errorf("create permission failed: %w", err)
		}
	}

	return nil
}

// validateAndFilterActions 验证并过滤出有效的操作
func (s *rbacServiceImpl) validateAndFilterActions(resourceType entity.ResourceType, actions []string) []string {
	validActions := entity.GetResourceTypeActions(resourceType)
	if len(validActions) == 0 {
		// 如果资源类型未定义，允许所有操作
		return actions
	}

	// 构建有效操作集合
	validSet := make(map[string]bool)
	for _, action := range validActions {
		validSet[string(action)] = true
	}

	// 过滤出有效的操作
	filtered := make([]string, 0, len(actions))
	for _, action := range actions {
		if validSet[action] {
			filtered = append(filtered, action)
		}
	}

	return filtered
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

// ---------- 权限检查实现 ----------

func (s *rbacServiceImpl) CheckPermission(ctx context.Context, check *entity.PermissionCheck) (bool, error) {
	// 🔑 权限检查策略：合并RBAC角色权限和用户直接权限（取并集）
	//
	// 设计说明：
	// 1. 对于用户创建的资源：角色权限 ∪ 直接权限
	// 2. 对于非用户创建的资源：只应该有角色权限，直接权限应该为空
	//
	// 实现逻辑：
	// - 如果资源不是用户创建的，直接权限查询结果为空，合并后只有角色权限，既安全又高效
	// - 如果数据库中有错误的直接权限记录（非用户创建的资源），仍然会生效
	// - 建议：在设置直接权限时进行验证，确保只允许为用户创建的资源设置直接权限

	// 1. 先检查用户是否有角色，如果有则检查角色权限
	userRoles, err := s.roleRepo.GetUserRoles(ctx, check.SpaceID, check.UserID)
	if err != nil {
		return false, err
	}

	var roleIDs []int64
	if len(userRoles) > 0 {
		roleIDs = make([]int64, 0, len(userRoles))
		for _, ur := range userRoles {
			roleIDs = append(roleIDs, ur.RoleID)
		}

		permissions, err := s.permissionRepo.BatchGetRolePermissions(ctx, roleIDs)
		if err != nil {
			return false, err
		}

		// 检查角色权限
		for _, perm := range permissions {
			if entity.ResourceType(perm.ResourceType) != check.ResourceType {
				continue
			}
			// 资源ID匹配：
			// 1. resource_id = 0 表示对所有该类型资源有权限
			// 2. 或者 resource_id 精确匹配
			if perm.ResourceID != 0 && perm.ResourceID != check.ResourceID {
				continue
			}
			// 检查操作权限
			for _, action := range perm.Actions {
				if entity.Action(action) == check.Action {
					return true, nil // 找到匹配的角色权限
				}
			}
		}
	}

	// 2. 检查用户直接权限（只对用户创建的资源生效）
	// 🔑 策略：
	// - resource_id = 0（所有资源）：直接权限总是允许（全局权限）
	// - resource_id != 0（具体资源）：只对用户创建的资源生效
	//   如果资源不是用户创建的，直接权限查询结果为空，合并后只有角色权限，既安全又高效
	userDirectPerms, err := s.permissionRepo.GetUserDirectPermissions(ctx, check.SpaceID, fmt.Sprintf("%d", check.UserID))
	if err != nil {
		return false, fmt.Errorf("failed to get user direct permissions: %w", err)
	}

	// 检查用户直接权限
	for _, perm := range userDirectPerms {
		// 资源类型匹配
		if perm.ResourceType != int(check.ResourceType) {
			continue
		}

		// 资源ID匹配：需要转换为int64进行比较
		var permResourceID int64
		fmt.Sscanf(perm.ResourceID, "%d", &permResourceID)

		// 资源ID匹配：
		// 1. resource_id = 0 表示对所有该类型资源有权限（全局权限，总是允许）
		// 2. 或者 resource_id 精确匹配（只对用户创建的资源生效）
		if permResourceID == 0 {
			// "所有资源"的直接权限，总是允许
			for _, action := range perm.Actions {
				if entity.Action(action) == check.Action {
					return true, nil // 找到匹配的全局直接权限
				}
			}
		} else if permResourceID == check.ResourceID {
			// 具体资源的直接权限
			// 🔑 关键：如果资源不是用户创建的，数据库中不应该有直接权限记录
			// 如果查询结果为空，合并后只有角色权限，既安全又高效
			// 如果数据库中有错误的直接权限记录（非用户创建的资源），这里仍然会生效
			// 建议：在设置直接权限时进行验证，确保只允许为用户创建的资源设置直接权限
			for _, action := range perm.Actions {
				if entity.Action(action) == check.Action {
					return true, nil // 找到匹配的用户直接权限
				}
			}
		}
	}

	// 3. 如果角色权限和直接权限都没有找到，返回false
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

// ---------- 辅助方法 ----------

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

// ---------- 资源查询实现 ----------

// GetSpaceAgents 获取空间下的 Agent 列表
func (s *rbacServiceImpl) GetSpaceAgents(ctx context.Context, spaceID int64) ([]*AgentBasicInfo, error) {
	// 查询 single_agent_draft 表获取空间下的所有 Agent
	var agents []struct {
		ID          int64
		AgentID     int64
		Name        string
		Description *string
		CreatorID   *int64
	}

	err := s.db.WithContext(ctx).
		Table("single_agent_draft").
		Select("id, agent_id, name, description, creator_id").
		Where("space_id = ? AND deleted_at IS NULL", spaceID).
		Find(&agents).Error

	if err != nil {
		return nil, fmt.Errorf("query agents failed: %w", err)
	}

	result := make([]*AgentBasicInfo, 0, len(agents))
	for _, agent := range agents {
		desc := ""
		if agent.Description != nil {
			desc = *agent.Description
		}
		creatorID := int64(0)
		if agent.CreatorID != nil {
			creatorID = *agent.CreatorID
		}
		result = append(result, &AgentBasicInfo{
			ID:          agent.AgentID, // 使用 agent_id 作为资源 ID
			Name:        agent.Name,
			Description: desc,
			CreatorID:   creatorID,
		})
	}

	return result, nil
}

// ---------- 创建资源时自动分配权限 ----------

// AssignCreatorPermissions 给资源创建者分配所有权限
// 用于在创建资源时自动授予创建者完整权限，避免用户看不到自己创建的资源
func (s *rbacServiceImpl) AssignCreatorPermissions(
	ctx context.Context,
	userID string,
	spaceID int64,
	resourceType int,
	resourceID string,
) error {
	// 根据资源类型确定权限列表
	actions := s.getDefaultActionsForResourceType(resourceType)

	permission := &model.RbacUserResourcePermission{
		UserID:       userID,
		SpaceID:      spaceID,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Actions:      actions,
	}

	if err := s.permissionRepo.CreateUserResourcePermission(ctx, permission); err != nil {
		return fmt.Errorf("failed to assign creator permissions: %w", err)
	}

	return nil
}

// getDefaultActionsForResourceType 获取资源类型的默认权限列表
// 创建者应该获得该资源的所有可用权限（除了 create，因为 create 是针对资源类型的，不是具体资源的）
func (s *rbacServiceImpl) getDefaultActionsForResourceType(resourceType int) model.StringArray {
	// 使用 GetResourceTypeActions 获取该资源类型支持的所有操作
	rt := entity.ResourceType(resourceType)
	allActions := entity.GetResourceTypeActions(rt)

	// 过滤掉 create 权限（create 是针对资源类型的，不是具体资源的）
	actions := make([]string, 0, len(allActions))
	for _, action := range allActions {
		if action != entity.ActionCreate {
			actions = append(actions, string(action))
		}
	}

	// 如果没有找到对应的资源类型，返回默认权限
	if len(actions) == 0 {
		return model.StringArray{"read", "update", "delete"}
	}

	return model.StringArray(actions)
}

// CopyResourcePermissions 复制资源的权限到新资源
// 用于在复制资源时保持原有的权限设置
func (s *rbacServiceImpl) CopyResourcePermissions(
	ctx context.Context,
	sourceResourceType int,
	sourceResourceID string,
	targetResourceID string,
	spaceID int64,
) error {
	// 1. 获取源资源的所有用户权限
	sourcePermissions, err := s.permissionRepo.GetUserPermissionsByResource(ctx, spaceID, sourceResourceType, sourceResourceID)
	if err != nil {
		return fmt.Errorf("failed to get source resource permissions: %w", err)
	}

	// 2. 为每个用户在新资源上创建相同的权限
	for _, perm := range sourcePermissions {
		newPermission := &model.RbacUserResourcePermission{
			UserID:       perm.UserID,
			SpaceID:      spaceID,
			ResourceType: sourceResourceType,
			ResourceID:   targetResourceID,
			Actions:      perm.Actions,
		}

		if err := s.permissionRepo.CreateUserResourcePermission(ctx, newPermission); err != nil {
			// 记录错误但继续处理其他用户的权限
			fmt.Printf("Failed to copy permission for user %s to resource %s: %v\n", perm.UserID, targetResourceID, err)
		}
	}

	return nil
}

// GetUserPermissionsByResource 获取资源的所有用户权限
func (s *rbacServiceImpl) GetUserPermissionsByResource(
	ctx context.Context,
	spaceID int64,
	resourceType int,
	resourceID string,
) ([]*model.RbacUserResourcePermission, error) {
	return s.permissionRepo.GetUserPermissionsByResource(ctx, spaceID, resourceType, resourceID)
}

// DeleteResourcePermissions 删除资源的用户权限
// 用于在删除资源时清理权限表
func (s *rbacServiceImpl) DeleteResourcePermissions(
	ctx context.Context,
	spaceID int64,
	resourceType int,
	resourceID string,
) error {
	if err := s.permissionRepo.DeleteUserResourcePermission(ctx, spaceID, resourceType, resourceID); err != nil {
		return fmt.Errorf("failed to delete resource permissions: %w", err)
	}
	return nil
}


