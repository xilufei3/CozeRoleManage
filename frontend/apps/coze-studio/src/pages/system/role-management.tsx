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
import {
  IconCozEdit,
  IconCozPlus,
  IconCozTrashCan,
} from '@coze-arch/coze-design/icons';
import {
  Button,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
  Space,
  Card,
  Checkbox,
  Toast,
  Popconfirm,
  TextArea,
} from '@coze-arch/coze-design';

import {
  createRole,
  updateRole,
  deleteRole,
  listRoles,
  getRolePermissions,
  setRolePermissions,
} from '@/api/rbac';
import type { Role, Permission } from '@/api/rbac';

const { Title, Text } = Typography;

// 资源类型定义
const RESOURCE_TYPES = [
  {
    id: 1,
    name: 'Agent',
    actions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  {
    id: 2,
    name: 'Workflow',
    actions: ['create', 'read', 'update', 'delete', 'execute', 'publish'],
  },
  {
    id: 3,
    name: 'Knowledge',
    actions: ['create', 'read', 'update', 'delete', 'manage'],
  },
  {
    id: 4,
    name: 'Plugin',
    actions: ['create', 'read', 'update', 'delete', 'install'],
  },
  {
    id: 5,
    name: 'Database',
    actions: ['create', 'read', 'update', 'delete', 'query'],
  },
];

// 角色编辑模态框
function RoleEditModal({
  visible,
  editingRole,
  roleName,
  roleDescription,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel,
}: {
  visible: boolean;
  editingRole: Role | null;
  roleName: string;
  roleDescription: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={editingRole ? '编辑角色' : '创建角色'}
      visible={visible}
      onOk={onSave}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
    >
      <div className="flex flex-col gap-4">
        <div>
          <Text>角色名称 *</Text>
          <Input
            value={roleName}
            onChange={onNameChange}
            placeholder="输入角色名称"
            className="mt-2"
          />
        </div>
        <div>
          <Text>角色描述</Text>
          <TextArea
            value={roleDescription}
            onChange={onDescriptionChange}
            rows={3}
            placeholder="输入角色描述（可选）"
            className="mt-2"
          />
        </div>
      </div>
    </Modal>
  );
}

// 权限配置模态框
function PermissionConfigModal({
  visible,
  currentRole,
  permissions,
  onPermissionChange,
  onSave,
  onCancel,
}: {
  visible: boolean;
  currentRole: Role | null;
  permissions: Record<string, string[]>;
  onPermissionChange: (key: string, actions: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={`配置权限 - ${currentRole?.name}`}
      visible={visible}
      onOk={onSave}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
      style={{ width: 800 }}
    >
      <div className="max-h-[600px] overflow-y-auto">
        <Text type="secondary" className="mb-4 block">
          勾选角色对各类资源的操作权限。Resource ID 为 0
          表示对该类型的所有资源生效。
        </Text>

        <div className="flex flex-col gap-4">
          {RESOURCE_TYPES.map(resource => {
            const key = `${resource.id}_0`;
            return (
              <Card
                key={resource.id}
                title={resource.name}
                className="mb-4"
                bordered
              >
                <div>
                  <Text className="mb-2 block">所有 {resource.name} 资源</Text>
                  <Checkbox.Group
                    value={permissions[key] || []}
                    onChange={(values: string[]) =>
                      onPermissionChange(key, values)
                    }
                  >
                    <Space wrap>
                      {resource.actions.map(action => (
                        <Checkbox key={action} value={action}>
                          {action}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// 使用 hooks 封装业务逻辑
function useRoleManagement(spaceId: string) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    setLoading(true);
    try {
      const data = await listRoles(spaceId);
      setRoles(data?.roles || []);
    } catch (error) {
      console.error('加载角色列表失败', error);
      Toast.error('加载角色列表失败');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole(roleId);
      Toast.success('角色删除成功');
      loadRoles();
    } catch (error) {
      Toast.error('角色删除失败');
      console.error(error);
    }
  };

  return { roles, loading, loadRoles, handleDeleteRole };
}

// 角色编辑逻辑
function useRoleEdit(spaceId: string, loadRoles: () => void) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const showRoleModal = (role?: Role) => {
    setEditingRole(role || null);
    if (role) {
      setRoleName(role.name);
      setRoleDescription(role.description);
    } else {
      setRoleName('');
      setRoleDescription('');
    }
    setIsModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      Toast.error('请输入角色名称');
      return;
    }

    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: roleName,
          description: roleDescription,
        });
        Toast.success('角色更新成功');
      } else {
        await createRole({
          space_id: spaceId,
          name: roleName,
          description: roleDescription,
        });
        Toast.success('角色创建成功');
      }
      setIsModalVisible(false);
      loadRoles();
    } catch (error) {
      Toast.error(editingRole ? '角色更新失败' : '角色创建失败');
      console.error(error);
    }
  };

  return {
    isModalVisible,
    setIsModalVisible,
    editingRole,
    roleName,
    roleDescription,
    setRoleName,
    setRoleDescription,
    showRoleModal,
    handleSaveRole,
  };
}

// 权限配置逻辑
function usePermissionConfig() {
  const [isPermissionModalVisible, setIsPermissionModalVisible] =
    useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});

  const showPermissionModal = async (role: Role) => {
    setCurrentRole(role);
    setIsPermissionModalVisible(true);

    try {
      const data = await getRolePermissions(role.id);
      const permMap: Record<string, string[]> = {};

      data?.permissions?.forEach((perm: Permission) => {
        const key = `${perm.resource_type}_${perm.resource_id}`;
        permMap[key] = perm.actions || [];
      });

      setPermissions(permMap);
    } catch (error) {
      console.warn('加载权限失败，可能后端 API 未实现', error);
      setPermissions({});
    }
  };

  const handleSavePermissions = async () => {
    if (!currentRole) {
      return;
    }

    try {
      const permList = Object.entries(permissions).map(([key, actions]) => {
        const [resourceType, resourceId] = key.split('_');
        return {
          resource_type: parseInt(resourceType, 10),
          resource_id: resourceId,
          actions,
        };
      });

      await setRolePermissions(currentRole.id, {
        permissions: permList,
      });
      Toast.success('权限配置成功');
      setIsPermissionModalVisible(false);
    } catch (error) {
      Toast.error('权限配置失败');
      console.error(error);
    }
  };

  const handlePermissionChange = (key: string, actions: string[]) => {
    setPermissions(prev => ({
      ...prev,
      [key]: actions,
    }));
  };

  return {
    isPermissionModalVisible,
    setIsPermissionModalVisible,
    currentRole,
    permissions,
    showPermissionModal,
    handleSavePermissions,
    handlePermissionChange,
  };
}

// 表格列配置
function useRoleColumns(
  onConfigPermission: (role: Role) => void,
  onEdit: (role: Role) => void,
  onDelete: (roleId: string) => void,
) {
  return [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'is_system',
      key: 'is_system',
      width: 100,
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'blue' : 'default'}>
          {isSystem ? '系统角色' : '自定义'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (timestamp: number) => new Date(timestamp).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: Role) => (
        <Space size="small">
          <Button
            type="tertiary"
            size="small"
            icon={<IconCozEdit />}
            onClick={() => onConfigPermission(record)}
          >
            配置权限
          </Button>
          <Button
            type="tertiary"
            size="small"
            icon={<IconCozEdit />}
            onClick={() => onEdit(record)}
            disabled={record.is_system}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="danger"
              size="small"
              icon={<IconCozTrashCan />}
              disabled={record.is_system}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

export default function RoleManagement() {
  const currentSpace = useSpaceStore(state => state.space);
  const spaceId = currentSpace?.id || '';

  const { roles, loading, loadRoles, handleDeleteRole } =
    useRoleManagement(spaceId);

  const {
    isModalVisible,
    setIsModalVisible,
    editingRole,
    roleName,
    roleDescription,
    setRoleName,
    setRoleDescription,
    showRoleModal,
    handleSaveRole,
  } = useRoleEdit(spaceId, loadRoles);

  const {
    isPermissionModalVisible,
    setIsPermissionModalVisible,
    currentRole,
    permissions,
    showPermissionModal,
    handleSavePermissions,
    handlePermissionChange,
  } = usePermissionConfig();

  const columns = useRoleColumns(
    showPermissionModal,
    showRoleModal,
    handleDeleteRole,
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title heading={3}>角色管理</Title>
          <Text type="secondary">
            管理系统角色，为角色配置不同资源的访问权限
          </Text>
        </div>
        <Button
          theme="solid"
          type="primary"
          icon={<IconCozPlus />}
          onClick={() => showRoleModal()}
        >
          创建角色
        </Button>
      </div>

      <Table
        tableProps={{
          dataSource: roles,
          columns,
          rowKey: 'id',
          loading,
          pagination: {
            pageSize: 10,
          },
        }}
      />

      <RoleEditModal
        visible={isModalVisible}
        editingRole={editingRole}
        roleName={roleName}
        roleDescription={roleDescription}
        onNameChange={setRoleName}
        onDescriptionChange={setRoleDescription}
        onSave={handleSaveRole}
        onCancel={() => setIsModalVisible(false)}
      />

      <PermissionConfigModal
        visible={isPermissionModalVisible}
        currentRole={currentRole}
        permissions={permissions}
        onPermissionChange={handlePermissionChange}
        onSave={handleSavePermissions}
        onCancel={() => setIsPermissionModalVisible(false)}
      />
    </div>
  );
}
