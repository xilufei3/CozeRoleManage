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

import { useOutletContext } from 'react-router-dom';
import { useCallback, useMemo, useState, type ComponentProps } from 'react';

import { useSpaceStore } from '@coze-foundation/space-store';
import { triggerRBACReload } from '@coze-common/auth';
import { IconCozEdit } from '@coze-arch/coze-design/icons';
import {
  Button,
  Space,
  Table,
  Tag,
  Toast,
  Typography,
} from '@coze-arch/coze-design';

import { RoleType, type SpaceUser } from '../../api/space';
import {
  assignRoleToUser,
  getUserPermissions,
  removeUserRole,
  type Role,
  type UserPermissions,
} from '../../api/rbac';
import {
  useUserData,
  useRoleResources,
} from './hooks/use-user-management-data';
import { UserRoleAssignModal } from './components/UserRoleAssignModal';
import { UserPermissionDetailModal } from './components/UserPermissionDetailModal';

const { Title, Text } = Typography;

interface SpaceSummary {
  id?: string;
  role_type?: RoleType;
}
type TagColor = ComponentProps<typeof Tag>['color'];

interface SystemOutletContext {
  isOwner: boolean;
  isAdmin?: boolean;
  canViewRoles?: boolean;
  canViewUsers?: boolean;
}

const ROLE_META: Record<RoleType, { text: string; color?: TagColor }> = {
  [RoleType.Owner]: { text: 'Owner', color: 'red' as TagColor },
  [RoleType.Admin]: { text: 'Admin', color: 'orange' as TagColor },
  [RoleType.Member]: { text: 'Member', color: 'blue' as TagColor },
};
const DEFAULT_ROLE_META: { text: string; color?: TagColor } = {
  text: '未知',
  color: undefined,
};

const getRoleInfo = (roleType?: number) =>
  ROLE_META[roleType as RoleType] ?? DEFAULT_ROLE_META;

interface AssignModalState {
  isVisible: boolean;
  open: (user: SpaceUser) => void;
  close: () => void;
  selectedUser: SpaceUser | null;
  selectedRoleIds: string[];
  setSelectedRoleIds: (value: string[]) => void;
  submit: () => Promise<void>;
  isMember: boolean;
}

const useAssignModalState = ({
  spaceId,
  userRoles,
  loadAllUserRoles,
  currentRoleType,
}: {
  spaceId: string;
  userRoles: Record<string, Role[]>;
  loadAllUserRoles: () => Promise<void>;
  currentRoleType?: RoleType;
}): AssignModalState => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SpaceUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const isAdmin = currentRoleType === RoleType.Admin;
  const isMember = currentRoleType === RoleType.Member;

  const close = useCallback(() => setIsVisible(false), []);

  const open = useCallback(
    (user: SpaceUser) => {
      if (isMember) {
        return;
      }
      if (isAdmin && user.roleType === RoleType.Owner) {
        Toast.warning('管理员无法修改 Owner 的角色');
        return;
      }
      setSelectedUser(user);
      const currentRoles = userRoles[user.id] || [];
      setSelectedRoleIds(currentRoles.map(role => role.id));
      setIsVisible(true);
    },
    [isAdmin, isMember, userRoles],
  );

  const submit = useCallback(async () => {
    if (!selectedUser) {
      return;
    }
    if (isMember) {
      Toast.warning('成员无权分配角色');
      return;
    }
    if (isAdmin && selectedUser.roleType === RoleType.Owner) {
      Toast.warning('管理员无法修改 Owner 的角色');
      return;
    }

    try {
      const currentRoles = userRoles[selectedUser.id] || [];
      const currentRoleIds = currentRoles.map(role => role.id);
      const toAdd = selectedRoleIds.filter(id => !currentRoleIds.includes(id));
      const toRemove = currentRoleIds.filter(
        id => !selectedRoleIds.includes(id),
      );

      for (const roleId of toAdd) {
        await assignRoleToUser(selectedUser.id, {
          role_id: roleId,
          space_id: spaceId,
        });
      }
      for (const roleId of toRemove) {
        await removeUserRole(selectedUser.id, roleId, spaceId);
      }

      Toast.success('角色分配成功');
      // 🔑 角色分配/移除后触发权限重新加载，确保权限变更立即生效
      triggerRBACReload();
      console.log('[UserManagement] 角色分配成功，触发权限刷新');
      close();
      await loadAllUserRoles();
    } catch (error) {
      const message = error instanceof Error ? error.message : '角色分配失败';
      Toast.error(message);
      console.error(error);
    }
  }, [
    close,
    isAdmin,
    isMember,
    loadAllUserRoles,
    selectedRoleIds,
    selectedUser,
    spaceId,
    userRoles,
  ]);

  return {
    isVisible,
    open,
    close,
    selectedUser,
    selectedRoleIds,
    setSelectedRoleIds,
    submit,
    isMember,
  };
};

interface PermissionModalState {
  isVisible: boolean;
  open: (user: SpaceUser) => Promise<void>;
  close: () => void;
  userPermission: UserPermissions | null;
}

