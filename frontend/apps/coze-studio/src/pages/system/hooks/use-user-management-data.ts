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

import { RoleType, getSpaceUserList, type SpaceUser } from '../../../api/space';
import { getUserRoles, listRoles, type Role } from '../../../api/rbac';

export const useUserData = (spaceId: string) => {
  const [users, setUsers] = useState<SpaceUser[]>([]);

  useEffect(() => {
    let aborted = false;
    const loadUsers = async () => {
      if (!spaceId) {
        setUsers([]);
        return;
      }
      try {
        const list = await getSpaceUserList(spaceId);
        if (!aborted) {
          setUsers(list || []);
        }
      } catch (error) {
        console.error('加载空间用户失败', error);
        if (!aborted) {
          setUsers([]);
        }
      }
    };
    loadUsers();
    return () => {
      aborted = true;
    };
  }, [spaceId]);

  return users;
};

export const useRoleResources = (
  spaceId: string,
  users: SpaceUser[],
  currentRoleType?: RoleType,
) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!spaceId) {
      return;
    }
    try {
      const data = await listRoles(spaceId);
      let roleList = data?.roles || [];
      if (currentRoleType === RoleType.Admin) {
        roleList = roleList.filter(role => role.name !== 'Owner');
      }
      if (currentRoleType === RoleType.Member) {
        roleList = [];
      }
      setRoles(roleList);
    } catch (error) {
      console.error('加载角色列表失败', error);
      setRoles([]);
    }
  }, [currentRoleType, spaceId]);

  const loadAllUserRoles = useCallback(async () => {
    if (!spaceId || users.length === 0) {
      setUserRoles({});
      return;
    }
    setLoading(true);
    try {
      const rolesMap: Record<string, Role[]> = {};
      await Promise.all(
        users.map(async user => {
          try {
            const data = await getUserRoles(user.id, spaceId);
            rolesMap[user.id] = data?.roles || [];
          } catch (error) {
            console.error(`Failed to load roles for user ${user.id}`, error);
            rolesMap[user.id] = [];
          }
        }),
      );
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('加载用户角色失败', error);
      setUserRoles({});
    } finally {
      setLoading(false);
    }
  }, [spaceId, users]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadAllUserRoles();
  }, [loadAllUserRoles]);

  return { roles, userRoles, loading, loadAllUserRoles };
};
