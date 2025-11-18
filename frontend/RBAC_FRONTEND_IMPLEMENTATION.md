# RBAC 前端权限集成实现文档

## 📊 实施进度

### ✅ 已完成

1. **RBAC权限基础设施** (100%)
   - ✅ 权限常量定义 (9种操作类型)
   - ✅ 权限Store (zustand)
   - ✅ 权限Hooks (多个Hook)
   - ✅ 类型定义

2. **Library页面改造** (100%)
   - ✅ 权限注入和过滤逻辑
   - ✅ 无read权限的资源自动隐藏

3. **资源配置改造** (80%)
   - ✅ Plugin配置 - delete权限控制
   - ✅ Prompt配置 - delete/update权限控制
   - ✅ Knowledge配置 - delete/manage权限控制
   - ✅ Database配置 - delete权限控制
   - ⏳ Workflow配置 - 待处理（使用外部Hook）
   - ⏳ Agent配置 - 待处理（独立页面）

### ⏳ 待完成

1. **Workflow配置** - 使用了`useWorkflowResourceAction` hook，需要包装或传递权限
2. **Agent开发页面** - 独立页面，需要单独处理权限注入

---

## 🏗️ 架构设计

### 核心组件

```
frontend/packages/common/auth/src/rbac/
├── constants.ts              # 资源类型和操作类型常量
├── types.ts                  # TypeScript类型定义
├── rbac-store.ts             # Zustand状态管理
├── use-rbac-permission.ts    # React Hooks
└── index.ts                  # 导出文件
```

### 权限Store (zustand)

```typescript
interface RBACPermissionState {
  userPermissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  currentSpaceId: string | null;
  currentUserId: string | null;
}

interface RBACPermissionActions {
  setUserPermissions: (permissions: UserPermissions) => void;
  clearPermissions: () => void;
  checkPermission: (resourceType, resourceId, action) => boolean;
  getResourcePermissions: (resourceType, resourceId) => RBACAction[];
  batchCheckPermissions: (checks) => PermissionCheckResult[];
}
```

### 可用的Hooks

```typescript
// 1. 初始化权限（登录/切换空间时调用）
useInitRBACPermissions(userId, spaceId)

// 2. 检查单个权限
const hasDelete = useRBACPermission(
  RBACResourceType.Plugin,
  pluginId,
  RBACAction.Delete
)

// 3. 获取资源的所有权限
const permissions = useRBACResourcePermissions(
  RBACResourceType.Plugin,
  pluginId
)
// 返回: { create: true, read: true, delete: false, ... }

// 4. 批量获取多个资源的权限
const permissionsMap = useRBACBatchPermissions(resourceList)
// 返回: Map<resourceId, ResourcePermissions>

// 5. 检查是否有任意一个权限
const hasAny = useRBACHasAnyPermission(
  resourceType,
  resourceId,
  [RBACAction.Update, RBACAction.Delete]
)

// 6. 检查是否有所有权限
const hasAll = useRBACHasAllPermissions(
  resourceType,
  resourceId,
  [RBACAction.Read, RBACAction.Execute]
)
```

---

## 📝 实现模式

### Library页面模式

**文件**: `frontend/packages/studio/workspace/entry-base/src/pages/library/`

**步骤**:

1. **创建权限注入Hook** - `hooks/use-resource-permissions.ts`
   ```typescript
   export const useResourcesWithPermissions = (
     resources: ResourceInfo[]
   ): ResourceInfoWithPermissions[] => {
     // 1. 使用useRBACBatchPermissions获取权限
     // 2. 注入到每个资源的rbac_permissions字段
     // 3. 过滤掉无read权限的资源
   }
   ```

2. **在主页面使用**
   ```typescript
   // index.tsx
   const resourcesWithPermissions = useResourcesWithPermissions(
     listResp.data?.list
   );

   <Table
     dataSource={resourcesWithPermissions}  // 使用过滤后的数据
     ...
   />
   ```

3. **在各资源配置中使用权限**
   ```typescript
   // use-plugin-config.tsx
   renderActions: (item: ResourceInfo) => {
     const itemWithPermissions = item as ResourceInfoWithPermissions;
     const rbacPerms = itemWithPermissions.rbac_permissions || {};

     const deleteDisabled = rbacPerms.delete === false;

     return <TableAction deleteProps={{ disabled: deleteDisabled, ... }} />;
   }
   ```

