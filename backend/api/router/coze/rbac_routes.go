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
	"github.com/cloudwego/hertz/pkg/app/server"
	coze "github.com/coze-dev/coze-studio/backend/api/handler/coze"
)

// RegisterRBACRoutes 注册RBAC相关路由
func RegisterRBACRoutes(h *server.Hertz) {
	rbac := h.Group("/api/rbac")
	{
		// 角色管理
		roles := rbac.Group("/roles")
		{
			roles.POST("", coze.CreateRole)            // 创建角色
			roles.PUT("/:roleId", coze.UpdateRole)     // 更新角色
			roles.DELETE("/:roleId", coze.DeleteRole)  // 删除角色
			roles.GET("/:roleId", coze.GetRole)        // 获取角色详情
			roles.GET("", coze.ListRoles)              // 查询角色列表

			// 角色权限管理
			roles.POST("/:roleId/permissions/batch", coze.SetRolePermissions) // 批量设置角色权限
			roles.GET("/:roleId/permissions/matrix", coze.GetRolePermissions)  // 获取角色权限矩阵
			roles.PUT("/:roleId/resources/:resourceId/permissions", coze.SetRoleResourcePermission) // 设置单个资源权限
		}

		// 用户角色分配
		users := rbac.Group("/users")
		{
			users.POST("/:userId/roles", coze.AssignRoleToUser)           // 为用户分配角色
			users.DELETE("/:userId/roles/:roleId", coze.RemoveUserRole)   // 移除用户角色
			users.GET("/:userId/roles", coze.GetUserRoles)                // 获取用户角色列表
			users.GET("/:userId/permissions", coze.GetUserPermissions)    // 获取用户权限
		}

		// 资源权限查询
		resources := rbac.Group("/resources")
		{
			resources.GET("/:resourceId/permissions", coze.GetResourcePermissions) // 获取资源权限详情
			resources.GET("/agents", coze.GetSpaceAgents)                          // 获取空间下的 Agent 列表
		}

		// 权限检查
		rbac.POST("/check", coze.CheckPermission)             // 单个权限检查
		rbac.POST("/batch-check", coze.BatchCheckPermissions) // 批量权限检查
	}
}




