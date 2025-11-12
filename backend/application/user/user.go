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

package user

import (
	"context"
	"fmt"
	"net/mail"
	"slices"
	"strconv"
	"strings"

	"github.com/coze-dev/coze-studio/backend/api/model/app/developer_api"
	"github.com/coze-dev/coze-studio/backend/api/model/passport"
	"github.com/coze-dev/coze-studio/backend/api/model/playground"
	"github.com/coze-dev/coze-studio/backend/application/base/ctxutil"
	"github.com/coze-dev/coze-studio/backend/bizpkg/config"
	"github.com/coze-dev/coze-studio/backend/domain/user/entity"
	user "github.com/coze-dev/coze-studio/backend/domain/user/service"
	"github.com/coze-dev/coze-studio/backend/infra/storage"
	"github.com/coze-dev/coze-studio/backend/pkg/errorx"
	"github.com/coze-dev/coze-studio/backend/pkg/lang/ptr"
	langSlices "github.com/coze-dev/coze-studio/backend/pkg/lang/slices"
	"github.com/coze-dev/coze-studio/backend/types/errno"
)

var UserApplicationSVC = &UserApplicationService{}

type UserApplicationService struct {
	oss       storage.Storage
	DomainSVC user.User
}

// Add a simple email verification function
func isValidEmail(email string) bool {
	// If the email string is not in the correct format, it will return an error.
	_, err := mail.ParseAddress(email)
	return err == nil
}

func (u *UserApplicationService) PassportWebEmailRegisterV2(ctx context.Context, locale string, req *passport.PassportWebEmailRegisterV2PostRequest) (
	resp *passport.PassportWebEmailRegisterV2PostResponse, sessionKey string, err error,
) {
	// Verify that the email format is legitimate
	if !isValidEmail(req.GetEmail()) {
		return nil, "", errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", "Invalid email"))
	}

	baseConf, err := config.Base().GetBaseConfig(ctx)
	if err != nil {
		return nil, "", err
	}

	// Allow Register Checker
	if !u.allowRegisterChecker(req.GetEmail(), baseConf) {
		return nil, "", errorx.New(errno.ErrNotAllowedRegisterCode)
	}

	_, err = u.DomainSVC.Create(ctx, &user.CreateUserRequest{
		Email:    req.GetEmail(),
		Password: req.GetPassword(),

		Locale: locale,
	})
	if err != nil {
		return nil, "", err
	}

	userInfo, err := u.DomainSVC.Login(ctx, req.GetEmail(), req.GetPassword())
	if err != nil {
		return nil, "", err
	}

	return &passport.PassportWebEmailRegisterV2PostResponse{
		Data: userDo2PassportTo(userInfo),
		Code: 0,
	}, userInfo.SessionKey, nil
}

func (u *UserApplicationService) allowRegisterChecker(email string, baseConf *config.BasicConfiguration) bool {
	if !baseConf.DisableUserRegistration {
		return true
	}

	allowedEmails := baseConf.AllowRegistrationEmail
	if allowedEmails == "" {
		return false
	}

	return slices.Contains(strings.Split(allowedEmails, ","), strings.ToLower(email))
}

// PassportWebLogoutGet handle user logout requests
func (u *UserApplicationService) PassportWebLogoutGet(ctx context.Context, req *passport.PassportWebLogoutGetRequest) (
	resp *passport.PassportWebLogoutGetResponse, err error,
) {
	uid := ctxutil.MustGetUIDFromCtx(ctx)

	err = u.DomainSVC.Logout(ctx, uid)
	if err != nil {
		return nil, err
	}

	return &passport.PassportWebLogoutGetResponse{
		Code: 0,
	}, nil
}

// PassportWebEmailLoginPost handle user email login requests
func (u *UserApplicationService) PassportWebEmailLoginPost(ctx context.Context, req *passport.PassportWebEmailLoginPostRequest) (
	resp *passport.PassportWebEmailLoginPostResponse, sessionKey string, err error,
) {
	userInfo, err := u.DomainSVC.Login(ctx, req.GetEmail(), req.GetPassword())
	if err != nil {
		return nil, "", err
	}

	return &passport.PassportWebEmailLoginPostResponse{
		Data: userDo2PassportTo(userInfo),
		Code: 0,
	}, userInfo.SessionKey, nil
}