---

## 🎯 权限映射表

| RBAC操作 | 资源类型 | 前端对应功能 |
|---------|---------|------------|
| `read` | 所有 | 资源可见性（列表显示、详情查看） |
| `create` | 所有 | 创建按钮可用 |
| `update` | Plugin, Prompt, Knowledge, Database | 编辑按钮可用、字段可编辑 |
| `delete` | 所有 | 删除按钮可用 |
| `execute` | Agent, Workflow | 运行/测试按钮可用 |
| `publish` | Agent, Workflow | 发布按钮可用 |
| `install` | Plugin | 安装按钮可用 |
| `manage` | Knowledge | 启用/禁用开关可用 |
| `query` | Database | 查询按钮可用 |

---

## 🔧 实现细节

### 1. 权限常量定义

```typescript
// frontend/packages/common/auth/src/rbac/constants.ts

export enum RBACResourceType {
  Agent = 4,
  Plugin = 5,
  Workflow = 6,
  Knowledge = 7,
  Prompt = 17,
  Database = 23,
}

export enum RBACAction {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Execute = 'execute',
  Publish = 'publish',
  Install = 'install',
  Manage = 'manage',
  Query = 'query',
}

// 每种资源支持的操作
export const RESOURCE_ACTIONS_MAP: Record<RBACResourceType, RBACAction[]> = {
  [RBACResourceType.Agent]: [Create, Read, Update, Delete, Execute, Publish],
  [RBACResourceType.Plugin]: [Create, Read, Update, Delete, Install],
  [RBACResourceType.Workflow]: [Create, Read, Update, Delete, Execute, Publish],
  [RBACResourceType.Knowledge]: [Create, Read, Update, Delete, Manage],
  [RBACResourceType.Prompt]: [Create, Read, Update, Delete],
  [RBACResourceType.Database]: [Create, Read, Update, Delete, Query],
};
```

### 2. 权限继承逻辑

**原则**: 具体资源的有效权限 = 所有资源权限 ∪ 具体资源权限

**实现**: 在 `rbac-store.ts` 的 `checkPermission` 方法中：

```typescript
checkPermission: (resourceType, resourceId, action) => {
  const { userPermissions } = get();

  // 1. 先检查"所有资源"(resource_id=0)的权限
  const allResourcePerm = userPermissions.detail_permissions.find(
    perm => perm.resource_type === resourceType && perm.resource_id === '0'
  );
  if (allResourcePerm && allResourcePerm.actions.includes(action)) {
    return true;
  }

  // 2. 再检查具体资源的权限
  const specificPerm = userPermissions.detail_permissions.find(
    perm => perm.resource_type === resourceType && perm.resource_id === resourceId
  );
  if (specificPerm && specificPerm.actions.includes(action)) {
    return true;
  }

  return false;
}
```

### 3. 降级策略

为了避免权限加载失败导致用户无法使用：

```typescript
// 在 use-resource-permissions.ts 中
export const useFilterReadableResources = (resources) => {
  return useMemo(() => {
    return resources.filter(resource => {
      const permissions = resource.rbac_permissions;

      // 如果没有权限信息，默认可见（降级策略）
      if (!permissions || Object.keys(permissions).length === 0) {
        return true;
      }

      // 必须有read权限才可见
      return permissions.read !== false;
    });
  }, [resources]);
};
```

---

## 🚀 使用指南

### 在应用启动时初始化权限

```typescript
// 在主应用或Layout组件中
import { useInitRBACPermissions } from '@coze-common/auth';

function App() {
  const { user_id, space_id } = useCurrentContext();

  // 初始化RBAC权限
  useInitRBACPermissions(user_id, space_id);

  return <YourApp />;
}
```

### 在资源列表中使用权限

```typescript
// 在Library或类似页面
import { useResourcesWithPermissions } from './hooks/use-resource-permissions';

function ResourceList() {
  const listResp = useResourceList();

  // 注入权限并过滤
  const resourcesWithPermissions = useResourcesWithPermissions(
    listResp.data?.list
  );

  return <Table dataSource={resourcesWithPermissions} />;
}
```

