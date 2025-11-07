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

import { useSpaceStore } from '@coze-foundation/space-store';
import { IconCozEdit } from '@coze-arch/coze-design/icons';
import {
  Button,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  Space,
  Toast,
} from '@coze-arch/coze-design';

import {
  listRoles,
  getUserRoles,
  assignRoleToUser,
  removeUserRole,
  getUserPermissions,
} from '@/api/rbac';
import type { Role, UserPermissions } from '@/api/rbac';

import { UserPermissionDetailModal } from './components/UserPermissionDetailModal';

const { Title, Text } = Typography;

// 模拟用户数据（实际项目中应该从API获取）
const MOCK_USERS = [
  { id: '1', name: 'Admin User', email: 'admin@example.com' },
  { id: '2', name: 'Test User', email: 'test@example.com' },
  { id: '3', name: 'Guest User', email: 'guest@example.com' },
];

// 用户角色分配模态框
function UserRoleAssignModal({
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
}) {
  return (
    <Modal
      title={`分配角色 - ${userName}`}
      visible={visible}
      onOk={onSave}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      width={700}
    >
      <div className="py-4">
        <Text className="mb-2 block">选择角色</Text>
        <Select
          multiple
          value={selectedRoleIds}
          onChange={value => onRoleChange(value as string[])}
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
}

// 使用 hooks 封装业务逻辑
function useUserManagement(spaceId: string, users: typeof MOCK_USERS) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    try {
      const data = await listRoles(spaceId);
      setRoles(data?.roles || []);
    } catch (error) {
      console.error('加载角色列表失败', error);
      setRoles([]);
    }
  }, [spaceId]);

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
    loadAllUserRoles();
  }, [loadRoles, loadAllUserRoles]);

  return { roles, userRoles, loading, loadAllUserRoles };
}

// 表格列配置
function useUserColumns(
  userRoles: Record<string, Role[]>,
  onAssignRoles: (user: (typeof MOCK_USERS)[0]) => void,
  onViewPermissions: (user: (typeof MOCK_USERS)[0]) => void,
) {
  return [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 250,
    },
    {
      title: '角色',
      key: 'roles',
      render: (_: unknown, record: (typeof MOCK_USERS)[0]) => {
        const userRoleList = userRoles[record.id] || [];
        return (
          <Space wrap>
            {userRoleList.length > 0 ? (
              userRoleList.map(role => (
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
      width: 220,
      render: (_: unknown, record: (typeof MOCK_USERS)[0]) => (
        <Space>
          <Button
            type="tertiary"
            size="small"
            icon={<IconCozEdit />}
            onClick={() => onAssignRoles(record)}
          >
            分配角色
          </Button>
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
  ];
}

export default function UserManagement() {
  const [users] = useState(MOCK_USERS);
  const currentSpace = useSpaceStore(state => state.space);
  const spaceId = currentSpace?.id || '';

  const { roles, userRoles, loading, loadAllUserRoles } = useUserManagement(
    spaceId,
    users,
  );

  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [isPermissionModalVisible, setIsPermissionModalVisible] =
    useState(false);
  const [selectedUser, setSelectedUser] = useState<
    (typeof MOCK_USERS)[0] | null
  >(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [currentUserPermission, setCurrentUserPermission] =
    useState<UserPermissions | null>(null);

  // 打开分配角色对话框
  const showAssignModal = (user: (typeof MOCK_USERS)[0]) => {
    setSelectedUser(user);
    const currentRoles = userRoles[user.id] || [];
    setSelectedRoleIds(currentRoles.map(r => r.id));
    setIsAssignModalVisible(true);
  };

  // 保存角色分配
  const handleAssignRoles = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      const currentRoles = userRoles[selectedUser.id] || [];
      const currentRoleIds = currentRoles.map(r => r.id);

      // 找出需要添加和删除的角色
      const toAdd = selectedRoleIds.filter(id => !currentRoleIds.includes(id));
      const toRemove = currentRoleIds.filter(
        id => !selectedRoleIds.includes(id),
      );

      // 添加新角色
      for (const roleId of toAdd) {
        await assignRoleToUser(selectedUser.id, {
          role_id: roleId,
          space_id: spaceId,
        });
      }

      // 删除旧角色
      for (const roleId of toRemove) {
        await removeUserRole(selectedUser.id, roleId, spaceId);
      }

      Toast.success('角色分配成功');
      setIsAssignModalVisible(false);
      loadAllUserRoles();
    } catch (error) {
      Toast.error('角色分配失败');
      console.error(error);
    }
  };

  // 查看用户权限
  const showUserPermissions = async (user: (typeof MOCK_USERS)[0]) => {
    try {
      const permissions = await getUserPermissions(user.id, spaceId);
      setCurrentUserPermission(permissions);
      setIsPermissionModalVisible(true);
    } catch (error) {
      Toast.error('加载用户权限失败');
      console.error(error);
    }
  };

  const columns = useUserColumns(
    userRoles,
    showAssignModal,
    showUserPermissions,
  );

  // 如果没有 space，显示提示
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
          pagination: {
            pageSize: 10,
          },
        }}
      />

      <UserRoleAssignModal
        visible={isAssignModalVisible}
        userName={selectedUser?.name}
        roles={roles}
        selectedRoleIds={selectedRoleIds}
        onRoleChange={setSelectedRoleIds}
        onSave={handleAssignRoles}
        onCancel={() => setIsAssignModalVisible(false)}
      />

      <UserPermissionDetailModal
        visible={isPermissionModalVisible}
        userPermission={currentUserPermission}
        onClose={() => setIsPermissionModalVisible(false)}
      />
    </div>
  );
}
