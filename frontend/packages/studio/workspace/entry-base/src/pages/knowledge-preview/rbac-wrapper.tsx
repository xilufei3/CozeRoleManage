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

import { useLayoutEffect } from 'react';

import { useKnowledgeStore } from '@coze-data/knowledge-stores';
import {
  useRBACPermission,
  RBACResourceType,
  RBACAction,
} from '@coze-common/auth';

/**
 * Knowledge RBAC权限包装器
 * 根据RBAC权限覆盖Knowledge Store中的canEdit状态
 */
export const KnowledgeRBACWrapper = ({
  datasetId,
  children,
}: {
  datasetId: string;
  children: React.ReactNode;
}) => {
  const setCanEdit = useKnowledgeStore(state => state.setCanEdit);
  const dataSetDetail = useKnowledgeStore(state => state.dataSetDetail);

  // 检查RBAC update权限
  const hasUpdatePermission = useRBACPermission(
    RBACResourceType.Knowledge,
    datasetId,
    RBACAction.Update,
  );

  // 使用 useLayoutEffect 确保在子组件渲染之前同步设置 canEdit
  useLayoutEffect(() => {
    // 当数据集详情加载后，使用RBAC权限覆盖canEdit
    if (dataSetDetail && dataSetDetail.dataset_id) {
      const originalCanEdit = dataSetDetail.can_edit;

      // RBAC权限 AND 原始权限 = 最终权限
      // 只有两者都为true时，才允许编辑
      const finalCanEdit = originalCanEdit && hasUpdatePermission;

      console.log(
        `[Knowledge RBAC] 知识库: ${datasetId}`,
        '\n  后端can_edit:',
        originalCanEdit,
        '\n  RBAC update权限:',
        hasUpdatePermission,
        '\n  最终canEdit:',
        finalCanEdit,
        '\n  ⚡ 使用useLayoutEffect同步设置',
      );

      // 直接同步设置，useLayoutEffect 会在DOM更新前执行
      setCanEdit(finalCanEdit);
    }
  }, [datasetId, dataSetDetail, hasUpdatePermission, setCanEdit]);

  return <>{children}</>;
};