### 在操作按钮中使用权限

```typescript
// 在资源配置中
import { type ResourceInfoWithPermissions } from '../hooks/use-resource-permissions';

renderActions: (item: ResourceInfo) => {
  const itemWithPermissions = item as ResourceInfoWithPermissions;
  const rbacPerms = itemWithPermissions.rbac_permissions || {};

  const deleteDisabled = rbacPerms.delete === false;
  const editDisabled = rbacPerms.update === false;

  return (
    <TableAction
      deleteProps={{ disabled: deleteDisabled, ... }}
      editProps={{ disabled: editDisabled, ... }}
    />
  );
}
```

### 在详情页中检查权限

```typescript
// 在资源详情页
import { useRBACPermission, RBACResourceType, RBACAction } from '@coze-common/auth';

function ResourceDetail({ resourceId }) {
  const canUpdate = useRBACPermission(
    RBACResourceType.Plugin,
    resourceId,
    RBACAction.Update
  );

  const canDelete = useRBACPermission(
    RBACResourceType.Plugin,
    resourceId,
    RBACAction.Delete
  );

  return (
    <div>
      <Button disabled={!canUpdate}>编辑</Button>
      <Button disabled={!canDelete}>删除</Button>
    </div>
  );
}
```

---

## ⚠️ 注意事项

### 1. 性能优化

- ✅ 使用 `useRBACBatchPermissions` 批量检查权限，避免N+1查询
- ✅ 权限信息可以缓存在Store中，避免重复加载
- ⚠️ 大量资源时考虑分页或虚拟滚动

### 2. 错误处理

- ✅ 权限加载失败时使用降级策略（默认显示资源）
- ✅ 操作会被后端二次验证，前端只是UI优化

### 3. 类型安全

- ✅ 使用 `ResourceInfoWithPermissions` 类型扩展
- ✅ 所有枚举类型都有完整定义
- ✅ TypeScript严格模式兼容

### 4. 用户体验

- ✅ 禁用的按钮应该有tooltip说明原因
- ✅ 权限加载时显示loading状态
- ⚠️ 考虑添加"权限不足"的友好提示

---

## 📋 待办事项

### 高优先级

1. **完成Workflow配置改造**
   - 包装 `useWorkflowResourceAction` hook
   - 传递权限信息
   - 控制删除/编辑按钮状态

2. **完成Agent开发页面改造**
   - 在Agent列表加载时注入权限
   - 修改 `use-card-actions.tsx`
   - 控制操作菜单项

### 中优先级

3. **添加权限初始化入口**
   - 在用户登录后自动加载权限
   - 在切换空间时重新加载权限

4. **添加权限缓存策略**
   - 权限缓存5-10分钟
   - 提供手动刷新接口

### 低优先级

5. **资源详情页的只读模式**
   - 根据update权限控制字段可编辑性
   - 类似member角色的只读效果

6. **权限提示优化**
   - 为禁用按钮添加tooltip
   - 显示"权限不足"原因

---

## 🧪 测试清单

### 功能测试

- [ ] 权限Store正确加载和存储用户权限
- [ ] 无read权限的资源不在列表中显示
- [ ] 无delete权限的删除按钮被禁用
- [ ] 无update权限的编辑按钮被禁用
- [ ] 权限继承正确工作（所有资源+具体资源）
- [ ] 批量权限检查性能良好

### 边界情况

- [ ] 权限加载失败时的降级策略
- [ ] 没有任何权限时的处理
- [ ] 权限为空对象时的处理
- [ ] 切换空间后权限正确更新

### 兼容性

- [ ] TypeScript编译无错误
- [ ] 与现有权限系统（project/space auth）兼容
- [ ] 不影响未集成RBAC的页面

---

## 📞 联系与支持

如有问题，请参考：
- 后端文档: `RBAC_FINAL_COMPLETE_DOCUMENTATION.md`
- 前端实现: 本文档
- API文档: 后端文档中的API部分

**实施日期**: 2025-11-10
**版本**: v1.0-beta
**状态**: 80% 完成

