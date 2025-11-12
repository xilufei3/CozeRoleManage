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

import { useCallback, useEffect, useState } from 'react';

import { Modal, Card, Tag, Space, Typography } from '@coze-arch/coze-design';

import {
  getSpaceResources,
  getSpaceAgents,
  type UserPermissions,
} from '@/api/rbac';

const { Text } = Typography;

// 资源类型常量
const RESOURCE_TYPE_AGENT = 4;
const RESOURCE_TYPE_PLUGIN = 5;
const RESOURCE_TYPE_WORKFLOW = 6;
const RESOURCE_TYPE_KNOWLEDGE = 7;
const RESOURCE_TYPE_PROMPT = 17;
const RESOURCE_TYPE_DATABASE = 23;

// 资源类型与 API 参数的映射
const RES_TYPE_PLUGIN = 1;
const RES_TYPE_WORKFLOW = 2;
const RES_TYPE_KNOWLEDGE = 4;
const RES_TYPE_PROMPT = 6;
const RES_TYPE_DATABASE = 7;

// 资源类型信息映射
const RESOURCE_TYPE_MAP: Record<
  string,
  { name: string; color: string; validActions: string[] }
> = {
  '4': {
    name: 'Agent (智能体)',
    color: 'blue',
    validActions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  '5': {
    name: 'Plugin (插件)',
    color: 'green',
    validActions: ['create', 'read', 'update', 'delete', 'install'],
  },
  '6': {
    name: 'Workflow (工作流)',
    color: 'orange',
    validActions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  '7': {
    name: 'Knowledge (知识库)',
    color: 'red',
    validActions: ['create', 'read', 'update', 'delete', 'manage'],
  },
  '17': {
    name: 'Prompt (提示词)',
    color: 'purple',
    validActions: ['create', 'read', 'update', 'delete'],
  },
  '23': {
    name: 'Database (数据库)',
    color: 'cyan',
    validActions: ['create', 'read', 'update', 'delete', 'query'],
  },
};

interface Permission {
  id: string;
  role_id: string;
  resource_type: number;
  resource_id: string | number;
  actions: string[];
  created_at: number;
  updated_at: number;
}

interface UserPermissionDetailModalProps {
  visible: boolean;
  userPermission: UserPermissions | null;
  onClose: () => void;
}

// eslint-disable-next-line @coze-arch/max-line-per-function -- 复杂的权限详情模态框，已拆分为独立组件
export function UserPermissionDetailModal({
  visible,
  userPermission,
  onClose,
}: UserPermissionDetailModalProps) {
  const [resourceNames, setResourceNames] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const loadResourceNames = useCallback(async () => {
    if (!userPermission) {
      return;
    }

    setLoading(true);
    try {
      const names: Record<string, string> = {};

      // 获取所有需要的资源类型
      const resourceTypes =
        userPermission.detail_permissions?.map(p => p.resource_type) || [];
      const uniqueTypes = Array.from(new Set(resourceTypes));

      for (const type of uniqueTypes) {
        try {
          if (type === RESOURCE_TYPE_AGENT) {
            // Agent
            const data = await getSpaceAgents(userPermission.space_id);
            data.agents.forEach(agent => {
              names[`${RESOURCE_TYPE_AGENT}_${agent.id}`] =
                agent.name || '未命名 Agent';
            });
          } else if (type === RESOURCE_TYPE_PLUGIN) {
            // Plugin
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_PLUGIN,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              names[`${RESOURCE_TYPE_PLUGIN}_${id}`] = r.name || '未命名插件';
            });
          } else if (type === RESOURCE_TYPE_WORKFLOW) {
            // Workflow
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_WORKFLOW,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              names[`${RESOURCE_TYPE_WORKFLOW}_${id}`] =
                r.name || '未命名工作流';
            });
          } else if (type === RESOURCE_TYPE_KNOWLEDGE) {
            // Knowledge
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_KNOWLEDGE,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              names[`${RESOURCE_TYPE_KNOWLEDGE}_${id}`] =
                r.name || '未命名知识库';
            });
          } else if (type === RESOURCE_TYPE_PROMPT) {
            // Prompt
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_PROMPT,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              names[`${RESOURCE_TYPE_PROMPT}_${id}`] = r.name || '未命名提示词';
            });
          } else if (type === RESOURCE_TYPE_DATABASE) {
            // Database
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_DATABASE,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              names[`${RESOURCE_TYPE_DATABASE}_${id}`] =
                r.name || '未命名数据库';
            });
          }
        } catch (error) {
          console.warn(`加载资源类型 ${type} 失败:`, error);
        }
      }

      setResourceNames(names);
    } catch (error) {
      console.error('加载资源名称失败:', error);
    } finally {
      setLoading(false);
    }
  }, [userPermission]);

  // 加载所有资源名称
  useEffect(() => {
    if (visible && userPermission) {
      loadResourceNames();
    }
  }, [visible, userPermission, loadResourceNames]);

  // 按资源类型分组详细权限
  const emptyPermissions: Record<string, Permission[]> = {};
  const groupedPermissions: Record<string, Permission[]> =
    userPermission?.detail_permissions?.reduce((acc, perm) => {
      const typeKey = perm.resource_type.toString();
      if (!acc[typeKey]) {
        acc[typeKey] = [];
      }
      acc[typeKey].push(perm);
      return acc;
    }, emptyPermissions) || {};

  return (
    <Modal
      title="用户权限详情"
      visible={visible}
      onOk={onClose}
      onCancel={onClose}
      okText="关闭"
      cancelText=""
      width={700}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto', padding: '24px' }}
    >
      {userPermission ? (
        <div>
          <div className="mb-4">
            <Text strong>基本信息</Text>
            <div className="mt-2 space-y-2">
              <div>
                <Text type="secondary">用户 ID: </Text>
                <Text>{userPermission.user_id}</Text>
              </div>
              <div>
                <Text type="secondary">工作空间 ID: </Text>
                <Text>{userPermission.space_id}</Text>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <Text strong className="mb-2 block">
              拥有角色
            </Text>
            <Space wrap>
              {userPermission.roles?.map(role => (
                <Tag key={role.id} color="blue">
                  {role.name}
                </Tag>
              ))}
            </Space>
          </div>

          <div>
            <Text strong className="mb-2 block">
              详细权限
            </Text>
            {loading ? (
              <div className="text-center py-4">加载资源信息中...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(groupedPermissions).map(
                  ([resourceType, permissions]) => (
                    <PermissionCard
                      key={resourceType}
                      resourceType={resourceType}
                      permissions={permissions}
                      resourceNames={resourceNames}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// 提取权限卡片组件
interface PermissionCardProps {
  resourceType: string;
  permissions: Permission[];
  resourceNames: Record<string, string>;
}

function PermissionCard({
  resourceType,
  permissions,
  resourceNames,
}: PermissionCardProps) {
  const resourceInfo = RESOURCE_TYPE_MAP[resourceType] || {
    name: `未知资源类型 ${resourceType}`,
    color: 'default',
    validActions: [],
  };

  return (
    <Card title={<Tag>{resourceInfo.name}</Tag>} bordered>
      <div className="flex flex-col gap-3">
        <PermissionItems
          permissions={permissions}
          resourceNames={resourceNames}
          validActions={resourceInfo.validActions}
        />
      </div>
    </Card>
  );
}

// 提取权限项组件
interface PermissionItemsProps {
  permissions: Permission[];
  resourceNames: Record<string, string>;
  validActions: string[];
}

function PermissionItems({
  permissions,
  resourceNames,
  validActions,
}: PermissionItemsProps) {
  // 找出"所有资源"的权限
  const allResourcePerm = permissions.find(
    p => p.resource_id === '0' || p.resource_id === 0,
  );
  const allResourceActions = new Set(allResourcePerm?.actions || []);

  // 合并同一资源的权限（来自不同角色）
  const mergedPermissions: Record<
    string,
    { resource_id: string | number; actions: Set<string> }
  > = {};

  permissions.forEach(perm => {
    const resourceKey = `${perm.resource_id}`;
    if (!mergedPermissions[resourceKey]) {
      mergedPermissions[resourceKey] = {
        resource_id: perm.resource_id,
        actions: new Set(),
      };
    }
    // 合并所有操作
    perm.actions.forEach(action => {
      mergedPermissions[resourceKey].actions.add(action);
    });
  });

  // 转换为数组并排序（所有资源放在最前面）
  const sortedResources = Object.entries(mergedPermissions).sort((a, b) => {
    const aIsAll = a[0] === '0';
    const bIsAll = b[0] === '0';
    if (aIsAll) {
      return -1;
    }
    if (bIsAll) {
      return 1;
    }
    return 0;
  });

  return (
    <>
      {sortedResources.map(([resourceKey, { resource_id, actions }]) => {
        const key = `${permissions[0]?.resource_type}_${resource_id}`;
        const isAllResources = resource_id === '0' || resource_id === 0;
        const resourceName = isAllResources
          ? '所有资源'
          : resourceNames[key] || `资源ID: ${resource_id}`;

        // 合并权限：具体资源继承"所有资源"的权限
        const mergedActions = Array.from(actions);
        if (!isAllResources && allResourceActions.size > 0) {
          // 将"所有资源"的权限添加到具体资源
          allResourceActions.forEach(action => {
            if (!mergedActions.includes(action)) {
              mergedActions.push(action);
            }
          });
        }

        // 过滤掉不支持的操作
        const filteredActions = mergedActions.filter(action =>
          validActions.includes(action),
        );

        // 如果没有有效的操作，跳过显示
        if (filteredActions.length === 0) {
          return null;
        }

        return (
          <div
            key={resourceKey}
            className="p-3 bg-gray-50 rounded border border-gray-200"
          >
            <div className="mb-2 flex items-center">
              <Text strong>{resourceName}</Text>
              {!isAllResources && allResourceActions.size > 0 && (
                <Text type="secondary" className="ml-2">
                  (包含所有资源权限)
                </Text>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredActions.map(action => (
                <span
                  key={action}
                  className="inline-block px-2 py-1 text-sm bg-white border border-gray-300 rounded"
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
