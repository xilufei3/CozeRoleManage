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

import { useEffect } from 'react';

import { GlobalLayout, useAppInit } from '@coze-foundation/global-adapter';
import { useUserInfo } from '@coze-foundation/account-adapter';
import { useSpaceStore } from '@coze-foundation/space-store';
import { axiosInstance } from '@coze-arch/bot-http';
import { useInitRBACPermissions, setupRBACDebug } from '@coze-common/auth';

export const Layout = () => {
  useAppInit();

  // 获取当前用户和空间信息
  const userInfo = useUserInfo();
  const currentSpace = useSpaceStore(state => state.space);

  // 设置RBAC调试工具（开发环境）
  useEffect(() => {
    setupRBACDebug();
  }, []);

  // 🔑 初始化RBAC权限系统
  // 这将在用户登录后自动加载权限，实现细粒度的资源访问控制
  useInitRBACPermissions(
    userInfo?.user_id_str || '',
    currentSpace?.id || '',
    axiosInstance,
  );

  return <GlobalLayout />;
};
