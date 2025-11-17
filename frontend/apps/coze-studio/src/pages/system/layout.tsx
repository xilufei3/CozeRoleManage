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

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { useSpaceStore } from '@coze-foundation/space-store';
import { Tabs, TabPane } from '@coze-arch/coze-design';

import { RoleType } from '../../api/space';

interface SpaceSummary {
  role_type?: RoleType;
}

export default function SystemLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSpace = useSpaceStore(
    state => state.space,
  ) as SpaceSummary | null;
  const currentRoleType = currentSpace?.role_type;
  const isOwner = currentRoleType === RoleType.Owner;
  const isAdmin = currentRoleType === RoleType.Admin;
  const canViewRoles = isOwner || isAdmin;
  const canViewUsers = isOwner || isAdmin;

  // 从路径中提取当前激活的标签页
  const getActiveKey = () => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart === 'system' ? 'permissions' : lastPart;
  };
  const activeKey = getActiveKey();
  const fallbackKey = (() => {
    if (canViewRoles) {
      return 'roles';
    }
    if (canViewUsers) {
      return 'users';
    }
    if (isOwner) {
      return 'identity';
    }
    return 'permissions';
  })();
  const displayedActiveKey = (() => {
    if (activeKey === 'roles' && !canViewRoles) {
      return fallbackKey;
    }
    if (activeKey === 'users' && !canViewUsers) {
      return fallbackKey;
    }
    if (activeKey === 'identity' && !isOwner) {
      return fallbackKey;
    }
    return activeKey;
  })();

  const handleTabChange = (key: string) => {
    if (key === 'roles' && !canViewRoles) {
      return;
    }
    if (key === 'identity' && !isOwner) {
      return;
    }
    if (key === 'users' && !canViewUsers) {
      return;
    }
    navigate(key);
  };

  useEffect(() => {
    const noAccessToCurrent =
      (activeKey === 'roles' && !canViewRoles) ||
      (activeKey === 'identity' && !isOwner) ||
      (activeKey === 'users' && !canViewUsers);

    if (!noAccessToCurrent) {
      return;
    }

    navigate(fallbackKey, { replace: true });
  }, [activeKey, canViewRoles, canViewUsers, fallbackKey, isOwner, navigate]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 pt-6 border-b border-gray-200">
        <Tabs
          activeKey={displayedActiveKey}
          onChange={handleTabChange}
          type="line"
        >
          <TabPane tab="我的权限" itemKey="permissions" />
          {canViewRoles ? <TabPane tab="角色管理" itemKey="roles" /> : null}
          {canViewUsers ? <TabPane tab="用户管理" itemKey="users" /> : null}
          {isOwner ? <TabPane tab="身份管理" itemKey="identity" /> : null}
        </Tabs>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet context={{ isOwner, isAdmin, canViewRoles, canViewUsers }} />
      </div>
    </div>
  );
}
