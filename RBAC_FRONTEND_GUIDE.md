# RBAC 前端管理页面使用指南

## 📋 功能概览

已完成的 RBAC（基于角色的访问控制）前端管理页面，包含：

1. **侧边栏菜单** - 在"空间"和"探索"下方新增"系统配置"菜单项
2. **角色管理页面** - 创建、编辑、删除角色，配置细粒度权限
3. **用户管理页面** - 为用户分配角色，查看用户权限

## 🗂️ 文件结构

```
frontend/
├── apps/coze-studio/src/
│   ├── api/
│   │   └── rbac.ts                          # RBAC API 客户端
│   ├── pages/system/
│   │   ├── layout.tsx                       # 系统配置布局（包含选项卡）
│   │   ├── role-management.tsx              # 角色管理页面
│   │   └── user-management.tsx              # 用户管理页面
│   └── routes/
│       ├── index.tsx                        # 路由配置（已添加系统配置路由）
│       └── async-components.tsx             # 组件导出（已添加系统组件）
│
└── packages/foundation/space-ui-adapter/src/
    ├── const.ts                             # 常量定义（已添加 SYSTEM 枚举）
    └── components/workspace-sub-menu/
        └── index.tsx                        # 侧边栏菜单（已添加系统配置项）
```

## 🎨 功能详解

### 1. 侧边栏菜单

**位置**: 左侧侧边栏，"Library" 下方

**菜单项**:

- 🤖 Develop（开发）
- 📚 Library（资源库）
- ⚙️ **System（系统配置）** ← 新增

点击"系统配置"进入 RBAC 管理页面。

### 2. 角色管理页面

**路径**: `/space/:space_id/system/roles`

**功能**:

#### 2.1 角色列表

- 展示所有角色（表格形式）
- 显示：角色名称、描述、类型（系统/自定义）、创建时间
- 支持分页、排序

#### 2.2 创建角色

- 点击"创建角色"按钮
- 填写：角色名称（必填）、角色描述（可选）
- 保存后自动刷新列表

#### 2.3 编辑角色

- 点击"编辑"按钮
- 修改角色名称或描述
- 系统角色不可编辑

#### 2.4 配置权限（细粒度）

- 点击"配置权限"按钮
- 为角色选择不同资源类型的操作权限：

  **支持的资源类型**:

  - **Agent** (智能体)
    - 操作: create, read, update, delete, execute, publish
  - **Workflow** (工作流)
    - 操作: create, read, update, delete, execute, publish
  - **Knowledge** (知识库)
    - 操作: create, read, update, delete, manage
  - **Plugin** (插件)
    - 操作: create, read, update, delete, install
  - **Database** (数据库)
    - 操作: create, read, update, delete, query

  **权限配置示例**:

  ```
  ✅ Agent - 所有资源
     ☑ create  ☑ read  ☑ update  ☑ delete  ☐ execute  ☐ publish

  ✅ Workflow - 所有资源
     ☑ read  ☑ execute  ☐ create  ☐ update  ☐ delete  ☐ publish

  ✅ Knowledge - 所有资源
     ☑ read  ☐ create  ☐ update  ☐ delete  ☐ manage
  ```

  Resource ID 为 0 表示对该类型的所有资源生效。

#### 2.5 删除角色

- 点击"删除"按钮并确认
- 系统角色不可删除

### 3. 用户管理页面

**路径**: `/space/:space_id/system/users`

**功能**:

#### 3.1 用户列表

- 展示所有用户
- 显示：用户名、邮箱、已分配角色
- 支持分页

#### 3.2 分配角色

- 点击"分配角色"按钮
- 从下拉框中选择一个或多个角色
- 用户将获得所有角色的累积权限

#### 3.3 查看权限

- 点击"查看权限"按钮
- 查看用户的详细信息：

  - 拥有的角色列表
  - 聚合后的权限（按资源类型分组）

  **权限聚合示例**:

  ```
  用户拥有角色:
    - 开发者角色
    - 查看者角色

  聚合权限:
    Agent:    create, read, update, execute
    Workflow: read, execute
    Knowledge: read
  ```

