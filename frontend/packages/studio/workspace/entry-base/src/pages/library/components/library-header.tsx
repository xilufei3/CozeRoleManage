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

import React, { useMemo } from 'react';

import {
  useRBACTypePermission,
  RBACResourceType,
  RBACAction,
} from '@coze-common/auth';
import { I18n } from '@coze-arch/i18n';
import { IconCozPlus } from '@coze-arch/coze-design/icons';
import { Button, Menu } from '@coze-arch/coze-design';
import { ResType } from '@coze-arch/bot-api/plugin_develop';

import { type LibraryEntityConfig } from '../types';

export const LibraryHeader: React.FC<{
  entityConfigs: LibraryEntityConfig[];
}> = ({ entityConfigs }) => {
  // 检查Plugin的create权限
  const hasPluginCreatePermission = useRBACTypePermission(
    RBACResourceType.Plugin,
    RBACAction.Create,
  );

  // 检查Workflow的create权限
  const hasWorkflowCreatePermission = useRBACTypePermission(
    RBACResourceType.Workflow,
    RBACAction.Create,
  );

  // 检查Knowledge的create权限
  const hasKnowledgeCreatePermission = useRBACTypePermission(
    RBACResourceType.Knowledge,
    RBACAction.Create,
  );

  // 检查Prompt的create权限
  const hasPromptCreatePermission = useRBACTypePermission(
    RBACResourceType.Prompt,
    RBACAction.Create,
  );

  // 检查Database的create权限
  const hasDatabaseCreatePermission = useRBACTypePermission(
    RBACResourceType.Database,
    RBACAction.Create,
  );

  // 构建权限映射表
  const permissionMap = useMemo(
    () => ({
      [ResType.Plugin]: hasPluginCreatePermission,
      [ResType.Workflow]: hasWorkflowCreatePermission,
      [ResType.Knowledge]: hasKnowledgeCreatePermission,
      [ResType.Prompt]: hasPromptCreatePermission,
      [ResType.Database]: hasDatabaseCreatePermission,
    }),
    [
      hasPluginCreatePermission,
      hasWorkflowCreatePermission,
      hasKnowledgeCreatePermission,
      hasPromptCreatePermission,
      hasDatabaseCreatePermission,
    ],
  );

  // 🔑 不过滤配置，而是保留所有配置用于禁用显示（而不是隐藏）
  // 这样用户可以看到所有选项，但无权限的选项会被禁用
  const allConfigs = useMemo(
    () =>
      entityConfigs.map(config => {
        const resType = config.target?.[0];
        if (resType === undefined) {
          return { config, hasPermission: true }; // 如果没有target，默认有权限
        }

        const hasPermission = permissionMap[resType];
        return { config, hasPermission: hasPermission !== false };
      }),
    [entityConfigs, permissionMap],
  );

  // 判断是否有任何可用的创建选项
  const hasAnyCreatePermission = allConfigs.some(
    item => item.config.renderCreateMenu && item.hasPermission,
  );

  return (
    <div className="flex items-center justify-between mb-[16px]">
      <div className="font-[500] text-[20px]">
        {I18n.t('navigation_workspace_library')}
      </div>
      <Menu
        position="bottomRight"
        className="w-120px mt-4px mb-4px"
        render={
          <Menu.SubMenu mode="menu">
            {allConfigs.map(({ config, hasPermission }) => {
              const menuItem = config.renderCreateMenu?.();
              if (!menuItem) {
                return null;
              }
              // 🔑 如果是React元素，根据权限添加disabled属性（而不是隐藏）
              if (React.isValidElement(menuItem)) {
                return React.cloneElement(
                  menuItem as React.ReactElement<{ disabled?: boolean }>,
                  {
                    ...(menuItem as React.ReactElement<{ disabled?: boolean }>)
                      .props,
                    disabled: !hasPermission,
                  },
                );
              }
              return menuItem;
            })}
          </Menu.SubMenu>
        }
      >
        <Button
          theme="solid"
          type="primary"
          icon={<IconCozPlus />}
          data-testid="workspace.library.header.create"
          disabled={!hasAnyCreatePermission}
        >
          {I18n.t('library_resource')}
        </Button>
      </Menu>
    </div>
  );
};
