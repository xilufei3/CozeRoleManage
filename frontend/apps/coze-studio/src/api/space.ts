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

import { axiosInstance } from '@coze-arch/bot-http';

export interface SpaceUser {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  roleType?: number; // 1=Owner, 2=Admin, 3=Member
}

export enum RoleType {
  Owner = 1,
  Admin = 2,
  Member = 3,
}

interface SpaceUserPayload {
  [key: string]: unknown;
}

const USER_ID_KEYS = ['userID', 'UserID', 'user_id', 'id'] as const;
const NAME_KEYS = ['name', 'Name'] as const;
const EMAIL_KEYS = ['email', 'Email'] as const;
const AVATAR_KEYS = ['icon_url', 'IconURL'] as const;
const ROLE_KEYS = ['role_type', 'roleType', 'RoleType'] as const;

function pickDefinedValue(
  source: SpaceUserPayload,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function mapSpaceUser(user: SpaceUserPayload): SpaceUser {
  const userId = pickDefinedValue(user, USER_ID_KEYS);
  if (userId === undefined || userId === null) {
    throw new Error(`space user missing userID: ${JSON.stringify(user)}`);
  }

  return {
    id: String(userId),
    name: (pickDefinedValue(user, NAME_KEYS) as string | undefined) ?? '',
    email: pickDefinedValue(user, EMAIL_KEYS) as string | undefined,
    avatar_url: pickDefinedValue(user, AVATAR_KEYS) as string | undefined,
    roleType: pickDefinedValue(user, ROLE_KEYS) as number | undefined,
  };
}

export async function getSpaceUserList(
  spaceId: string,
  opts?: { page?: number; size?: number; search_word?: string },
): Promise<SpaceUser[]> {
  const res = await axiosInstance.get(
    `/api/playground_api/space/${spaceId}/user_list`,
    {
      params: {
        page: opts?.page,
        size: opts?.size,
        search_word: opts?.search_word,
      },
    },
  );

  const payload = res.data?.data ?? res.data;
  const listCandidate =
    payload?.spaceUserList ??
    payload?.SpaceUserList ??
    res.data?.spaceUserList ??
    res.data?.SpaceUserList;

  const list = Array.isArray(listCandidate) ? listCandidate : [];
  return list.map(mapSpaceUser);
}

export async function createSpaceUser(
  spaceId: string,
  params: { email: string; password: string; spaceRole: RoleType },
): Promise<void> {
  await axiosInstance.post(
    `/api/playground_api/space/${spaceId}/user_create`,
    params,
  );
}

export async function updateUserSpaceRole(
  spaceId: string,
  userId: string,
  roleType: RoleType,
): Promise<void> {
  await axiosInstance.put(
    `/api/playground_api/space/${spaceId}/users/${userId}/role`,
    {
      space_role_type: roleType,
    },
  );
}
