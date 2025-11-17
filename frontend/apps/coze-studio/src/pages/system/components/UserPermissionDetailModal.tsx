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
} from '../../../api/rbac';

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
  const [resourceCreators, setResourceCreators] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);

  const loadResourceNames = useCallback(async () => {
    if (!userPermission) {
      return;
    }

    setLoading(true);
    try {
      const names: Record<string, string> = {};
      const creators: Record<string, string> = {}; // 存储创建者ID

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
              const key = `${RESOURCE_TYPE_AGENT}_${agent.id}`;
              names[key] = agent.name || '未命名 Agent';
              if (agent.creator_id) {
                creators[key] = agent.creator_id;
              }
            });
          } else if (type === RESOURCE_TYPE_PLUGIN) {
            // Plugin
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_PLUGIN,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              const key = `${RESOURCE_TYPE_PLUGIN}_${id}`;
              names[key] = r.name || '未命名插件';
              if (r.creator_id) {
                creators[key] = r.creator_id;
              }
            });
          } else if (type === RESOURCE_TYPE_WORKFLOW) {
            // Workflow
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_WORKFLOW,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              const key = `${RESOURCE_TYPE_WORKFLOW}_${id}`;
              names[key] = r.name || '未命名工作流';
              if (r.creator_id) {
                creators[key] = r.creator_id;
              }
            });
          } else if (type === RESOURCE_TYPE_KNOWLEDGE) {
            // Knowledge
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_KNOWLEDGE,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              const key = `${RESOURCE_TYPE_KNOWLEDGE}_${id}`;
              names[key] = r.name || '未命名知识库';
              if (r.creator_id) {
                creators[key] = r.creator_id;
              }
            });
          } else if (type === RESOURCE_TYPE_PROMPT) {
            // Prompt
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_PROMPT,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              const key = `${RESOURCE_TYPE_PROMPT}_${id}`;
              names[key] = r.name || '未命名提示词';
              if (r.creator_id) {
                creators[key] = r.creator_id;
              }
            });
          } else if (type === RESOURCE_TYPE_DATABASE) {
            // Database
            const data = await getSpaceResources(userPermission.space_id, [
              RES_TYPE_DATABASE,
            ]);
            data.resource_list.forEach(r => {
              const id = r.res_id || r.id || '';
              const key = `${RESOURCE_TYPE_DATABASE}_${id}`;
              names[key] = r.name || '未命名数据库';
              if (r.creator_id) {
                creators[key] = r.creator_id;
              }
            });
          }
        } catch (error) {
          console.warn(`加载资源类型 ${type} 失败:`, error);
        }
      }

      setResourceNames(names);
      setResourceCreators(creators);
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

  // 固定的资源类型排序 - 显示所有资源类型，即使没有权限
  const resourceTypeOrder = ['4', '5', '6', '7', '17', '23']; // Agent, Plugin, Workflow, Knowledge, Prompt, Database

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
                {resourceTypeOrder.map(resourceType => (
                  <PermissionCard
                    key={resourceType}
                    resourceType={resourceType}
                    permissions={groupedPermissions[resourceType] || []}
                    resourceNames={resourceNames}
                    resourceCreators={resourceCreators}
                    currentUserId={userPermission.user_id}
                  />
                ))}
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
  resourceCreators: Record<string, string>;
  currentUserId: string;
}

function PermissionCard({
  resourceType,
  permissions,
  resourceNames,
  resourceCreators,
  currentUserId,
}: PermissionCardProps) {
  const resourceInfo = RESOURCE_TYPE_MAP[resourceType] || {
    name: `未知资源类型 ${resourceType}`,
    color: 'default',
    validActions: [],
  };

  // 即使没有权限也显示资源类型卡片
  const hasPermissions = permissions && permissions.length > 0;

  return (
    <Card title={<Tag>{resourceInfo.name}</Tag>} bordered>
      <div className="flex flex-col gap-3">
        {hasPermissions ? (
          <PermissionItems
            permissions={permissions}
            resourceNames={resourceNames}
            resourceCreators={resourceCreators}
            currentUserId={currentUserId}
            validActions={resourceInfo.validActions}
          />
        ) : (
          <div className="p-3 bg-gray-50 rounded border border-gray-200 text-center">
            <Text type="secondary">无权限</Text>
          </div>
        )}
      </div>
    </Card>
  );
}

