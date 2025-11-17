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

/**
 * RBAC资源类型枚举
 * 对应后端 backend/domain/rbac/entity/constants.go
 */
export enum RBACResourceType {
  Agent = 4,      // Agent/智能体
  Plugin = 5,     // Plugin/插件
  Workflow = 6,   // Workflow/工作流
  Knowledge = 7,  // Knowledge/知识库
  Prompt = 17,    // Prompt/提示词
  Database = 23,  // Database/数据库
}

/**
 * RBAC操作类型枚举
 * 9种操作：create, read, update, delete, execute, publish, install, manage, query
 */
export enum RBACAction {
  Create = 'create',     // 创建
  Read = 'read',         // 读取/查看
  Update = 'update',     // 更新/编辑
  Delete = 'delete',     // 删除
  Execute = 'execute',   // 执行/运行
  Publish = 'publish',   // 发布
  Install = 'install',   // 安装（主要用于Plugin）
  Manage = 'manage',     // 管理（主要用于Knowledge）
  Query = 'query',       // 查询（主要用于Database）
}

/**
 * 每种资源类型支持的操作
 */
export const RESOURCE_ACTIONS_MAP: Record<RBACResourceType, RBACAction[]> = {
  [RBACResourceType.Agent]: [
    RBACAction.Create,
    RBACAction.Read,
    RBACAction.Update,
    RBACAction.Delete,
    RBACAction.Execute,
    RBACAction.Publish,
  ],
  [RBACResourceType.Plugin]: [
    RBACAction.Create,
    RBACAction.Read,
    RBACAction.Update,
    RBACAction.Delete,
    RBACAction.Install,
  ],
  [RBACResourceType.Workflow]: [
    RBACAction.Create,
    RBACAction.Read,
    RBACAction.Update,
    RBACAction.Delete,
    RBACAction.Execute,
    RBACAction.Publish,
  ],
  [RBACResourceType.Knowledge]: [
    RBACAction.Create,
    RBACAction.Read,
    RBACAction.Update,
    RBACAction.Delete,
    RBACAction.Manage,
  ],
  [RBACResourceType.Prompt]: [
    RBACAction.Create,
    RBACAction.Read,
    RBACAction.Update,
    RBACAction.Delete,
  ],
  [RBACResourceType.Database]: [
    RBACAction.Create,
    RBACAction.Read,
    RBACAction.Update,
    RBACAction.Delete,
    RBACAction.Query,
  ],
};

/**
 * 资源类型名称映射
 */
export const RESOURCE_TYPE_NAMES: Record<RBACResourceType, string> = {
  [RBACResourceType.Agent]: 'Agent',
  [RBACResourceType.Plugin]: 'Plugin',
  [RBACResourceType.Workflow]: 'Workflow',
  [RBACResourceType.Knowledge]: 'Knowledge',
  [RBACResourceType.Prompt]: 'Prompt',
  [RBACResourceType.Database]: 'Database',
};

/**
 * 操作名称映射（中文）
 */
export const ACTION_NAMES_ZH: Record<RBACAction, string> = {
  [RBACAction.Create]: '创建',
  [RBACAction.Read]: '查看',
  [RBACAction.Update]: '编辑',
  [RBACAction.Delete]: '删除',
  [RBACAction.Execute]: '执行',
  [RBACAction.Publish]: '发布',
  [RBACAction.Install]: '安装',
  [RBACAction.Manage]: '管理',
  [RBACAction.Query]: '查询',
};

/**
 * 操作名称映射（英文）
 */
export const ACTION_NAMES_EN: Record<RBACAction, string> = {
  [RBACAction.Create]: 'Create',
  [RBACAction.Read]: 'Read',
  [RBACAction.Update]: 'Update',
  [RBACAction.Delete]: 'Delete',
  [RBACAction.Execute]: 'Execute',
  [RBACAction.Publish]: 'Publish',
  [RBACAction.Install]: 'Install',
  [RBACAction.Manage]: 'Manage',
  [RBACAction.Query]: 'Query',
};

