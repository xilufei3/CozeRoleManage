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

package middleware

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/protocol/consts"

	"github.com/coze-dev/coze-studio/backend/application/rbac"
	"github.com/coze-dev/coze-studio/backend/domain/rbac/entity"
	"github.com/coze-dev/coze-studio/backend/pkg/logs"
)

// RBACMiddleware 权限检查中间件
// 使用示例：
//   router.POST("/api/agent/create", middleware.RBACMiddleware(entity.ResourceTypeAgent, entity.ActionCreate), handler)
func RBACMiddleware(resourceType entity.ResourceType, action entity.Action) app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		// 从上下文获取用户ID和SpaceID
		userID := getUserIDFromContext(c)
		spaceID := getSpaceIDFromContext(c)

		if userID == 0 || spaceID == 0 {
			logs.Warnf("[RBAC] Missing userID or spaceID in context")
			c.JSON(consts.StatusForbidden, map[string]interface{}{
				"code": 403,
				"msg":  "Forbidden: missing user or space information",
			})
			c.Abort()
			return
		}

		// 从请求中获取resourceID（如果是针对特定资源的操作）
		resourceID := getResourceIDFromRequest(c)

		// 权限检查
		hasPermission, err := rbac.RBACService.CheckPermission(ctx, &entity.PermissionCheck{
			UserID:       userID,
			SpaceID:      spaceID,
			ResourceType: resourceType,
			ResourceID:   resourceID,
			Action:       action,
		})

		if err != nil {
			logs.Errorf("[RBAC] Check permission failed: %v", err)
			c.JSON(consts.StatusInternalServerError, map[string]interface{}{
				"code": 500,
				"msg":  "Internal server error",
			})
			c.Abort()
			return
		}

		if !hasPermission {
			logs.Warnf("[RBAC] Permission denied for user=%d, space=%d, resource=%d, action=%s",
				userID, spaceID, resourceType, action)
			c.JSON(consts.StatusForbidden, map[string]interface{}{
				"code": 403,
				"msg":  fmt.Sprintf("Forbidden: you don't have permission to %s this resource", action),
			})
			c.Abort()
			return
		}

		// 权限通过，继续处理
		c.Next(ctx)
	}
}

// CheckPermissionFunc 权限检查函数，用于在Handler内部灵活检查权限
func CheckPermissionFunc(ctx context.Context, userID, spaceID int64, resourceType entity.ResourceType, resourceID int64, action entity.Action) (bool, error) {
	return rbac.RBACService.CheckPermission(ctx, &entity.PermissionCheck{
		UserID:       userID,
		SpaceID:      spaceID,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Action:       action,
	})
}

// RequireAnyPermission 要求用户拥有多个权限中的任意一个
func RequireAnyPermission(resourceType entity.ResourceType, actions ...entity.Action) app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		userID := getUserIDFromContext(c)
		spaceID := getSpaceIDFromContext(c)

		if userID == 0 || spaceID == 0 {
			c.JSON(consts.StatusForbidden, map[string]interface{}{
				"code": 403,
				"msg":  "Forbidden",
			})
			c.Abort()
			return
		}

		resourceID := getResourceIDFromRequest(c)

		// 检查是否有任意一个权限
		for _, action := range actions {
			hasPermission, err := rbac.RBACService.CheckPermission(ctx, &entity.PermissionCheck{
				UserID:       userID,
				SpaceID:      spaceID,
				ResourceType: resourceType,
				ResourceID:   resourceID,
				Action:       action,
			})

			if err == nil && hasPermission {
				c.Next(ctx)
				return
			}
		}

		// 没有任何一个权限
		c.JSON(consts.StatusForbidden, map[string]interface{}{
			"code": 403,
			"msg":  "Forbidden: insufficient permissions",
		})
		c.Abort()
	}
}

// RequireAllPermissions 要求用户拥有所有指定的权限
func RequireAllPermissions(resourceType entity.ResourceType, actions ...entity.Action) app.HandlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		userID := getUserIDFromContext(c)
		spaceID := getSpaceIDFromContext(c)

		if userID == 0 || spaceID == 0 {
			c.JSON(consts.StatusForbidden, map[string]interface{}{
				"code": 403,
				"msg":  "Forbidden",
			})
			c.Abort()
			return
		}

		resourceID := getResourceIDFromRequest(c)

		// 检查是否拥有所有权限
		for _, action := range actions {
			hasPermission, err := rbac.RBACService.CheckPermission(ctx, &entity.PermissionCheck{
				UserID:       userID,
				SpaceID:      spaceID,
				ResourceType: resourceType,
				ResourceID:   resourceID,
				Action:       action,
			})

			if err != nil || !hasPermission {
				c.JSON(consts.StatusForbidden, map[string]interface{}{
					"code": 403,
					"msg":  fmt.Sprintf("Forbidden: missing %s permission", action),
				})
				c.Abort()
				return
			}
		}

		c.Next(ctx)
	}
}

// ---------- 辅助函数 ----------

// getUserIDFromContext 从上下文获取用户ID
func getUserIDFromContext(c *app.RequestContext) int64 {
	// 从hertz context获取
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(int64); ok {
			return id
		}
	}

	// 临时方案：从header获取
	if userIDStr := c.GetHeader("X-User-ID"); len(userIDStr) > 0 {
		var userID int64
		fmt.Sscanf(string(userIDStr), "%d", &userID)
		return userID
	}

	return 0
}

// getSpaceIDFromContext 从上下文或请求获取SpaceID
func getSpaceIDFromContext(c *app.RequestContext) int64 {
	// 从hertz context获取
	if spaceID, exists := c.Get("space_id"); exists {
		if id, ok := spaceID.(int64); ok {
			return id
		}
	}

	// 从路径参数获取
	if spaceIDStr := c.Param("space_id"); spaceIDStr != "" {
		var spaceID int64
		fmt.Sscanf(spaceIDStr, "%d", &spaceID)
		return spaceID
	}

	// 从请求参数获取
	if spaceIDStr := c.Query("space_id"); spaceIDStr != "" {
		var spaceID int64
		fmt.Sscanf(spaceIDStr, "%d", &spaceID)
		return spaceID
	}

	// 从header获取
	if spaceIDStr := c.GetHeader("X-Space-ID"); len(spaceIDStr) > 0 {
		var spaceID int64
		fmt.Sscanf(string(spaceIDStr), "%d", &spaceID)
		return spaceID
	}

	return 0
}

// getResourceIDFromRequest 从请求中获取资源ID
func getResourceIDFromRequest(c *app.RequestContext) int64 {
	// 优先从路径参数获取
	if resourceIDStr := c.Param("resourceId"); resourceIDStr != "" {
		var resourceID int64
		fmt.Sscanf(resourceIDStr, "%d", &resourceID)
		return resourceID
	}

	// 从其他常见的参数名获取
	params := []string{"id", "agent_id", "workflow_id", "knowledge_id", "plugin_id", "database_id"}
	for _, param := range params {
		if idStr := c.Param(param); idStr != "" {
			var id int64
			fmt.Sscanf(idStr, "%d", &id)
			return id
		}
		if idStr := c.Query(param); idStr != "" {
			var id int64
			fmt.Sscanf(idStr, "%d", &id)
			return id
		}
	}

	// 如果获取不到，返回0（表示检查对该类型所有资源的权限）
	return 0
}


