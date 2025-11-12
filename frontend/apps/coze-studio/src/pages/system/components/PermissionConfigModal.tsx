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

import { useEffect, useState } from 'react';

import {
  Modal,
  Card,
  Tag,
  Checkbox,
  Select,
  Space,
  Toast,
  Typography,
} from '@coze-arch/coze-design';

import {
  getSpaceResources,
  getSpaceAgents,
  type SpaceResource,
} from '@/api/rbac';

const { Text } = Typography;

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface ResourceType {
  id: number;
  resType: number;
  name: string;
  color: string;
  actions: string[];
}

// 资源类型常量
const RESOURCE_TYPES: ResourceType[] = [
  {
    id: 4,
    resType: 8,
    name: 'Agent',
    color: 'blue',
    actions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  {
    id: 5,
    resType: 1,
    name: 'Plugin',
    color: 'green',
    actions: ['create', 'read', 'update', 'delete', 'execute'],
  },
  {
    id: 6,
    resType: 2,
    name: 'Workflow',
    color: 'orange',
    actions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  {
    id: 7,
    resType: 4,
    name: 'Knowledge',
    color: 'red',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    id: 17,
    resType: 6,
    name: 'Prompt',
    color: 'purple',
    actions: ['create', 'read', 'update', 'delete'],
  },
  {
    id: 23,
    resType: 7,
    name: 'Database',
    color: 'cyan',
    actions: ['create', 'read', 'update', 'delete', 'query'],
  },
];

interface PermissionConfigModalProps {
  visible: boolean;
  currentRole: Role | null;
  permissions: Record<string, string[]>;
  onPermissionChange: (key: string, actions: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
  spaceId: string;
}

// eslint-disable-next-line @coze-arch/max-line-per-function -- 复杂的权限配置模态框，已拆分为独立组件
export function PermissionConfigModal({
  visible,
  currentRole,
  permissions,
  onPermissionChange,
  onSave,
  onCancel,
  spaceId,
}: PermissionConfigModalProps) {
  const [resourceLists, setResourceLists] = useState<
    Record<number, Array<{ id: string; name: string }>>
  >({});
  const [selectedResources, setSelectedResources] = useState<
    Record<number, string[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 加载所有资源类型的资源列表
  useEffect(() => {
    if (visible && spaceId) {
      setIsInitialized(false); // 重置初始化状态
      loadAllResources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAllResources 在组件内部定义，不需要作为依赖
  }, [visible, spaceId]);

  // 当资源列表加载完成后，初始化已选中的资源
  useEffect(() => {
    if (visible && Object.keys(resourceLists).length > 0 && !isInitialized) {
      initializeSelectedResources();
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initializeSelectedResources 在组件内部定义，不需要作为依赖
  }, [visible, resourceLists, isInitialized]);

  const loadAllResources = async () => {
    setLoading(true);
    try {
      const results: Record<number, Array<{ id: string; name: string }>> = {};

      // 为每种资源类型加载资源列表
      for (const resourceType of RESOURCE_TYPES) {
        try {
          // Agent (id=4) 使用专门的 API
          const AGENT_RESOURCE_TYPE_ID = 4;
          if (resourceType.id === AGENT_RESOURCE_TYPE_ID) {
            const data = await getSpaceAgents(spaceId);
            const mappedResources = (data.agents || []).map(agent => ({
              id: (agent.id || '').toString(),
              name: agent.name || '未命名 Agent',
            }));
            results[resourceType.id] = mappedResources;
          } else {
            // 其他资源类型使用 library_resource_list API
            const data = await getSpaceResources(spaceId, [
              resourceType.resType,
            ]);
            const mappedResources = (data.resource_list || []).map(
              (r: SpaceResource) => ({
                id: (r.res_id || r.id || '').toString(),
                name: r.name || '未命名资源',
              }),
            );
            results[resourceType.id] = mappedResources;
          }
        } catch (error) {
          console.warn(`加载 ${resourceType.name} 资源列表失败:`, error);
          results[resourceType.id] = [];
        }
      }

      setResourceLists(results);
    } catch (error) {
      Toast.error('加载资源列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化已选中的资源（从现有权限中提取）
  const initializeSelectedResources = () => {
    if (Object.keys(permissions).length === 0) {
      return;
    }

    const BASE = 10;
    const selected: Record<number, string[]> = {};
    Object.keys(permissions).forEach(key => {
      const [resourceType, resourceId] = key.split('_');
      const type = parseInt(resourceType, BASE);

      // 跳过"所有资源"(resource_id = 0)
      if (resourceId === '0' || resourceId === '') {
        return;
      }

      if (!selected[type]) {
        selected[type] = [];
      }

      // 只添加具体资源
      selected[type].push(resourceId);
    });

    setSelectedResources(selected);
  };

  const handleResourceSelectionChange = (
    resourceType: number,
    values: string[],
  ) => {
    setSelectedResources(prev => ({
      ...prev,
      [resourceType]: values,
    }));
  };

  const handlePermissionChangeForResource = (
    resourceType: number,
    resourceId: string,
    actions: string[],
  ) => {
    const key = `${resourceType}_${resourceId}`;
    onPermissionChange(key, actions);
  };

  return (
    <Modal
      title={`配置权限 - ${currentRole?.name}`}
      visible={visible}
      onOk={onSave}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={700}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}
    >
      <div>
        <Text type="secondary" className="mb-4 block">
          为角色配置细粒度资源权限。可以选择"所有资源"或指定具体资源实例。
        </Text>

        {loading ? (
          <div className="text-center py-8">加载资源列表中...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {RESOURCE_TYPES.map(resource => {
              const resourceList = resourceLists[resource.id] || [];
              const selected = selectedResources[resource.id] || [];

              // "所有资源"的key
              const allResourcesKey = `${resource.id}_0`;

              return (
                <Card
                  key={resource.id}
                  title={
                    <div className="flex items-center justify-between">
                      <Tag>{resource.name}</Tag>
                      <Text type="secondary" className="text-sm">
                        共 {resourceList.length} 个资源
                      </Text>
                    </div>
                  }
                  className="mb-4"
                  bordered
                >
                  {/* 所有资源权限配置 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <Text className="mb-2 block font-medium">
                      对所有 {resource.name} 资源的权限
                    </Text>
                    <Checkbox.Group
                      value={permissions[allResourcesKey] || []}
                      onChange={(values: string[]) =>
                        handlePermissionChangeForResource(
                          resource.id,
                          '0',
                          values,
                        )
                      }
                    >
                      <Space wrap>
                        {resource.actions.map(action => (
                          <Checkbox key={action} value={action}>
                            {action}
                          </Checkbox>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </div>

                  {/* 特定资源选择器 */}
                  {resourceList.length > 0 && (
                    <div className="border-t pt-4">
                      <Text className="mb-2 block font-medium">
                        选择特定资源进行细粒度权限配置
                      </Text>
                      <ResourceSelector
                        selected={selected}
                        resourceList={resourceList}
                        resourceId={resource.id}
                        permissions={permissions}
                        resourceActions={resource.actions}
                        onSelectionChange={handleResourceSelectionChange}
                        onPermissionChange={handlePermissionChangeForResource}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// 提取资源选择器组件
interface ResourceSelectorProps {
  selected: string[];
  resourceList: Array<{ id: string; name: string }>;
  resourceId: number;
  permissions: Record<string, string[]>;
  resourceActions: string[];
  onSelectionChange: (resourceType: number, values: string[]) => void;
  onPermissionChange: (
    resourceType: number,
    resourceId: string,
    actions: string[],
  ) => void;
}

function ResourceSelector({
  selected,
  resourceList,
  resourceId,
  permissions,
  resourceActions,
  onSelectionChange,
  onPermissionChange,
}: ResourceSelectorProps) {
  return (
    <>
      <Select
        multiple
        placeholder="选择资源实例..."
        style={{ width: '100%', marginBottom: 12 }}
        value={selected}
        onChange={values =>
          onSelectionChange(resourceId, (values as string[]) || [])
        }
      >
        {resourceList.map(r => (
          <Select.Option key={r.id} value={r.id}>
            {r.name}
          </Select.Option>
        ))}
      </Select>

      {/* 为每个选中的资源配置权限 */}
      {selected.length > 0 && (
        <div className="space-y-3">
          {selected.map(resId => {
            const resourceName =
              resourceList.find(r => r.id === resId)?.name || resId;
            const key = `${resourceId}_${resId}`;

            // 获取"所有资源"的权限
            const allResourcesKey = `${resourceId}_0`;
            const allResourceActions = permissions[allResourcesKey] || [];

            // 合并权限：具体资源的权限 + 所有资源的权限
            const specificActions = permissions[key] || [];
            const mergedActions = Array.from(
              new Set([...allResourceActions, ...specificActions]),
            );

            return (
              <div key={resId} className="p-2 bg-blue-50 rounded">
                <Text className="mb-1 block text-sm">
                  {resourceName}
                  {allResourceActions.length > 0 && (
                    <Text type="secondary" className="text-xs ml-2">
                      (已继承所有资源的 {allResourceActions.length} 个权限)
                    </Text>
                  )}
                </Text>
                <Checkbox.Group
                  value={mergedActions}
                  onChange={(values: string[]) => {
                    // 从选中的值中去除"所有资源"的权限，只保存额外的权限
                    const extraActions = (values as string[]).filter(
                      v => !allResourceActions.includes(v),
                    );
                    onPermissionChange(resourceId, resId, extraActions);
                  }}
                >
                  <Space wrap>
                    {resourceActions.map(action => {
                      const isFromAll = allResourceActions.includes(action);
                      return (
                        <Checkbox
                          key={action}
                          value={action}
                          className="text-sm"
                          disabled={isFromAll}
                        >
                          {action}
                          {isFromAll ? (
                            <Text type="secondary" className="text-xs ml-1">
                              (继承)
                            </Text>
                          ) : null}
                        </Checkbox>
                      );
                    })}
                  </Space>
                </Checkbox.Group>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
