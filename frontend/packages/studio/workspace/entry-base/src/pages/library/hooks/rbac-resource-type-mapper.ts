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

import { RBACResourceType } from '@coze-common/auth';

/**
 * library_resource_list API 的资源类型 (ResType) 到 RBAC 资源类型的映射
 *
 * library_resource_list ResType:
 * - 1 = Plugin
 * - 2 = Workflow
 * - 4 = Knowledge
 * - 6 = Prompt
 * - 7 = Database
 *
 * RBAC ResourceType:
 * - 4 = Agent
 * - 5 = Plugin
 * - 6 = Workflow
 * - 7 = Knowledge
 * - 17 = Prompt
 * - 23 = Database
 */
export const RES_TYPE_TO_RBAC_TYPE: Record<number, RBACResourceType> = {
  1: RBACResourceType.Plugin,      // Plugin: 1 -> 5
  2: RBACResourceType.Workflow,    // Workflow: 2 -> 6
  4: RBACResourceType.Knowledge,   // Knowledge: 4 -> 7
  6: RBACResourceType.Prompt,      // Prompt: 6 -> 17
  7: RBACResourceType.Database,    // Database: 7 -> 23
};

/**
 * 将 library_resource_list 的 res_type 转换为 RBAC 的 resource_type
 * @param resType library_resource_list 的资源类型
 * @returns RBAC 的资源类型
 */
export const mapResTypeToRBACType = (
  resType: number | undefined,
): RBACResourceType | undefined => {
  if (resType === undefined) {
    return undefined;
  }
  return RES_TYPE_TO_RBAC_TYPE[resType];
};

