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

export interface ResourceTypeMeta {
  id: number;
  resType: number;
  name: string;
  displayName: string;
  actions: string[];
}

export const AGENT_RESOURCE_TYPE_ID = 4;

export const RESOURCE_TYPES: ResourceTypeMeta[] = [
  {
    id: AGENT_RESOURCE_TYPE_ID,
    resType: 8,
    name: 'Agent',
    displayName: 'Agent (智能体)',
    actions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  {
    id: 5,
    resType: 1,
    name: 'Plugin',
    displayName: 'Plugin (插件)',
    actions: ['create', 'read', 'update', 'delete', 'execute'],
  },
  {
    id: 6,
    resType: 2,
    name: 'Workflow',
    displayName: 'Workflow (工作流)',
    actions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  {
    id: 7,
    resType: 4,
    name: 'Knowledge',
    displayName: 'Knowledge (知识库)',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    id: 17,
    resType: 6,
    name: 'Prompt',
    displayName: 'Prompt (提示词)',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    id: 23,
    resType: 7,
    name: 'Database',
    displayName: 'Database (数据库)',
    actions: ['create', 'read', 'update', 'delete', 'query'],
  },
];
