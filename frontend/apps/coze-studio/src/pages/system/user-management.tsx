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

/* eslint-disable max-lines -- keep entire user management flow in one file as requested */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';

import { useSpaceStore } from '@coze-foundation/space-store';
import { IconCozEdit } from '@coze-arch/coze-design/icons';
import {
  Button,
  Card,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Toast,
  Typography,
} from '@coze-arch/coze-design';

import { RoleType, getSpaceUserList, type SpaceUser } from '../../api/space';
import {
  assignRoleToUser,
  getUserPermissions,
  getUserRoles,
  listRoles,
  removeUserRole,
  type Role,
  type UserPermissions,
} from '../../api/rbac';

const { Title, Text } = Typography;

interface SpaceSummary {
  id?: string;
  role_type?: RoleType;
}
type TagColor = ComponentProps<typeof Tag>['color'];

const ROLE_META: Record<RoleType, { text: string; color: TagColor }> = {
  [RoleType.Owner]: { text: 'Owner', color: 'red' },
  [RoleType.Admin]: { text: 'Admin', color: 'orange' },
  [RoleType.Member]: { text: 'Member', color: 'blue' },
};
const DEFAULT_ROLE_META: { text: string; color: TagColor } = {
  text: '未知',
  color: 'default',
};

const getRoleInfo = (roleType?: number) =>
  ROLE_META[roleType as RoleType] ?? DEFAULT_ROLE_META;

const useUserData = (spaceId: string) => {
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

const useRoleResources = (
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
    if (!spaceId) {
      return;
    }
    setLoading(true);
    try {
      const rolesMap: Record<string, Role[]> = {};
      for (const user of users) {
        try {
          const data = await getUserRoles(user.id, spaceId);
          rolesMap[user.id] = data?.roles || [];
        } catch (error) {
          console.error(`Failed to load roles for user ${user.id}`, error);
          rolesMap[user.id] = [];
        }
      }
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('加载用户角色失败', error);
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

const UserRoleAssignModal = ({
  visible,
  userName,
  roles,
  selectedRoleIds,
  onRoleChange,
  onSave,
  onCancel,
}: {
  visible: boolean;
  userName?: string;
  roles: Role[];
  selectedRoleIds: string[];
  onRoleChange: (value: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <Modal
    title={`分配角色 - ${userName ?? ''}`}
    visible={visible}
    onOk={onSave}
    onCancel={onCancel}
    okText="保存"
    cancelText="取消"
  >
    <div className="py-4">
      <Text className="mb-2 block">选择角色</Text>
      <Select
        multiple
        value={selectedRoleIds}
        onChange={value => {
          if (Array.isArray(value)) {
            onRoleChange(value.map(item => String(item)));
          }
        }}
        placeholder="请选择角色"
        style={{ width: '100%' }}
      >
        {roles.map(role => (
          <Select.Option key={role.id} value={role.id}>
            {role.name}
          </Select.Option>
        ))}
      </Select>
    </div>
  </Modal>
);

const UserPermissionDetailModal = ({
  visible,
  userPermission,
  onClose,
}: {
  visible: boolean;
  userPermission: UserPermissions | null;
  onClose: () => void;
}) => (
  <Modal
    title="用户权限详情"
    visible={visible}
    onCancel={onClose}
    footer={[
      <Button key="close" onClick={onClose}>
        关闭
      </Button>,
    ]}
    style={{ width: 800 }}
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
            权限详情
          </Text>
          <div className="flex flex-col gap-3">
            {Object.entries(userPermission.permissions || {}).map(
              ([resourceType, actions]) => (
                <Card
                  key={resourceType}
                  title={`资源类型 ${resourceType}`}
                  bordered
                >
                  <Space wrap>
                    {(Array.isArray(actions) ? actions : []).map(action => (
                      <Tag key={action}>{action}</Tag>
                    ))}
                  </Space>
                </Card>
              ),
            )}
          </div>
        </div>
      </div>
    ) : null}
  </Modal>
);

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
  const currentSpace = useSpaceStore(
    state => state.space,
  ) as SpaceSummary | null;
  const spaceId = currentSpace?.id || '';
  const currentRoleType = currentSpace?.role_type;

  const { users, roles, columns, loading, assignModal, permissionModal } =
    useUserManagementController(spaceId, currentRoleType);

  if (assignModal.isMember) {
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
        <Title heading={3}>用户管理</Title>
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
