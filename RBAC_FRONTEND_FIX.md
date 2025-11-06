# RBAC 前端构建问题修复指南

## 问题描述

前端构建时出现模块找不到的错误：
- `Can't resolve '@coze-arch/web-request'` ✅ 已修复
- `Can't resolve '@coze-foundation/space-store'` ❓ 需要检查

## 已完成的修复

### 1. HTTP 客户端修复 ✅

**问题**: 使用了不存在的 `@coze-arch/web-request`
**解决**: 改用项目中正确的 `@coze-arch/bot-http` 中的 `axiosInstance`

**修改文件**: `frontend/apps/coze-studio/src/api/rbac.ts`

```typescript
// 之前 (错误)
import { request } from '@coze-arch/web-request';

// 现在 (正确)
import { axiosInstance } from '@coze-arch/bot-http';

// 并且所有的 request.xxx 改为 axiosInstance.xxx
// 并且所有的 res.data 改为 res.data.data (因为响应格式不同)
```

## 待解决的问题

### 2. Space Store 和 Icon 依赖

错误信息显示：
```
Module not found: Can't resolve '@coze-foundation/space-store'
Module not found: Can't resolve IconCozSetting, IconCozSettingFill
```

这些包在项目其他地方都有使用，应该是存在的。可能的原因：

1. **依赖未安装**: 需要运行 `rush update`
2. **构建顺序**: 需要先构建依赖包
3. **TypeScript路径**: 可能需要配置路径映射

## 推荐的构建步骤

### 方案 1: 完整重新构建（推荐）

```bash
cd /home/ruoya/DBGroup/AlayaFlow-Server/frontend

# 1. 清理
rush purge

# 2. 重新安装依赖
rush update

# 3. 构建所有依赖包
rush rebuild

# 4. 只构建 coze-studio
rush rebuild -o @coze-studio/app
```

### 方案 2: 仅构建必要的包

```bash
cd /home/ruoya/DBGroup/AlayaFlow-Server/frontend

# 1. 确保依赖最新
rush update

# 2. 构建基础包
rush rebuild -o @coze-foundation/space-store
rush rebuild -o @coze-foundation/space-ui-adapter
rush rebuild -o @coze-arch/bot-http
rush rebuild -o @coze-arch/coze-design

# 3. 构建应用
rush rebuild -o @coze-studio/app
```

### 方案 3: 快速修复（如果时间紧急）

暂时注释掉 RBAC 相关的路由和组件：

1. **注释路由** - `frontend/apps/coze-studio/src/routes/index.tsx`

   ```typescript
   // 暂时注释掉
   // SystemLayout,
   // RoleManagement,
   // UserManagement,
   ```

2. **注释路由配置**

   ```typescript
   // {
   //   path: 'system',
   //   Component: SystemLayout,
   //   ...
   // },
   ```

3. **注释菜单项** - `frontend/packages/foundation/space-ui-adapter/src/components/workspace-sub-menu/index.tsx`

   ```typescript
   // {
   //   icon: <IconCozSetting />,
   //   activeIcon: <IconCozSettingFill />,
   //   title: () => I18n.t('navigation_workspace_system', {}, 'System'),
   //   path: SpaceSubModuleEnum.SYSTEM,
   //   dataTestId: 'navigation_workspace_system',
   // },
   ```

## 检查清单

在构建前，请确认：

- [ ] Node.js 版本正确 (v22.14.0)
- [ ] Rush 已安装并是最新版本
- [ ] `rush update` 已成功运行
- [ ] 没有其他构建错误
- [ ] 磁盘空间充足

## 可能的图标替代方案

如果 `IconCozSetting` 不存在，可以使用以下替代图标：

```typescript
// 选项 1: 使用齿轮图标
import { IconCozGear, IconCozGearFill } from '@coze-arch/coze-design/icons';

// 选项 2: 使用工具图标
import { IconCozTool, IconCozToolFill } from '@coze-arch/coze-design/icons';

// 选项 3: 使用管理图标
import { IconCozManage, IconCozManageFill } from '@coze-arch/coze-design/icons';
```

修改文件：`frontend/packages/foundation/space-ui-adapter/src/components/workspace-sub-menu/index.tsx`

## 验证修复

构建成功后，验证以下内容：

1. **前端启动**: `rush rebuild -o @coze-studio/app` 成功
2. **访问页面**: 打开浏览器访问应用
3. **检查菜单**: 左侧边栏应该显示"系统配置"菜单
4. **测试功能**: 点击进入角色管理和用户管理页面

## 需要更多帮助？

如果问题仍未解决，请检查：

1. 查看完整的构建错误日志
2. 确认 `frontend/packages/foundation/space-store/package.json` 存在
3. 确认 `frontend/packages/arch/coze-design/package.json` 存在
4. 检查是否有其他依赖冲突

---

**最后更新**: 2025-11-04
**状态**: HTTP 客户端已修复 ✅，等待重新构建验证


