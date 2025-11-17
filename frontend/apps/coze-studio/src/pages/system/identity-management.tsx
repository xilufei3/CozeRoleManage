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
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from 'react';

import { useSpaceStore } from '@coze-foundation/space-store';
import { IconCozPlus } from '@coze-arch/coze-design/icons';
import {
  Button,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Toast,
  Typography,
} from '@coze-arch/coze-design';

import {
  RoleType,
  createSpaceUser,
  getSpaceUserList,
  type SpaceUser,
  updateUserSpaceRole,
} from '../../api/space';

const { Text, Title } = Typography;

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

const useIdentityData = (spaceId: string) => {
  const [users, setUsers] = useState<SpaceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SpaceUser | null>(null);

  const loadUsers = useCallback(async () => {
    if (!spaceId) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getSpaceUserList(spaceId);
      setUsers(list || []);
    } catch (error) {
      console.error('加载空间用户失败', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (users.length === 0) {
      setSelectedUser(null);
      return;
    }
    setSelectedUser(prev =>
      prev && users.some(user => user.id === prev.id) ? prev : users[0],
    );
  }, [users]);

  const selectUser = useCallback((user: SpaceUser | null) => {
    setSelectedUser(user);
  }, []);

  return { users, loading, loadUsers, selectedUser, selectUser };
};

interface IdentityTableParams {
  onAdjustIdentity: (user: SpaceUser) => void;
}

const createIdentityTableColumns = ({
  onAdjustIdentity,
}: IdentityTableParams) => [
  { title: '用户名', dataIndex: 'name', key: 'name', width: 200 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 240 },
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
    title: '操作',
    key: 'action',
    width: 220,
    render: (_: unknown, record: SpaceUser) => (
      <Space>
        <Button
          type="tertiary"
          size="small"
          disabled={record.roleType === RoleType.Owner}
          onClick={() => onAdjustIdentity(record)}
        >
          调整身份
        </Button>
      </Space>
    ),
  },
];

interface IdentityRoleModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  canModify: boolean;
  selectedUser: SpaceUser | null;
  updateRoleType: RoleType;
  onRoleChange: (value: RoleType) => void;
}

const IdentityRoleModal = ({
  visible,
  onCancel,
  onConfirm,
  canModify,
  selectedUser,
  updateRoleType,
  onRoleChange,
}: IdentityRoleModalProps) => (
  <Modal
    title="调整用户身份"
    visible={visible}
    onCancel={onCancel}
    onOk={onConfirm}
    okButtonProps={{ disabled: !canModify }}
    okText="保存"
    cancelText="取消"
  >
    {selectedUser ? (
      canModify ? (
        <Select
          value={updateRoleType}
          onChange={value => onRoleChange(value as RoleType)}
          style={{ width: '100%' }}
        >
          <Select.Option value={RoleType.Admin}>Admin</Select.Option>
          <Select.Option value={RoleType.Member}>Member</Select.Option>
        </Select>
      ) : (
        <Text type="secondary">仅 Owner 可修改身份，且不能修改 Owner 身份</Text>
      )
    ) : (
      <Text type="secondary">请选择一个用户</Text>
    )}
  </Modal>
);

interface CreateUserModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  newEmail: string;
  newPassword: string;
  newRole: RoleType;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (value: RoleType) => void;
}

const CreateUserModal = ({
  visible,
  onCancel,
  onConfirm,
  newEmail,
  newPassword,
  newRole,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
}: CreateUserModalProps) => (
  <Modal
    title="创建空间用户"
    visible={visible}
    onCancel={onCancel}
    onOk={onConfirm}
    okText="创建"
    cancelText="取消"
  >
    <div className="space-y-3">
      <div>
        <Text className="mb-1 block">邮箱</Text>
        <input
          className="coze-input coze-input-bordered w-full"
          value={newEmail}
          onChange={onEmailChange}
          placeholder="请输入邮箱"
        />
      </div>
      <div>
        <Text className="mb-1 block">密码</Text>
        <input
          type="password"
          className="coze-input coze-input-bordered w-full"
          value={newPassword}
          onChange={onPasswordChange}
          placeholder="请输入密码"
        />
      </div>
      <div>
        <Text className="mb-1 block">初始身份</Text>
        <Select
          value={newRole}
          onChange={value => onRoleChange(value as RoleType)}
          style={{ width: '100%' }}
        >
          <Select.Option value={RoleType.Admin}>Admin</Select.Option>
          <Select.Option value={RoleType.Member}>Member</Select.Option>
        </Select>
      </div>
    </div>
  </Modal>
);

interface CreateModalState {
  visible: boolean;
  open: () => void;
  close: () => void;
  newEmail: string;
  newPassword: string;
  newRole: RoleType;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (value: RoleType) => void;
  submit: () => Promise<void>;
}

const useCreateModalState = ({
  spaceId,
  loadUsers,
}: {
  spaceId: string;
  loadUsers: () => Promise<void>;
}): CreateModalState => {
  const [visible, setVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleType>(RoleType.Member);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const onEmailChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setNewEmail(event.target.value),
    [],
  );
  const onPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setNewPassword(event.target.value),
    [],
  );
  const onRoleChange = useCallback((value: RoleType) => setNewRole(value), []);

  const submit = useCallback(async () => {
    if (!spaceId) {
      Toast.error('请先选择空间');
      return;
    }
    if (!newEmail || !newPassword) {
      Toast.error('请填写邮箱与密码');
      return;
    }

    try {
      await createSpaceUser(spaceId, {
        email: newEmail,
        password: newPassword,
        spaceRole: newRole,
      });
      Toast.success('创建成功');
      setNewEmail('');
      setNewPassword('');
      setNewRole(RoleType.Member);
      await loadUsers();
      close();
    } catch (error) {
      Toast.error('创建失败');
      console.error(error);
    }
  }, [close, loadUsers, newEmail, newPassword, newRole, spaceId]);

  return {
    visible,
    open,
    close,
    newEmail,
    newPassword,
    newRole,
    onEmailChange,
    onPasswordChange,
    onRoleChange,
    submit,
  };
};