const usePermissionModalState = (spaceId: string): PermissionModalState => {
  const [isVisible, setIsVisible] = useState(false);
  const [userPermission, setUserPermission] = useState<UserPermissions | null>(
    null,
  );

  const close = useCallback(() => setIsVisible(false), []);

  const open = useCallback(
    async (user: SpaceUser) => {
      try {
        setUserPermission(null);
        const permissions = await getUserPermissions(user.id, spaceId);
        setUserPermission(permissions);
        setIsVisible(true);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '加载用户权限失败';
        Toast.error(message);
        console.error(error);
      }
    },
    [spaceId],
  );

  return { isVisible, open, close, userPermission };
};

const useUserColumns = ({
  userRoles,
  onAssignRoles,
  onViewPermissions,
  currentRoleType,
}: {
  userRoles: Record<string, Role[]>;
  onAssignRoles: (user: SpaceUser) => void;
  onViewPermissions: (user: SpaceUser) => void;
  currentRoleType?: RoleType;
}) => {
  const canAssign =
    currentRoleType === RoleType.Owner || currentRoleType === RoleType.Admin;

  return useMemo(
    () => [
      { title: '用户名', dataIndex: 'name', key: 'name', width: 200 },
      { title: '邮箱', dataIndex: 'email', key: 'email', width: 250 },
      {
        title: '身份',
        key: 'roleType',
        width: 120,
        render: (_: unknown, record: SpaceUser) => {
          const info = getRoleInfo(record.roleType);
          return <Tag color={info.color}>{info.text}</Tag>;
        },
      },
      {
        title: '角色',
        key: 'roles',
        render: (_: unknown, record: SpaceUser) => {
          const roleList = userRoles[record.id] || [];
          return (
            <Space wrap>
              {roleList.length > 0 ? (
                roleList.map(role => (
                  <Tag key={role.id} color="blue">
                    {role.name}
                  </Tag>
                ))
              ) : (
                <Text type="secondary">未分配角色</Text>
              )}
            </Space>
          );
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 280,
        render: (_: unknown, record: SpaceUser) => (
          <Space>
            {canAssign ? (
              <Button
                type="tertiary"
                size="small"
                icon={<IconCozEdit />}
                onClick={() => onAssignRoles(record)}
                disabled={
                  currentRoleType === RoleType.Admin &&
                  record.roleType === RoleType.Owner
                }
              >
                分配角色
              </Button>
            ) : null}
            <Button
              type="tertiary"
              size="small"
              onClick={() => onViewPermissions(record)}
            >
              查看权限
            </Button>
          </Space>
        ),
      },
    ],
    [canAssign, currentRoleType, onAssignRoles, onViewPermissions, userRoles],
  );
};

const useUserManagementController = (
  spaceId: string,
  currentRoleType?: RoleType,
) => {
  const users = useUserData(spaceId);
  const { roles, userRoles, loading, loadAllUserRoles } = useRoleResources(
    spaceId,
    users,
    currentRoleType,
  );
  const assignModal = useAssignModalState({
    spaceId,
    userRoles,
    loadAllUserRoles,
    currentRoleType,
  });
  const permissionModal = usePermissionModalState(spaceId);

  const columns = useUserColumns({
    userRoles,
    onAssignRoles: assignModal.open,
    onViewPermissions: permissionModal.open,
    currentRoleType,
  });

  return {
    users,
    roles,
    columns,
    loading,
    assignModal,
    permissionModal,
  };
};

export default function UserManagement() {
  const { isOwner, isAdmin = false } = useOutletContext<SystemOutletContext>();
  const currentSpace = useSpaceStore(
    state => state.space,
  ) as SpaceSummary | null;
  const spaceId = currentSpace?.id || '';
  const currentRoleType = isOwner
    ? RoleType.Owner
    : isAdmin
      ? RoleType.Admin
      : currentSpace?.role_type;
  const hasAccess = isOwner || isAdmin;

  const { users, roles, columns, loading, assignModal, permissionModal } =
    useUserManagementController(spaceId, currentRoleType);

  if (!hasAccess) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <Text type="secondary" className="text-lg">
            您当前的权限为 Member，无权访问此页面
          </Text>
        </div>
      </div>
    );
  }

  if (!spaceId) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <Text type="secondary" className="text-lg">
            请先选择一个工作空间
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title heading={3}>用户身份管理</Title>
        <Text type="secondary">为用户分配角色，管理用户的访问权限</Text>
      </div>

      <Table
        tableProps={{
          dataSource: users,
          columns,
          rowKey: 'id',
          loading,
          pagination: { pageSize: 10 },
        }}
      />

      <UserRoleAssignModal
        visible={assignModal.isVisible}
        userName={assignModal.selectedUser?.name}
        roles={roles}
        selectedRoleIds={assignModal.selectedRoleIds}
        onRoleChange={value => assignModal.setSelectedRoleIds(value)}
        onSave={assignModal.submit}
        onCancel={assignModal.close}
      />

      <UserPermissionDetailModal
        visible={permissionModal.isVisible}
        userPermission={permissionModal.userPermission}
        onClose={permissionModal.close}
      />
    </div>
  );
}
