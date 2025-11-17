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

import { useOutletContext } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Collapse } from '@coze-workflow/test-run';
import { useSpaceStore } from '@coze-foundation/space-store';
import { useUserInfo } from '@coze-foundation/account-adapter';
import { IconCozCheckMarkCircleFillPalette } from '@coze-arch/coze-design/icons';
import { Card, Typography, Tag, Space } from '@coze-arch/coze-design';

import { getUserPermissions, type UserPermissions } from '@/api/rbac';

import { RoleType } from '../../api/space';
import {
  fetchResourceMap,
  type FetchResourceMapResult,
  type ResourceItem,
} from './utils/resource-loader';
import { RESOURCE_TYPES } from './constants/resource-types';

const { Title, Text } = Typography;

interface SystemOutletContext {
  isOwner: boolean;
  isAdmin?: boolean;
  canViewRoles?: boolean;
  canViewUsers?: boolean;
}

const ROLE_LABEL_MAP: Record<RoleType, string> = {
  [RoleType.Owner]: 'Owner',
  [RoleType.Admin]: 'Admin',
  [RoleType.Member]: 'Member',
};

const ROLE_DESCRIPTION_MAP: Record<RoleType, string> = {
  [RoleType.Owner]: '拥有空间的全部控制权，可管理成员、角色与资源。',
  [RoleType.Admin]:
    '具备空间管理权限，可进行大多数配置事务，受限于拥有者保留权限。',
  [RoleType.Member]: '普通成员身份，可使用被授权的资源与功能。',
};