interface IdentityRoleModalState {
  visible: boolean;
  open: (user: SpaceUser) => void;
  close: () => void;
  canModify: boolean;
  updateRoleType: RoleType;
  onRoleChange: (value: RoleType) => void;
  submit: () => Promise<void>;
}

const useIdentityRoleModalState = ({
  spaceId,
  selectedUser,
  loadUsers,
}: {
  spaceId: string;
  selectedUser: SpaceUser | null;
  loadUsers: () => Promise<void>;
}): IdentityRoleModalState => {
  const [visible, setVisible] = useState(false);
  const [updateRoleType, setUpdateRoleType] = useState<RoleType>(
    RoleType.Member,
  );

  useEffect(() => {
    if (!selectedUser) {
      setUpdateRoleType(RoleType.Member);
      return;
    }
    setUpdateRoleType(
      selectedUser.roleType === RoleType.Admin
        ? RoleType.Admin
        : RoleType.Member,
    );
  }, [selectedUser]);

  const canModify = useMemo(() => {
    if (!selectedUser) {
      return false;
    }
    return selectedUser.roleType !== RoleType.Owner;
  }, [selectedUser]);

  const open = useCallback((user: SpaceUser) => {
    setUpdateRoleType(
      user.roleType === RoleType.Admin ? RoleType.Admin : RoleType.Member,
    );
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const onRoleChange = useCallback((value: RoleType) => {
    setUpdateRoleType(value);
  }, []);

  const submit = useCallback(async () => {
    if (!selectedUser || !spaceId) {
      Toast.error('请选择用户');
      return;
    }
    if (selectedUser.roleType === RoleType.Owner) {
      Toast.warning('无法修改 Owner 的身份');
      return;
    }

    try {
      await updateUserSpaceRole(spaceId, selectedUser.id, updateRoleType);
      Toast.success('身份修改成功');
      await loadUsers();
      close();
    } catch (error) {
      const message = error instanceof Error ? error.message : '身份修改失败';
      Toast.error(message);
      console.error(error);
    }
  }, [close, loadUsers, selectedUser, spaceId, updateRoleType]);

  return {
    visible,
    open,
    close,
    canModify,
    updateRoleType,
    onRoleChange,
    submit,
  };
};

const useIdentityManagementController = (spaceId: string) => {
  const { users, loading, loadUsers, selectedUser, selectUser } =
    useIdentityData(spaceId);

  const createModal = useCreateModalState({ spaceId, loadUsers });
  const identityModal = useIdentityRoleModalState({
    spaceId,
    selectedUser,
    loadUsers,
  });

  const openIdentityModal = useCallback(
    (user: SpaceUser) => {
      selectUser(user);
      identityModal.open(user);
    },
    [identityModal, selectUser],
  );

  const tableColumns = useMemo(
    () =>
      createIdentityTableColumns({
        onAdjustIdentity: openIdentityModal,
      }),
    [openIdentityModal],
  );

  const handleRowClick = useCallback(
    (record: SpaceUser) => {
      selectUser(record);
    },
    [selectUser],
  );

  return {
    users,
    loading,
    selectedUser,
    tableColumns,
    handleRowClick,
    createModal,
    identityModal,
  };
};

export default function IdentityManagement() {
  const { isOwner } = useOutletContext<SystemOutletContext>();
  const currentSpace = useSpaceStore(
    state => state.space,
  ) as SpaceSummary | null;
  const spaceId = currentSpace?.id ?? '';

  const {
    users,
    loading,
    selectedUser,
    tableColumns,
    handleRowClick,
    createModal,
    identityModal,
  } = useIdentityManagementController(spaceId);

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title heading={3}>身份管理</Title>
          <Text type="secondary">
            管理空间成员身份，为用户配置不同资源的访问权限
          </Text>
        </div>
        {isOwner ? (
          <Button
            type="primary"
            icon={<IconCozPlus />}
            onClick={createModal.open}
          >
            创建用户
          </Button>
        ) : null}
      </div>

      <Table
        tableProps={{
          dataSource: users,
          columns: tableColumns,
          rowKey: 'id',
          loading,
          pagination: { pageSize: 10 },
          onRow: record => ({
            onClick: () => handleRowClick(record),
            className:
              selectedUser?.id === record.id ? 'bg-primary-50' : undefined,
            style: { cursor: 'pointer' },
          }),
        }}
      />

      <IdentityRoleModal
        visible={identityModal.visible}
        onCancel={identityModal.close}
        onConfirm={identityModal.submit}
        canModify={identityModal.canModify}
        selectedUser={selectedUser}
        updateRoleType={identityModal.updateRoleType}
        onRoleChange={identityModal.onRoleChange}
      />

      <CreateUserModal
        visible={createModal.visible}
        onCancel={createModal.close}
        onConfirm={createModal.submit}
        newEmail={createModal.newEmail}
        newPassword={createModal.newPassword}
        newRole={createModal.newRole}
        onEmailChange={createModal.onEmailChange}
        onPasswordChange={createModal.onPasswordChange}
        onRoleChange={createModal.onRoleChange}
      />
    </div>
  );
}