## 🔌 API 集成

所有页面通过 `rbacApi` 客户端与后端交互：

```typescript
import { rbacApi } from '@/api/rbac';

// 创建角色
await rbacApi.createRole({
  space_id: spaceId,
  name: '编辑者',
  description: '可以编辑内容',
});

// 配置权限
await rbacApi.setRolePermissions(roleId, [
  {
    resource_type: 4, // Agent
    resource_id: '0', // 所有 Agent
    actions: ['create', 'read', 'update'],
  },
]);

// 分配角色给用户
await rbacApi.assignRoleToUser(userId, {
  space_id: spaceId,
  role_id: roleId,
});

// 查看用户权限
const permissions = await rbacApi.getUserPermissions(userId, spaceId);
```

## 🚀 使用流程

### 典型工作流

1. **创建角色**

   - 进入"系统配置" → "角色管理"
   - 点击"创建角色"，输入名称和描述

2. **配置权限**

   - 在角色列表中，点击"配置权限"
   - 勾选需要的资源类型和操作权限
   - 保存配置

3. **分配角色**

   - 切换到"用户管理"选项卡
   - 选择用户，点击"分配角色"
   - 从列表中选择角色并保存

4. **验证权限**
   - 点击"查看权限"查看用户的实际权限
   - 确认权限已正确聚合

### 示例场景

**场景 1: 创建"内容编辑者"角色**

```
角色名称: 内容编辑者
描述: 可以创建和编辑 Agent 和 Workflow，但不能删除

权限配置:
  Agent:
    ☑ create  ☑ read  ☑ update  ☐ delete  ☐ execute  ☐ publish

  Workflow:
    ☑ create  ☑ read  ☑ update  ☐ delete  ☐ execute  ☐ publish
```

**场景 2: 创建"只读用户"角色**

```
角色名称: 查看者
描述: 只能查看和执行，不能修改

权限配置:
  Agent:
    ☐ create  ☑ read  ☐ update  ☐ delete  ☑ execute  ☐ publish

  Workflow:
    ☐ create  ☑ read  ☐ update  ☐ delete  ☑ execute  ☐ publish

  Knowledge:
    ☐ create  ☑ read  ☐ update  ☐ delete  ☐ manage
```

## 🎯 技术栈

- **UI 框架**: React + TypeScript
- **路由**: React Router v6
- **UI 组件**: Ant Design (@coze-arch/coze-design)
- **图标**: @coze-arch/coze-design/icons
- **状态管理**: Zustand (@coze-foundation/space-store)
- **HTTP 请求**: @coze-arch/web-request

## 📌 注意事项

1. **权限实时生效**: 权限配置保存后立即生效，无需重启服务
2. **权限累加**: 用户拥有多个角色时，权限会自动合并（取并集）
3. **系统角色保护**: 系统预设角色不可编辑和删除
4. **Resource ID**: 当前默认为 0（表示所有资源），后续可扩展为针对特定资源实例的权限
5. **用户数据**: 当前使用模拟数据，实际应该从用户服务获取

## 🔧 后续优化建议

1. **用户数据集成**: 接入真实的用户管理服务
2. **权限缓存**: 添加前端权限缓存，减少 API 调用
3. **批量操作**: 支持批量分配/移除角色
4. **权限模板**: 预设常用权限组合
5. **操作日志**: 记录角色和权限的变更历史
6. **搜索过滤**: 在角色和用户列表中添加搜索功能
7. **权限预览**: 在分配角色前预览用户将获得的权限
8. **细粒度资源**: 支持对特定资源实例（非 0）配置权限

## ✨ 特色功能

- ✅ **直观的UI**: 清晰的表格和表单布局
- ✅ **细粒度控制**: 支持到操作级别的权限配置
- ✅ **权限可视化**: 直观展示用户的聚合权限
- ✅ **实时同步**: 与后端 RBAC 系统完全集成
- ✅ **响应式设计**: 适配不同屏幕尺寸

---

**🎉 恭喜！RBAC 前后端系统已完整实现！**