// 提取权限项组件
interface PermissionItemsProps {
  permissions: Permission[];
  resourceNames: Record<string, string>;
  resourceCreators: Record<string, string>;
  currentUserId: string;
  validActions: string[];
}

function PermissionItems({
  permissions,
  resourceNames,
  resourceCreators,
  currentUserId,
  validActions,
}: PermissionItemsProps) {
  // 🔑 区分角色权限和直接权限
  // role_id = 0 表示直接权限，role_id !== 0 表示角色权限
  const rolePermissions = permissions.filter(p => {
    const roleId = String(p.role_id);
    return roleId !== '0';
  });
  const directPermissions = permissions.filter(p => {
    const roleId = String(p.role_id);
    return roleId === '0';
  });

  // 🔑 找出所有"所有资源"的角色权限记录
  const allResourceRolePerms = rolePermissions.filter(
    p => p.resource_id === '0' || p.resource_id === 0,
  );
  // 合并所有"所有资源"角色权限的操作（取并集）
  const allResourceRoleActions = new Set<string>();
  allResourceRolePerms.forEach(perm => {
    perm.actions.forEach(action => {
      allResourceRoleActions.add(action);
    });
  });

  // 从"所有资源"角色权限中过滤掉create（create不会传递到具体资源）
  const inheritableActions = new Set(
    Array.from(allResourceRoleActions).filter(action => action !== 'create')
  );

  // 🔑 合并同一资源的角色权限（来自不同角色，取并集）
  const mergedRolePermissions: Record<
    string,
    { resource_id: string | number; actions: Set<string> }
  > = {};

  rolePermissions.forEach(perm => {
    const resourceKey = `${perm.resource_id}`;
    if (!mergedRolePermissions[resourceKey]) {
      mergedRolePermissions[resourceKey] = {
        resource_id: perm.resource_id,
        actions: new Set(),
      };
    }
    // 合并所有操作（取并集）
    perm.actions.forEach(action => {
      mergedRolePermissions[resourceKey].actions.add(action);
    });
  });

  // 🔑 合并同一资源的直接权限（取并集）
  const mergedDirectPermissions: Record<
    string,
    { resource_id: string | number; actions: Set<string> }
  > = {};

  directPermissions.forEach(perm => {
    const resourceKey = `${perm.resource_id}`;
    if (!mergedDirectPermissions[resourceKey]) {
      mergedDirectPermissions[resourceKey] = {
        resource_id: perm.resource_id,
        actions: new Set(),
      };
    }
    // 合并所有操作（取并集）
    perm.actions.forEach(action => {
      mergedDirectPermissions[resourceKey].actions.add(action);
    });
  });

  // 🔑 获取所有资源的唯一ID（合并角色权限和直接权限的资源ID）
  const allResourceIds = new Set([
    ...Object.keys(mergedRolePermissions),
    ...Object.keys(mergedDirectPermissions),
  ]);

  // 转换为数组并排序（所有资源放在最前面，然后按资源ID排序）
  const sortedResources = Array.from(allResourceIds).sort((a, b) => {
    const aIsAll = a === '0';
    const bIsAll = b === '0';
    if (aIsAll) {
      return -1;
    }
    if (bIsAll) {
      return 1;
    }
    // 其他资源按ID字母序排序，确保顺序固定
    return a.localeCompare(b);
  });

  // 如果没有任何权限数据，返回空的占位符（由PermissionCard处理）
  if (sortedResources.length === 0) {
    return null;
  }

  return (
    <>
      {sortedResources.map(resourceKey => {
        const resource_id = mergedRolePermissions[resourceKey]?.resource_id ||
                           mergedDirectPermissions[resourceKey]?.resource_id ||
                           resourceKey;
        const key = `${permissions[0]?.resource_type}_${resource_id}`;
        const isAllResources = resource_id === '0' || resource_id === 0;

        // 🔑 如果不是"所有资源"且找不到资源名称，说明资源已被删除，直接跳过不显示
        if (!isAllResources && !resourceNames[key]) {
          console.log(`[权限详情] 跳过已删除的资源: ${resource_id}`);
          return null;
        }

        // 获取资源名称
        const resourceName = isAllResources ? '所有资源' : resourceNames[key];

        // 检查是否是该用户创建的
        const isCreatedByUser = !isAllResources && resourceCreators[key] === currentUserId;

        // 🔑 权限合并策略：
        // - 非用户创建的资源：只使用角色权限（不包括直接权限）
        // - 用户创建的资源：使用角色权限 ∪ 直接权限
        let finalActions: string[];
        if (isCreatedByUser) {
          // 用户创建的资源：角色权限 ∪ 直接权限
          const roleActions = mergedRolePermissions[resourceKey]?.actions || new Set<string>();
          const directActions = mergedDirectPermissions[resourceKey]?.actions || new Set<string>();
          const mergedActions = new Set([...roleActions, ...directActions]);

          // 继承"所有资源"的角色权限（不包括create）
          if (!isAllResources && inheritableActions.size > 0) {
            inheritableActions.forEach(action => {
              mergedActions.add(action);
            });
          }

          // 过滤掉不支持的操作，并按固定顺序排序
          const actionOrder = ['create', 'read', 'update', 'delete', 'execute', 'publish', 'install', 'manage', 'query'];
          finalActions = Array.from(mergedActions)
            .filter(action => validActions.includes(action))
            .sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));
        } else {
          // 非用户创建的资源：只使用角色权限
          const roleActions = mergedRolePermissions[resourceKey]?.actions || new Set<string>();
          const mergedActions = Array.from(roleActions);

          // 继承"所有资源"的角色权限（不包括create）
          if (!isAllResources && inheritableActions.size > 0) {
            inheritableActions.forEach(action => {
              if (!mergedActions.includes(action)) {
                mergedActions.push(action);
              }
            });
          }

          // 过滤掉不支持的操作，并按固定顺序排序
          const actionOrder = ['create', 'read', 'update', 'delete', 'execute', 'publish', 'install', 'manage', 'query'];
          finalActions = mergedActions
            .filter(action => validActions.includes(action))
            .sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));
        }

        // 如果没有有效的操作，跳过显示
        if (finalActions.length === 0) {
          return null;
        }

        return (
          <div
            key={resourceKey}
            className="p-3 bg-gray-50 rounded border border-gray-200"
          >
            <div className="mb-2 flex items-center flex-wrap gap-2">
              <Text strong>
                {resourceName}
              </Text>
              {isCreatedByUser && (
                <Tag
                  size="small"
                  className="!bg-transparent !border-gray-300 !text-gray-600"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #d9d9d9',
                    color: '#666',
                  }}
                >
                  我创建的
                </Tag>
              )}
              {!isAllResources && inheritableActions.size > 0 && (
                <Text type="secondary" className="text-sm">
                  (包含所有资源权限，不含create)
                </Text>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {finalActions.map(action => {
                const isInherited = !isCreatedByUser && !isAllResources && inheritableActions.has(action);
                // 🔑 如果是用户创建的资源，所有操作标签都使用绿色
                const tagColor = isCreatedByUser ? 'green' : undefined;
                return (
                  <Tag key={action} color={tagColor}>
                    {action}
                    {isInherited && (
                      <Text type="secondary" className="text-xs ml-1">
                        (继承)
                      </Text>
                    )}
                  </Tag>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
