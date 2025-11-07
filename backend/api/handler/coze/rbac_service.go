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

package coze

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"

	rbacModel "github.com/coze-dev/coze-studio/backend/api/model/rbac"
	"github.com/coze-dev/coze-studio/backend/application/rbac"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/entity"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/service"
)

// ---------- 角色管理 Handler ----------

// CreateRole 创建角色
// @router /api/rbac/roles [POST]
func CreateRole(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.CreateRoleRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	// TODO: 从session获取当前用户ID
	creatorID := int64(1)

	role, err := rbac.RBACService.CreateRole(ctx, &service.CreateRoleRequest{
		SpaceID:     req.SpaceID,
		Name:        req.Name,
		Description: req.Description,
		CreatorID:   creatorID,
	})
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	resp := &rbacModel.CreateRoleResponse{
		Data: &rbacModel.RoleInfo{
			ID:          role.ID,
			SpaceID:     role.SpaceID,
			Name:        role.Name,
			Description: role.Description,
			IsSystem:    role.IsSystem,
			CreatorID:   role.CreatorID,
			CreatedAt:   role.CreatedAt,
			UpdatedAt:   role.UpdatedAt,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// UpdateRole 更新角色
// @router /api/rbac/roles/{roleId} [PUT]
func UpdateRole(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.UpdateRoleRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	err := rbac.RBACService.UpdateRole(ctx, &service.UpdateRoleRequest{
		RoleID:      req.RoleID,
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	c.JSON(consts.StatusOK, &rbacModel.UpdateRoleResponse{})
}

// DeleteRole 删除角色
// @router /api/rbac/roles/{roleId} [DELETE]
func DeleteRole(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.DeleteRoleRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	err := rbac.RBACService.DeleteRole(ctx, req.RoleID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	c.JSON(consts.StatusOK, &rbacModel.DeleteRoleResponse{})
}

// GetRole 获取角色详情
// @router /api/rbac/roles/{roleId} [GET]
func GetRole(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.GetRoleRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	role, err := rbac.RBACService.GetRole(ctx, req.RoleID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	permissions := make([]*rbacModel.PermissionInfo, 0, len(role.Permissions))
	for _, perm := range role.Permissions {
		permissions = append(permissions, &rbacModel.PermissionInfo{
			ID:           perm.ID,
			RoleID:       perm.RoleID,
			ResourceType: int(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      perm.Actions,
			CreatedAt:    perm.CreatedAt,
			UpdatedAt:    perm.UpdatedAt,
		})
	}

	resp := &rbacModel.GetRoleResponse{
		Data: &rbacModel.RoleDetailInfo{
			RoleInfo: &rbacModel.RoleInfo{
				ID:          role.ID,
				SpaceID:     role.SpaceID,
				Name:        role.Name,
				Description: role.Description,
				IsSystem:    role.IsSystem,
				CreatorID:   role.CreatorID,
				CreatedAt:   role.CreatedAt,
				UpdatedAt:   role.UpdatedAt,
			},
			Permissions: permissions,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// ListRoles 查询角色列表
// @router /api/rbac/roles [GET]
func ListRoles(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.ListRolesRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	roles, err := rbac.RBACService.ListRoles(ctx, req.SpaceID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	roleInfos := make([]*rbacModel.RoleInfo, 0, len(roles))
	for _, role := range roles {
		roleInfos = append(roleInfos, &rbacModel.RoleInfo{
			ID:          role.ID,
			SpaceID:     role.SpaceID,
			Name:        role.Name,
			Description: role.Description,
			IsSystem:    role.IsSystem,
			CreatorID:   role.CreatorID,
			CreatedAt:   role.CreatedAt,
			UpdatedAt:   role.UpdatedAt,
		})
	}

	resp := &rbacModel.ListRolesResponse{
		Data: &rbacModel.ListRolesData{
			Roles: roleInfos,
			Total: len(roleInfos),
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// ---------- 用户角色分配 Handler ----------

// AssignRoleToUser 为用户分配角色
// @router /api/rbac/users/{userId}/roles [POST]
func AssignRoleToUser(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.AssignRoleRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	// TODO: 从session获取当前用户ID（超管）
	assignedBy := int64(1)

	err := rbac.RBACService.AssignRoleToUser(ctx, &service.AssignRoleRequest{
		SpaceID:    req.SpaceID,
		UserID:     req.UserID,
		RoleID:     req.RoleID,
		AssignedBy: assignedBy,
	})
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	c.JSON(consts.StatusOK, &rbacModel.AssignRoleResponse{})
}

// RemoveUserRole 移除用户角色
// @router /api/rbac/users/{userId}/roles/{roleId} [DELETE]
func RemoveUserRole(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.RemoveUserRoleRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	err := rbac.RBACService.RemoveUserRole(ctx, req.SpaceID, req.UserID, req.RoleID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	c.JSON(consts.StatusOK, &rbacModel.RemoveUserRoleResponse{})
}

// GetUserRoles 获取用户的角色列表
// @router /api/rbac/users/{userId}/roles [GET]
func GetUserRoles(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.GetUserRolesRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	roles, err := rbac.RBACService.GetUserRoles(ctx, req.SpaceID, req.UserID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	roleInfos := make([]*rbacModel.RoleInfo, 0, len(roles))
	for _, role := range roles {
		roleInfos = append(roleInfos, &rbacModel.RoleInfo{
			ID:          role.ID,
			SpaceID:     role.SpaceID,
			Name:        role.Name,
			Description: role.Description,
			IsSystem:    role.IsSystem,
			CreatorID:   role.CreatorID,
			CreatedAt:   role.CreatedAt,
			UpdatedAt:   role.UpdatedAt,
		})
	}

	resp := &rbacModel.GetUserRolesResponse{
		Data: &rbacModel.UserRolesData{
			Roles: roleInfos,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// GetUserPermissions 查询用户权限
// @router /api/rbac/users/{userId}/permissions [GET]
func GetUserPermissions(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.GetUserPermissionsRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	userPerms, err := rbac.RBACService.GetUserPermissions(ctx, req.SpaceID, req.UserID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	roleInfos := make([]*rbacModel.RoleInfo, 0, len(userPerms.Roles))
	for _, role := range userPerms.Roles {
		roleInfos = append(roleInfos, &rbacModel.RoleInfo{
			ID:          role.ID,
			SpaceID:     role.SpaceID,
			Name:        role.Name,
			Description: role.Description,
			IsSystem:    role.IsSystem,
			CreatorID:   role.CreatorID,
			CreatedAt:   role.CreatedAt,
			UpdatedAt:   role.UpdatedAt,
		})
	}

	// 转换权限映射
	permissions := make(map[int][]string)
	for rt, actions := range userPerms.Permissions {
		actionStrs := make([]string, 0, len(actions))
		for _, action := range actions {
			actionStrs = append(actionStrs, string(action))
		}
		permissions[int(rt)] = actionStrs
	}

	// 转换详细权限列表
	detailPerms := make([]*rbacModel.PermissionInfo, 0, len(userPerms.DetailPermissions))
	for _, perm := range userPerms.DetailPermissions {
		detailPerms = append(detailPerms, &rbacModel.PermissionInfo{
			ID:           perm.ID,
			RoleID:       perm.RoleID,
			ResourceType: int(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      perm.Actions,
			CreatedAt:    perm.CreatedAt,
			UpdatedAt:    perm.UpdatedAt,
		})
	}

	resp := &rbacModel.GetUserPermissionsResponse{
		Data: &rbacModel.UserPermissionsData{
			UserID:            userPerms.UserID,
			SpaceID:           userPerms.SpaceID,
			Roles:             roleInfos,
			Permissions:       permissions,
			DetailPermissions: detailPerms,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// ---------- 权限管理 Handler ----------

// SetRolePermissions 批量设置角色权限
// @router /api/rbac/roles/{roleId}/permissions/batch [POST]
func SetRolePermissions(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.SetRolePermissionsRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	permissions := make([]*service.ResourcePermissionSetting, 0, len(req.Permissions))
	for _, perm := range req.Permissions {
		permissions = append(permissions, &service.ResourcePermissionSetting{
			ResourceType: entity.ResourceType(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      perm.Actions,
		})
	}

	err := rbac.RBACService.SetRolePermissions(ctx, &service.SetRolePermissionsRequest{
		RoleID:      req.RoleID,
		Permissions: permissions,
	})
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	c.JSON(consts.StatusOK, &rbacModel.SetRolePermissionsResponse{})
}

// SetRoleResourcePermission 设置角色对单个资源的权限
// @router /api/rbac/roles/{roleId}/resources/{resourceId}/permissions [PUT]
func SetRoleResourcePermission(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.SetRoleResourcePermissionRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	err := rbac.RBACService.SetRoleResourcePermission(ctx, &service.SetResourcePermissionRequest{
		RoleID:       req.RoleID,
		ResourceType: entity.ResourceType(req.ResourceType),
		ResourceID:   req.ResourceID,
		Actions:      req.Actions,
	})
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	c.JSON(consts.StatusOK, &rbacModel.SetRoleResourcePermissionResponse{})
}

// GetRolePermissions 获取角色的权限矩阵
// @router /api/rbac/roles/{roleId}/permissions/matrix [GET]
func GetRolePermissions(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.GetRolePermissionsRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	var resourceType *entity.ResourceType
	if req.ResourceType != nil {
		rt := entity.ResourceType(*req.ResourceType)
		resourceType = &rt
	}

	permissions, err := rbac.RBACService.GetRolePermissions(ctx, req.RoleID, resourceType)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	permInfos := make([]*rbacModel.PermissionInfo, 0, len(permissions))
	for _, perm := range permissions {
		permInfos = append(permInfos, &rbacModel.PermissionInfo{
			ID:           perm.ID,
			RoleID:       perm.RoleID,
			ResourceType: int(perm.ResourceType),
			ResourceID:   perm.ResourceID,
			Actions:      perm.Actions,
			CreatedAt:    perm.CreatedAt,
			UpdatedAt:    perm.UpdatedAt,
		})
	}

	resp := &rbacModel.GetRolePermissionsResponse{
		Data: &rbacModel.RolePermissionsData{
			Permissions: permInfos,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// GetResourcePermissions 获取资源的权限详情
// @router /api/rbac/resources/{resourceId}/permissions [GET]
func GetResourcePermissions(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.GetResourcePermissionsRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	permissions, err := rbac.RBACService.GetResourcePermissions(ctx, entity.ResourceType(req.ResourceType), req.ResourceID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	permInfos := make([]*rbacModel.RolePermissionInfo, 0, len(permissions))
	for _, perm := range permissions {
		permInfos = append(permInfos, &rbacModel.RolePermissionInfo{
			RoleID:   perm.RoleID,
			RoleName: perm.RoleName,
			Actions:  perm.Permissions,
		})
	}

	resp := &rbacModel.GetResourcePermissionsResponse{
		Data: &rbacModel.ResourcePermissionsData{
			ResourceType: req.ResourceType,
			ResourceID:   req.ResourceID,
			Permissions:  permInfos,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// ---------- 权限检查 Handler ----------

// CheckPermission 单个权限检查
// @router /api/rbac/check [POST]
func CheckPermission(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.CheckPermissionRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	hasPermission, err := rbac.RBACService.CheckPermission(ctx, &entity.PermissionCheck{
		UserID:       req.UserID,
		SpaceID:      req.SpaceID,
		ResourceType: entity.ResourceType(req.ResourceType),
		ResourceID:   req.ResourceID,
		Action:       entity.Action(req.Action),
	})
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	resp := &rbacModel.CheckPermissionResponse{
		Data: &rbacModel.PermissionCheckResult{
			HasPermission: hasPermission,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// BatchCheckPermissions 批量权限检查
// @router /api/rbac/batch-check [POST]
func BatchCheckPermissions(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.BatchCheckPermissionsRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	checks := make([]*entity.PermissionCheck, 0)
	for _, item := range req.Checks {
		for _, action := range item.Actions {
			checks = append(checks, &entity.PermissionCheck{
				UserID:       req.UserID,
				SpaceID:      req.SpaceID,
				ResourceType: entity.ResourceType(item.ResourceType),
				ResourceID:   item.ResourceID,
				Action:       entity.Action(action),
			})
		}
	}

	results, err := rbac.RBACService.BatchCheckPermissions(ctx, checks)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	resp := &rbacModel.BatchCheckPermissionsResponse{
		Data: &rbacModel.BatchPermissionCheckResult{
			Results: results,
		},
	}
	c.JSON(consts.StatusOK, resp)
}

// ---------- 资源查询 Handler ----------

// GetSpaceAgents 获取空间下的 Agent 列表
// @router /api/rbac/resources/agents [GET]
func GetSpaceAgents(ctx context.Context, c *app.RequestContext) {
	var req rbacModel.GetSpaceAgentsRequest
	if err := c.BindAndValidate(&req); err != nil {
		invalidParamRequestResponse(c, err.Error())
		return
	}

	agents, err := rbac.RBACService.GetSpaceAgents(ctx, req.SpaceID)
	if err != nil {
		internalServerErrorResponse(ctx, c, err)
		return
	}

	agentList := make([]*rbacModel.AgentInfo, 0, len(agents))
	for _, agent := range agents {
		agentList = append(agentList, &rbacModel.AgentInfo{
			ID:          agent.ID,
			Name:        agent.Name,
			Description: agent.Description,
		})
	}

	resp := &rbacModel.GetSpaceAgentsResponse{
		Data: &rbacModel.AgentListData{
			Agents: agentList,
			Total:  len(agents),
		},
	}
	c.JSON(consts.StatusOK, resp)
}
