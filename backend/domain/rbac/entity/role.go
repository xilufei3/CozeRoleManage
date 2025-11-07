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

package entity

// Role 角色实体
type Role struct {
	ID          int64   `json:"id"`
	SpaceID     int64   `json:"space_id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	IsSystem    bool    `json:"is_system"`
	CreatorID   int64   `json:"creator_id"`
	CreatedAt   int64   `json:"created_at"`
	UpdatedAt   int64   `json:"updated_at"`
	Permissions []*Permission `json:"permissions,omitempty"` // 角色的权限列表
}

// UserRole 用户角色关联
type UserRole struct {
	ID         int64 `json:"id"`
	SpaceID    int64 `json:"space_id"`
	UserID     int64 `json:"user_id"`
	RoleID     int64 `json:"role_id"`
	AssignedBy int64 `json:"assigned_by"`
	CreatedAt  int64 `json:"created_at"`
}

// Permission 权限实体
type Permission struct {
	ID           int64        `json:"id"`
	RoleID       int64        `json:"role_id"`
	ResourceType ResourceType `json:"resource_type"`
	ResourceID   int64        `json:"resource_id"` // 0表示所有资源
	Actions      []string     `json:"actions"`
	CreatedAt    int64        `json:"created_at"`
	UpdatedAt    int64        `json:"updated_at"`
}

// UserPermissions 用户的权限信息（聚合）
type UserPermissions struct {
	UserID            int64                     `json:"user_id"`
	SpaceID           int64                     `json:"space_id"`
	Roles             []*Role                   `json:"roles"`                       // 用户拥有的角色
	Permissions       map[ResourceType][]Action `json:"permissions"`                 // 聚合后的权限（按资源类型）
	DetailPermissions []*Permission             `json:"detail_permissions,omitempty"` // 详细权限列表（包含具体资源ID）
}

// PermissionCheck 权限检查请求
type PermissionCheck struct {
	UserID       int64        `json:"user_id"`
	SpaceID      int64        `json:"space_id"`
	ResourceType ResourceType `json:"resource_type"`
	ResourceID   int64        `json:"resource_id"`
	Action       Action       `json:"action"`
}