const SYSTEM_CAPABILITIES = [
  {
    label: '角色管理',
    key: 'roles',
    grantedText: '可查看并维护空间角色。',
    deniedText: '当前身份无法访问角色管理。',
  },
  {
    label: '用户管理',
    key: 'users',
    grantedText: '可查看并管理空间成员。',
    deniedText: '当前身份无法访问用户管理。',
  },
  {
    label: '身份管理',
    key: 'identity',
    grantedText: '可调整空间管理员与成员身份。',
    deniedText: '仅拥有者可以进行身份管理。',
  },
];

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
  const { isOwner, isAdmin, canViewRoles, canViewUsers } =
    useOutletContext<SystemOutletContext>();
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

  const roleType = useMemo<RoleType>(() => {
    if (isOwner) {
      return RoleType.Owner;
    }
    if (isAdmin) {
      return RoleType.Admin;
    }
    return RoleType.Member;
  }, [isOwner, isAdmin]);

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

    if (!userPermissions) {
      return matrix;
    }

    userPermissions.detail_permissions?.forEach(perm => {
      const entry = ensureEntry(perm.resource_type);
      const isAllResources =
        perm.resource_id === '0' ||
        perm.resource_id === 0 ||
        perm.resource_id === null;
      if (isAllResources) {
        perm.actions.forEach(action => entry.all.add(action));
        return;
      }
      const resourceKey = String(perm.resource_id);
      if (!entry.resources[resourceKey]) {
        entry.resources[resourceKey] = new Set();
      }
      perm.actions.forEach(action => entry.resources[resourceKey].add(action));
    });

    return matrix;
  }, [userPermissions]);

  const hasPermission = useCallback(
    (resourceType: number, resourceId: string | number, action: string) => {
      const entry = permissionMatrix[resourceType];
      if (!entry) {
        return false;
      }
      if (entry.all.has(action)) {
        return true;
      }
      if (String(resourceId) === '0') {
        return false;
      }
      const resourceActions = entry.resources[String(resourceId)];
      return resourceActions?.has(action) ?? false;
    },
    [permissionMatrix],
  );

  const renderPermissionBadge = useCallback((enabled: boolean) => {
    if (!enabled) {
      return null;
    }
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center">
        <IconCozCheckMarkCircleFillPalette className="text-[16px] text-green-500 dark:text-green-300" />
      </span>
    );
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6">
      <Card>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Title heading={4}>当前空间身份</Title>
            <Text type="secondary">
              当前身份将决定默认可访问的系统能力与资源范围。
            </Text>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-blue-100/70 bg-blue-50/60 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
            <Space size={12} align="center">
              <Tag color="blue" className="px-3">
                {ROLE_LABEL_MAP[roleType]}
              </Tag>
              <Text strong className="text-sm text-gray-900 dark:text-gray-100">
                {ROLE_DESCRIPTION_MAP[roleType]}
              </Text>
            </Space>
            <Text type="secondary" className="text-xs">
              提示：如果需要更高权限，可联系空间拥有者调整身份或申请额外角色。
            </Text>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-5">
          <Title heading={4}>系统功能权限</Title>
          <div className="grid gap-3 md:grid-cols-3">
            {SYSTEM_CAPABILITIES.map(capability => {
              const enabled =
                capability.key === 'roles'
                  ? !!canViewRoles
                  : capability.key === 'users'
                    ? !!canViewUsers
                    : isOwner;
              return (
                <div
                  key={capability.key}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100/80 bg-gray-50/60 p-3 text-sm transition-all duration-200 dark:border-gray-700/40 dark:bg-gray-800/40"
                >
                  <Space size={10} align="center">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${
                        enabled
                          ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.55)]'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                    <Text
                      strong
                      className="text-sm text-gray-900 dark:text-gray-100"
                    >
                      {capability.label}
                    </Text>
                    {enabled ? (
                      <Tag color="green" className="px-2 text-xs">
                        可访问
                      </Tag>
                    ) : (
                      <Tag className="px-2 text-xs">受限</Tag>
                    )}
                  </Space>
                  <Text type="secondary" className="text-xs leading-relaxed">
                    {enabled ? capability.grantedText : capability.deniedText}
                  </Text>
                </div>
              );
            })}
          </div>
          <Text type="secondary" className="text-xs">
            若需开通受限功能，请向空间拥有者或管理员提交需求。
          </Text>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <Title heading={4}>空间资源概览</Title>
          <Text type="secondary">
            展示当前空间下可配置权限的资源清单，后续将基于这些资源汇总权限。
          </Text>
          {userPermissions?.roles?.length ? (
            <div className="flex flex-wrap gap-2">
              <Text strong>拥有角色：</Text>
              {userPermissions.roles.map(role => (
                <Tag key={role.id} color="blue">
                  {role.name}
                </Tag>
              ))}
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
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {resourceType.displayName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            共 {resources.length} 个资源 · 支持{' '}
                            {resourceType.actions.length} 个权限动作
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
                      <div className="overflow-x-auto rounded-lg border border-gray-100/80 bg-white text-sm text-gray-700 dark:border-gray-700/50 dark:bg-gray-900/60 dark:text-gray-200">
                        <table className="min-w-full border-spacing-0 text-left">
                          <thead className="bg-gray-50 text-xs font-medium text-gray-500 dark:bg-gray-800/60 dark:text-gray-300">
                            <tr>
                              <th className="whitespace-nowrap px-4 py-2 text-gray-600 dark:text-gray-200">
                                资源名称
                              </th>
                              {resourceType.actions.map(action => (
                                <th
                                  key={action}
                                  className="whitespace-nowrap px-4 py-2 text-center"
                                >
                                  {action}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-gray-100/70 bg-gray-50/60 dark:border-gray-600/60 dark:bg-gray-800/50">
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                所有资源
                              </td>
                              {resourceType.actions.map(action => (
                                <td
                                  key={`all-${action}`}
                                  className="px-4 py-2 text-sm text-center text-gray-600 dark:text-gray-200"
                                >
                                  {renderPermissionBadge(
                                    hasPermission(resourceType.id, '0', action),
                                  )}
                                </td>
                              ))}
                            </tr>
                            {resources.map(resource => (
                              <tr
                                key={resource.id}
                                className="border-t border-gray-100/70 dark:border-gray-700/50"
                              >
                                <td className="max-w-[280px] truncate px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {resource.name}
                                </td>
                                {resourceType.actions.map(action => (
                                  <td
                                    key={`${resource.id}-${action}`}
                                    className="px-4 py-2 text-sm text-center text-gray-600 dark:text-gray-200"
                                  >
                                    {renderPermissionBadge(
                                      hasPermission(
                                        resourceType.id,
                                        resource.id,
                                        action,
                                      ),
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
