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
/* eslint-disable @coze-arch/max-line-per-function */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Collapse } from '@coze-workflow/test-run';
import { useSpaceStore } from '@coze-foundation/space-store';
import { useUserInfo } from '@coze-foundation/account-adapter';
import { Card, Typography, Tag } from '@coze-arch/coze-design';

import { getUserPermissions, type UserPermissions } from '../../api/rbac';
import {
  fetchResourceMap,
  type FetchResourceMapResult,
  type ResourceItem,
} from './utils/resource-loader';
import { RESOURCE_TYPES } from './constants/resource-types';

const { Title, Text } = Typography;

type ResourceError = FetchResourceMapResult['errors'][number];

function getThemeByResource(typeId: number) {
  const themeMap: Record<
    number,
    { bubble: string; bubbleText: string; pill: string; pillBorder: string }
  > = {
    4: {
      bubble: 'bg-blue-100 dark:bg-blue-500/20',
      bubbleText: 'text-blue-600 dark:text-blue-300',
      pill: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-200',
      pillBorder: 'border-blue-100/70 dark:border-blue-500/30',
    },
    5: {
      bubble: 'bg-green-100 dark:bg-green-500/20',
      bubbleText: 'text-green-600 dark:text-green-300',
      pill: 'bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-200',
      pillBorder: 'border-green-100/70 dark:border-green-500/30',
    },
    6: {
      bubble: 'bg-orange-100 dark:bg-orange-500/20',
      bubbleText: 'text-orange-600 dark:text-orange-300',
      pill: 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-200',
      pillBorder: 'border-orange-100/70 dark:border-orange-500/30',
    },
    7: {
      bubble: 'bg-red-100 dark:bg-red-500/20',
      bubbleText: 'text-red-600 dark:text-red-300',
      pill: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-200',
      pillBorder: 'border-red-100/70 dark:border-red-500/30',
    },
    17: {
      bubble: 'bg-purple-100 dark:bg-purple-500/20',
      bubbleText: 'text-purple-600 dark:text-purple-300',
      pill: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-200',
      pillBorder: 'border-purple-100/70 dark:border-purple-500/30',
    },
    23: {
      bubble: 'bg-cyan-100 dark:bg-cyan-500/20',
      bubbleText: 'text-cyan-600 dark:text-cyan-300',
      pill: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-200',
      pillBorder: 'border-cyan-100/70 dark:border-cyan-500/30',
    },
  };

  return (
    themeMap[typeId] || {
      bubble: 'bg-gray-100 dark:bg-gray-600/40',
      bubbleText: 'text-gray-600 dark:text-gray-200',
      pill: 'bg-gray-100 dark:bg-gray-600/40 text-gray-600 dark:text-gray-200',
      pillBorder: 'border-gray-200/70 dark:border-gray-500/40',
    }
  );
}

