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

import {
  AGENT_RESOURCE_TYPE_ID,
  RESOURCE_TYPES,
  type ResourceTypeMeta,
} from '../constants/resource-types';
import {
  getSpaceAgents,
  getSpaceResources,
  type SpaceResource,
} from '../../../api/rbac';

export interface ResourceItem {
  id: string;
  name: string;
}

export interface FetchResourceMapResult {
  resourceMap: Record<number, ResourceItem[]>;
  errors: Array<{ resourceType: ResourceTypeMeta; error: unknown }>;
}

export async function fetchResourcesByType(
  spaceId: string,
  resourceType: ResourceTypeMeta,
): Promise<ResourceItem[]> {
  if (!spaceId) {
    return [];
  }

  if (resourceType.id === AGENT_RESOURCE_TYPE_ID) {
    const data = await getSpaceAgents(spaceId);
    return (data.agents || []).map(agent => ({
      id: (agent.id || '').toString(),
      name: agent.name || '未命名 Agent',
    }));
  }

  const data = await getSpaceResources(spaceId, [resourceType.resType]);
  return (data.resource_list || []).map((resource: SpaceResource) => ({
    id: (resource.res_id || resource.id || '').toString(),
    name: resource.name || '未命名资源',
  }));
}

export async function fetchResourceMap(
  spaceId: string,
  resourceTypes: ResourceTypeMeta[] = RESOURCE_TYPES,
): Promise<FetchResourceMapResult> {
  const resourceMap: Record<number, ResourceItem[]> = {};
  const errors: Array<{ resourceType: ResourceTypeMeta; error: unknown }> = [];

  await Promise.all(
    resourceTypes.map(async resourceType => {
      try {
        const list = await fetchResourcesByType(spaceId, resourceType);
        resourceMap[resourceType.id] = list;
      } catch (error) {
        console.warn(
          `[resourceLoader] 加载 ${resourceType.name} 资源列表失败`,
          error,
        );
        resourceMap[resourceType.id] = [];
        errors.push({ resourceType, error });
      }
    }),
  );

  return { resourceMap, errors };
}