func (u *UserApplicationService) PassportWebEmailPasswordResetGet(ctx context.Context, req *passport.PassportWebEmailPasswordResetGetRequest) (
	resp *passport.PassportWebEmailPasswordResetGetResponse, err error,
) {
	err = u.DomainSVC.ResetPassword(ctx, req.GetEmail(), req.GetPassword())
	if err != nil {
		return nil, err
	}

	return &passport.PassportWebEmailPasswordResetGetResponse{
		Code: 0,
	}, nil
}

func (u *UserApplicationService) PassportAccountInfoV2(ctx context.Context, req *passport.PassportAccountInfoV2Request) (
	resp *passport.PassportAccountInfoV2Response, err error,
) {
	userID := ctxutil.MustGetUIDFromCtx(ctx)

	userInfo, err := u.DomainSVC.GetUserInfo(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &passport.PassportAccountInfoV2Response{
		Data: userDo2PassportTo(userInfo),
		Code: 0,
	}, nil
}

// UserUpdateAvatar Update user avatar
func (u *UserApplicationService) UserUpdateAvatar(ctx context.Context, mimeType string, req *passport.UserUpdateAvatarRequest) (
	resp *passport.UserUpdateAvatarResponse, err error,
) {
	// Get file suffix by MIME type
	var ext string
	switch mimeType {
	case "image/jpeg", "image/jpg":
		ext = "jpg"
	case "image/png":
		ext = "png"
	case "image/gif":
		ext = "gif"
	case "image/webp":
		ext = "webp"
	default:
		return nil, errorx.WrapByCode(err, errno.ErrUserInvalidParamCode,
			errorx.KV("msg", "unsupported image type"))
	}

	uid := ctxutil.MustGetUIDFromCtx(ctx)

	url, err := u.DomainSVC.UpdateAvatar(ctx, uid, ext, req.GetAvatar())
	if err != nil {
		return nil, err
	}

	return &passport.UserUpdateAvatarResponse{
		Data: &passport.UserUpdateAvatarResponseData{
			WebURI: url,
		},
		Code: 0,
	}, nil
}

// UserUpdateProfile Update user profile
func (u *UserApplicationService) UserUpdateProfile(ctx context.Context, req *passport.UserUpdateProfileRequest) (
	resp *passport.UserUpdateProfileResponse, err error,
) {
	userID := ctxutil.MustGetUIDFromCtx(ctx)

	err = u.DomainSVC.UpdateProfile(ctx, &user.UpdateProfileRequest{
		UserID:      userID,
		Name:        req.Name,
		UniqueName:  req.UserUniqueName,
		Description: req.Description,
		Locale:      req.Locale,
	})
	if err != nil {
		return nil, err
	}

	return &passport.UserUpdateProfileResponse{
		Code: 0,
	}, nil
}

func (u *UserApplicationService) GetSpaceListV2(ctx context.Context, req *playground.GetSpaceListV2Request) (
	resp *playground.GetSpaceListV2Response, err error,
) {
	uid := ctxutil.MustGetUIDFromCtx(ctx)
	// 先获取 SpaceUser 列表，包含 roleType 信息
	userSpaceRoles, err := u.DomainSVC.GetUserSpaceRoleList(ctx, uid)
	if err != nil {
		return nil, err
	}
	// 构建 spaceID -> roleType 映射
	spaceRoleMap := make(map[int64]int32)
	for _, usr := range userSpaceRoles {
		if usr != nil {
			spaceRoleMap[usr.SpaceID] = usr.RoleType
		}
	}
	// 获取 Space 详细信息
	spaces, err := u.DomainSVC.GetUserSpaceList(ctx, uid)
	if err != nil {
		return nil, err
	}
	botSpaces := langSlices.Transform(spaces, func(space *entity.Space) *playground.BotSpaceV2 {
		roleType := spaceRoleMap[space.ID]
		return &playground.BotSpaceV2{
			ID:          space.ID,
			Name:        space.Name,
			Description: space.Description,
			SpaceType:   playground.SpaceType(space.SpaceType),
			IconURL:     space.IconURL,
			RoleType:    roleType,
		}
	})

	return &playground.GetSpaceListV2Response{
		Data: &playground.SpaceInfo{
			BotSpaceList:          botSpaces,
			HasPersonalSpace:      true,
			TeamSpaceNum:          0,
			RecentlyUsedSpaceList: botSpaces,
			Total:                 ptr.Of(int32(len(botSpaces))),
			HasMore:               ptr.Of(false),
		},
		Code: 0,
	}, nil
}

func (u *UserApplicationService) CreateSpaceUser(ctx context.Context, locale string, req *playground.CreateSpaceUserRequest) (
	resp *playground.CreateSpaceUserResponse, err error,
) {
	uid := ctxutil.MustGetUIDFromCtx(ctx)
	spaceIDs, err := u.DomainSVC.GetUserSpaceIDs(ctx, uid)
	if err != nil {
		return nil, err
	}

	_, err = u.DomainSVC.CreateUser(ctx, &user.CreateUserRequest{
		Email:    req.GetEmail(),
		Password: req.GetPassword(),
		SpaceID:  spaceIDs[0],
		Locale:   locale,
	}, req.GetSpaceRole())

	if err != nil {
		return nil, err
	}

	return &playground.CreateSpaceUserResponse{
		Code: 0,
		Msg:  "",
	}, nil
}

// GetSpaceUserList Get space user list
func (u *UserApplicationService) GetSpaceUserList(ctx context.Context, req *playground.GetSpaceUserListRequest) (
	resp *playground.GetSpaceUserListResponse, err error,
) {
	uid := ctxutil.MustGetUIDFromCtx(ctx)
	spaceIDs, err := u.DomainSVC.GetUserSpaceIDs(ctx, uid)
	if err != nil {
		return nil, err
	}

	if !slices.Contains(spaceIDs, req.SpaceID) {
		return nil, errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", "space not accessible by current user"))
	}

	userInfos, err := u.DomainSVC.GetSpaceUserList(ctx, req.SpaceID)
	if err != nil {
		return nil, err
	}

	page := req.Page
	if page <= 0 {
		page = 1
	}
	size := req.Size
	if size <= 0 {
		size = 50
	} else if size > 500 {
		size = 500
	}

	filtered := make([]*playground.SpaceUserInfo, 0, len(userInfos))
	if req.SearchWord != "" {
		sw := strings.ToLower(req.SearchWord)
		for _, info := range userInfos {
			if strings.Contains(strings.ToLower(info.Name), sw) || strings.Contains(strings.ToLower(info.Email), sw) {
				filtered = append(filtered, info)
			}
		}
	} else {
		filtered = append(filtered, userInfos...)
	}

	total := len(filtered)
	start := (page - 1) * size
	if start > total {
		start = total
	}
	end := start + size
	if end > total {
		end = total
	}
	paged := filtered[start:end]

	converted := make([]*playground.SpaceUserInfo, 0, len(paged))
	for _, info := range paged {
		converted = append(converted, &playground.SpaceUserInfo{
			UserID:   info.UserID,
			RoleType: info.RoleType,
			Name:     info.Name,
			Email:    info.Email,
		})
	}

	return &playground.GetSpaceUserListResponse{
		Code: 0,
		Msg:  "",
		Data: &playground.SpaceUserListData{
			SpaceUserList: converted,
			Total:         total,
			Page:          page,
			Size:          size,
		},
	}, nil
}

// UpdateUserSpaceRole 更新用户在空间的角色
func (u *UserApplicationService) UpdateUserSpaceRole(ctx context.Context, spaceID, userID int64, roleType int32) error {
	// 权限校验：仅Owner可以修改
	currentUID := ctxutil.MustGetUIDFromCtx(ctx)
	currentRole, exist, err := u.DomainSVC.GetUserSpaceRole(ctx, currentUID, spaceID)
	if err != nil {
		return err
	}
	if !exist || currentRole != 1 { // 1 = Owner
		return errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", "only owner can update user role"))
	}

	// 验证角色类型：只能设置为 Admin(2) 或 Member(3)
	if roleType != 2 && roleType != 3 {
		return errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", "role type must be admin(2) or member(3)"))
	}

	// 不能修改自己的角色
	if userID == currentUID {
		return errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", "cannot update own role"))
	}

	// 检查目标用户是否在空间中
	targetRole, exist, err := u.DomainSVC.GetUserSpaceRole(ctx, userID, spaceID)
	if err != nil {
		return err
	}
	if !exist {
		// 添加更详细的错误信息，包含 userID 和 spaceID
		return errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", fmt.Sprintf("user not found in space: userID=%d, spaceID=%d", userID, spaceID)))
	}
	// 不能修改Owner的角色
	if targetRole == 1 {
		return errorx.New(errno.ErrUserInvalidParamCode, errorx.KV("msg", "cannot update owner role"))
	}

	return u.DomainSVC.UpdateUserSpaceRole(ctx, userID, spaceID, roleType)
}

func (u *UserApplicationService) MGetUserBasicInfo(ctx context.Context, req *playground.MGetUserBasicInfoRequest) (
	resp *playground.MGetUserBasicInfoResponse, err error,
) {
	userIDs, err := langSlices.TransformWithErrorCheck(req.GetUserIds(), func(s string) (int64, error) {
		return strconv.ParseInt(s, 10, 64)
	})
	if err != nil {
		return nil, errorx.WrapByCode(err, errno.ErrUserInvalidParamCode, errorx.KV("msg", "invalid user id"))
	}

	userInfos, err := u.DomainSVC.MGetUserProfiles(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	return &playground.MGetUserBasicInfoResponse{
		UserBasicInfoMap: langSlices.ToMap(userInfos, func(userInfo *entity.User) (string, *playground.UserBasicInfo) {
			return strconv.FormatInt(userInfo.UserID, 10), userDo2PlaygroundTo(userInfo)
		}),
		Code: 0,
	}, nil
}

func (u *UserApplicationService) UpdateUserProfileCheck(ctx context.Context, req *developer_api.UpdateUserProfileCheckRequest) (resp *developer_api.UpdateUserProfileCheckResponse, err error) {
	if req.GetUserUniqueName() == "" {
		return &developer_api.UpdateUserProfileCheckResponse{
			Code: 0,
			Msg:  "no content to update",
		}, nil
	}

	validateResp, err := u.DomainSVC.ValidateProfileUpdate(ctx, &user.ValidateProfileUpdateRequest{
		UniqueName: req.UserUniqueName,
	})
	if err != nil {
		return nil, err
	}

	return &developer_api.UpdateUserProfileCheckResponse{
		Code: int64(validateResp.Code),
		Msg:  validateResp.Msg,
	}, nil
}

func (u *UserApplicationService) ValidateSession(ctx context.Context, sessionKey string) (*entity.Session, error) {
	session, exist, err := u.DomainSVC.ValidateSession(ctx, sessionKey)
	if err != nil {
		return nil, err
	}

	if !exist {
		return nil, errorx.New(errno.ErrUserAuthenticationFailed, errorx.KV("reason", "session not exist"))
	}

	return session, nil
}

func userDo2PassportTo(userDo *entity.User) *passport.User {
	var locale *string
	if userDo.Locale != "" {
		locale = ptr.Of(userDo.Locale)
	}

	return &passport.User{
		UserIDStr:      userDo.UserID,
		Name:           userDo.Name,
		ScreenName:     ptr.Of(userDo.Name),
		UserUniqueName: userDo.UniqueName,
		Email:          userDo.Email,
		Description:    userDo.Description,
		AvatarURL:      userDo.IconURL,
		AppUserInfo: &passport.AppUserInfo{
			UserUniqueName: userDo.UniqueName,
		},
		Locale: locale,

		UserCreateTime: userDo.CreatedAt / 1000,
	}
}

func userDo2PlaygroundTo(userDo *entity.User) *playground.UserBasicInfo {
	return &playground.UserBasicInfo{
		UserId:         userDo.UserID,
		Username:       userDo.Name,
		UserUniqueName: ptr.Of(userDo.UniqueName),
		UserAvatar:     userDo.IconURL,
		CreateTime:     ptr.Of(userDo.CreatedAt / 1000),
	}
}