export default function MyPermissions() {
  const currentSpace = useSpaceStore(state => state.space);
  const spaceId = currentSpace?.id || '';
  const userInfo = useUserInfo();
  const userId = userInfo?.user_id_str ?? '';

  const [resourceMap, setResourceMap] = useState<
    Record<number, ResourceItem[]>
  >({});
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceErrors, setResourceErrors] = useState<ResourceError[]>([]);
  const [userPermissions, setUserPermissions] =
    useState<UserPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setResourceMap({});
      setResourceErrors([]);
      return;
    }

    let isMounted = true;

    const loadResources = async () => {
      setLoadingResources(true);
      try {
        const { resourceMap: map, errors } = await fetchResourceMap(spaceId);
        if (isMounted) {
          setResourceMap(map);
          setResourceErrors(errors);
        }
      } finally {
        if (isMounted) {
          setLoadingResources(false);
        }
      }
    };

    void loadResources();

    return () => {
      isMounted = false;
    };
  }, [spaceId]);

  useEffect(() => {
    if (!spaceId || !userId) {
      setUserPermissions(null);
      setPermissionError(null);
      setLoadingPermissions(false);
      return;
    }

    let aborted = false;
    const loadPermissions = async () => {
      setLoadingPermissions(true);
      setPermissionError(null);
      try {
        const data = await getUserPermissions(userId, spaceId);
        if (!aborted) {
          setUserPermissions(data);
        }
      } catch (error) {
        console.error('加载用户权限失败', error);
        if (!aborted) {
          setUserPermissions(null);
          setPermissionError('权限数据加载失败，请稍后重试。');
        }
      } finally {
        if (!aborted) {
          setLoadingPermissions(false);
        }
      }
    };

    void loadPermissions();

    return () => {
      aborted = true;
    };
  }, [spaceId, userId]);

  const permissionMatrix = useMemo(() => {
    const matrix: Record<
      number,
      { all: Set<string>; resources: Record<string, Set<string>> }
    > = {};

    const ensureEntry = (resourceType: number) => {
      if (!matrix[resourceType]) {
        matrix[resourceType] = { all: new Set(), resources: {} };
      }
      return matrix[resourceType];
    };

    if (!userPermissions || !userPermissions.detail_permissions) {
      return matrix;
    }

    // 🔑 构建权限矩阵：合并所有权限源（角色权限 + 直接权限）
    userPermissions.detail_permissions.forEach(perm => {
      const entry = ensureEntry(perm.resource_type);

      // 统一处理 resource_id：转换为字符串进行比较
      const resourceIdStr = String(perm.resource_id || '');
      const isAllResources =
        resourceIdStr === '0' ||
        resourceIdStr === '' ||
        perm.resource_id === null ||
        perm.resource_id === undefined;

      if (isAllResources) {
        // "所有资源"的权限
        perm.actions.forEach(action => entry.all.add(action));
      } else {
        // 具体资源的权限
        const resourceKey = resourceIdStr;
        if (!entry.resources[resourceKey]) {
          entry.resources[resourceKey] = new Set();
        }
        perm.actions.forEach(action =>
          entry.resources[resourceKey].add(action),
        );
      }
    });

    return matrix;
  }, [userPermissions]);

  const hasPermission = useCallback(
    (resourceType: number, resourceId: string | number, action: string) => {
      const entry = permissionMatrix[resourceType];
      if (!entry) {
        return false;
      }

      // 🔑 权限检查策略：先检查"所有资源"权限，再检查具体资源权限
      // 1. 检查"所有资源"的权限（resource_id = 0）
      if (entry.all.has(action)) {
        return true;
      }

      // 2. 如果查询的是"所有资源"，只检查 all 权限（上面已检查）
      const resourceIdStr = String(resourceId);
      if (resourceIdStr === '0' || resourceIdStr === '') {
        return false;
      }

      // 3. 检查具体资源的权限
      const resourceActions = entry.resources[resourceIdStr];
      return resourceActions?.has(action) ?? false;
    },
    [permissionMatrix],
  );

  return (
    <div className="p-6 flex flex-col gap-6">
      <Card>
        <div className="flex flex-col gap-4">
          <Title heading={4}>空间资源概览</Title>
          <Text type="secondary">
            展示当前空间下的资源及其权限配置情况，您可以查看每个资源的具体权限。
          </Text>
          {userPermissions?.roles?.length ? (
            <div className="flex flex-wrap gap-2 items-center">
              <Text strong>拥有角色：</Text>
              {userPermissions.roles.map(role => (
                <Tag key={role.id} color="blue">
                  {role.name}
                </Tag>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              <Text type="secondary" className="text-sm">
                当前未分配任何角色
              </Text>
            </div>
          )}
          {userPermissions?.detail_permissions?.some(
            perm => String(perm.role_id) === '0',
          ) ? (
            <div className="flex flex-wrap gap-2 items-center">
              <Text type="secondary" className="text-xs">
                💡
                提示：您拥有通过角色分配的权限，这些权限已包含在下方权限矩阵中
              </Text>
            </div>
          ) : null}
          {permissionError ? (
            <Text
              type="danger"
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm dark:border-red-500/40 dark:bg-red-500/10"
            >
              {permissionError}
            </Text>
          ) : null}

          {loadingResources || loadingPermissions ? (
            <div className="py-6 text-center">
              <Text type="secondary">
                {loadingResources ? '资源加载中...' : '权限加载中...'}
              </Text>
            </div>
          ) : (
            <div className="grid gap-2 lg:gap-3">
              {RESOURCE_TYPES.map(resourceType => {
                const resources = resourceMap[resourceType.id] || [];
                const hasError = resourceErrors.some(
                  err => err.resourceType.id === resourceType.id,
                );
                const theme = getThemeByResource(resourceType.id);

                // 检查该资源类型是否有 create 权限（检查"所有资源"的 create 权限）
                const hasCreatePermission = hasPermission(
                  resourceType.id,
                  '0',
                  'create',
                );

                return (
                  <Collapse
                    key={resourceType.id}
                    className="rounded-xl border border-gray-200/70 bg-white/80 p-3 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700/60 dark:bg-gray-900/60 dark:hover:border-gray-600/80"
                    titleClassName="mb-0"
                    contentClassName="mt-3"
                    defaultOpen={false}
                    fade
                    duration={200}
                    label={
                      <div className="flex w-full items-center gap-3 text-left">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-inner transition-colors duration-200 ${theme.bubble} ${theme.bubbleText}`}
                        >
                          {resourceType.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {resourceType.displayName}
                            </span>
                            <Tag color={hasCreatePermission ? 'green' : 'red'}>
                              create
                            </Tag>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            共 {resources.length} 个资源 · 支持{' '}
                            {
                              resourceType.actions.filter(
                                action => action !== 'create',
                              ).length
                            }{' '}
                            个权限动作
                          </span>
                        </div>
                      </div>
                    }
                    extra={
                      <span className="inline-flex min-w-[28px] justify-center rounded-full border border-gray-200/70 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-600/60 dark:bg-gray-800 dark:text-gray-200">
                        {resources.length}
                      </span>
                    }
                  >
                    <div className="flex flex-col gap-3 border-t border-gray-100/80 pt-3 dark:border-gray-700/60">
                      <div className="flex flex-col gap-2">
                        {resources.map(resource => {
                          // 🔑 判断是否是当前用户创建的
                          const isCreatedByUser =
                            userId &&
                            resource.creator_id &&
                            String(resource.creator_id) === String(userId);

                          // 获取该资源拥有的所有权限（排除 create 权限，因为 create 是针对资源类型的）
                          // 🔑 如果资源是用户创建的，默认拥有该资源类型的所有权限动作（除了 create）
                          const resourcePermissions = isCreatedByUser
                            ? resourceType.actions.filter(
                                action => action !== 'create',
                              )
                            : resourceType.actions.filter(
                                action =>
                                  action !== 'create' &&
                                  hasPermission(
                                    resourceType.id,
                                    resource.id,
                                    action,
                                  ),
                              );

                          return (
                            <div
                              key={resource.id}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100/80 bg-white/80 hover:bg-gray-50/60 dark:border-gray-700/50 dark:bg-gray-900/60 dark:hover:bg-gray-800/60 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {resource.name}
                                </span>
                                {isCreatedByUser ? (
                                  <Tag
                                    size="small"
                                    className="!bg-transparent !border-gray-300 !text-gray-600 flex-shrink-0"
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: '1px solid #d9d9d9',
                                      color: '#666',
                                    }}
                                  >
                                    我创建的
                                  </Tag>
                                ) : null}
                              </div>
                              {resourcePermissions.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {resourcePermissions.map(action => (
                                    <Tag
                                      key={`${resource.id}-${action}`}
                                      color="green"
                                    >
                                      {action}
                                    </Tag>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  无权限
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {resources.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                            暂无资源
                          </div>
                        )}
                      </div>
                      {hasError ? (
                        <Text
                          type="danger"
                          className="text-sm rounded-lg border border-red-100 bg-red-50 px-3 py-2 dark:border-red-500/40 dark:bg-red-500/10"
                        >
                          该资源类型列表加载失败，请稍后重试。
                        </Text>
                      ) : null}
                    </div>
                  </Collapse>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
