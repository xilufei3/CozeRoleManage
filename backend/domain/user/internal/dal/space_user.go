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

package dal

import (
	"context"

	"gorm.io/gorm"

	"github.com/coze-dev/coze-studio/backend/domain/user/internal/dal/model"
)

func (dao *SpaceDAO) AddSpaceUser(ctx context.Context, spaceUser *model.SpaceUser) error {
	return dao.query.SpaceUser.WithContext(ctx).Create(spaceUser)
}

func (dao *SpaceDAO) GetSpaceList(ctx context.Context, userID int64) ([]*model.SpaceUser, error) {
	return dao.query.SpaceUser.WithContext(ctx).Where(
		dao.query.SpaceUser.UserID.Eq(userID),
	).Find()
}

func (dao *SpaceDAO) GetUserList(ctx context.Context, spaceID int64) ([]*model.SpaceUser, error) {
	return dao.query.SpaceUser.WithContext(ctx).Where(
		dao.query.SpaceUser.SpaceID.Eq(spaceID),
	).Find()
}

func (dao *SpaceDAO) GetUserSpaceRole(ctx context.Context, userID, spaceID int64) (roleType int32, exist bool, err error) {
	spaceUser, err := dao.query.SpaceUser.WithContext(ctx).Where(
		dao.query.SpaceUser.UserID.Eq(userID),
		dao.query.SpaceUser.SpaceID.Eq(spaceID),
	).First()
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return 0, false, nil
		}
		return 0, false, err
	}
	return spaceUser.RoleType, true, nil
}

func (dao *SpaceDAO) UpdateUserSpaceRole(ctx context.Context, userID, spaceID int64, roleType int32) error {
	// 更新角色 - 使用Updates方法，字段名使用数据库列名
	info, err := dao.query.SpaceUser.WithContext(ctx).Where(
		dao.query.SpaceUser.UserID.Eq(userID),
		dao.query.SpaceUser.SpaceID.Eq(spaceID),
	).Updates(map[string]interface{}{
		"role_type": roleType,
	})
	if err != nil {
		return err
	}
	// 检查是否有记录被更新
	if info.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
