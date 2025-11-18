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

import { Modal, Select, Typography } from '@coze-arch/coze-design';

import type { Role } from '../../../api/rbac';

const { Text } = Typography;

interface UserRoleAssignModalProps {
  visible: boolean;
  userName?: string;
  roles: Role[];
  selectedRoleIds: string[];
  onRoleChange: (value: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const UserRoleAssignModal = ({
  visible,
  userName,
  roles,
  selectedRoleIds,
  onRoleChange,
  onSave,
  onCancel,
}: UserRoleAssignModalProps) => (
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
