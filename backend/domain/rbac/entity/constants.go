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

// ResourceType 资源类型
type ResourceType int

const (
	ResourceTypeAgent     ResourceType = 4  // Agent/智能体
	ResourceTypePlugin    ResourceType = 5  // Plugin/插件
	ResourceTypeWorkflow  ResourceType = 6  // Workflow/工作流
	ResourceTypeKnowledge ResourceType = 7  // Knowledge/知识库
	ResourceTypePrompt    ResourceType = 17 // Prompt/提示词
	ResourceTypeDatabase  ResourceType = 23 // Database/数据库
)

// ResourceTypeAll 所有资源ID为0时表示该类型的所有资源
const ResourceTypeAll int64 = 0

// Action 操作类型
type Action string

const (
	ActionCreate  Action = "create"  // 创建
	ActionRead    Action = "read"    // 读取/查看
	ActionUpdate  Action = "update"  // 更新/编辑
	ActionDelete  Action = "delete"  // 删除
	ActionExecute Action = "execute" // 执行/运行
	ActionPublish Action = "publish" // 发布
	ActionManage  Action = "manage"  // 管理（用于知识库）
	ActionQuery   Action = "query"   // 查询（用于数据库）
	ActionInstall Action = "install" // 安装（用于插件）
)

// GetResourceTypeActions 返回各资源类型支持的操作
func GetResourceTypeActions(resourceType ResourceType) []Action {
	switch resourceType {
	case ResourceTypeAgent:
		return []Action{ActionCreate, ActionRead, ActionUpdate, ActionDelete, ActionExecute, ActionPublish}
	case ResourceTypeWorkflow:
		return []Action{ActionCreate, ActionRead, ActionUpdate, ActionDelete, ActionExecute, ActionPublish}
	case ResourceTypeKnowledge:
		return []Action{ActionCreate, ActionRead, ActionUpdate, ActionDelete, ActionManage}
	case ResourceTypePlugin:
		return []Action{ActionCreate, ActionRead, ActionUpdate, ActionDelete, ActionInstall}
	case ResourceTypePrompt:
		return []Action{ActionCreate, ActionRead, ActionUpdate, ActionDelete}
	case ResourceTypeDatabase:
		return []Action{ActionCreate, ActionRead, ActionUpdate, ActionDelete, ActionQuery}
	default:
		return []Action{}
	}
}

// ResourceTypeName 返回资源类型的名称
func ResourceTypeName(rt ResourceType) string {
	switch rt {
	case ResourceTypeAgent:
		return "agent"
	case ResourceTypePlugin:
		return "plugin"
	case ResourceTypeWorkflow:
		return "workflow"
	case ResourceTypeKnowledge:
		return "knowledge"
	case ResourceTypePrompt:
		return "prompt"
	case ResourceTypeDatabase:
		return "database"
	default:
		return "unknown"
	}
}



