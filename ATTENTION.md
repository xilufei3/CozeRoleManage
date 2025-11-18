### 前端注意事项

#### UI 组件样式覆盖问题

**问题**: Semi Design 的 Tag 组件即使不设置 color 属性，也会有默认的蓝色背景
**原因**: Tag 组件的默认样式就是带背景色的
**解决**:
- 方案1: 使用 `type="ghost"` 属性（透明背景+边框）
- 方案2: 直接用原生 HTML 元素 + Tailwind CSS（更可控）

```typescript
// ❌ 错误：不设置 color 仍然有蓝色背景
<Tag>{action}</Tag>

// ✅ 方案1：使用 ghost 类型
<Tag type="ghost">{action}</Tag>

// ✅ 方案2：使用原生元素（推荐，完全可控）
<span className="inline-block px-2 py-1 text-sm bg-white border border-gray-300 rounded">
  {action}
</span>
```

**经验**: 当 UI 组件库的默认样式不符合需求时，使用原生 HTML + CSS 更灵活

#### HTTP 客户端修复

**问题**: 使用了不存在的 `@coze-arch/web-request`
**解决**: 改用项目中正确的 `@coze-arch/bot-http` 中的 `axiosInstance`
**修改文件**: `frontend/apps/coze-studio/src/api/rbac.ts`

```typescript
// 之前 (错误)
import { request } from '@coze-arch/web-request';
// 现在 (正确)
import { axiosInstance } from '@coze-arch/bot-http';
并且所有的 request.xxx 改为 axiosInstance.xxx，所有的 res.data 改为 res.data.data (因为响应格式不同)
```

#### Node.js 版本管理

**问题**: Git commit hook 需要 Node.js 22，但默认 shell 可能使用旧版本
**原因**: zsh 配置了 `${HOME}/tools/nodejs/bin` 路径，包含 Node.js 22
**解决**: 在执行 git commit 前，需要先 source zsh 配置

```bash
# ✅ 正确：使用 zsh 执行 git commit（会自动加载 node 22）
zsh -c "cd /path/to/project && git commit -m 'message'"

# ✅ 或者：在 zsh shell 中直接执行
source ~/.zshrc  # 如果不在 zsh 中
git commit -m 'message'

# ❌ 错误：直接执行可能使用旧版本 Node.js
git commit -m 'message'  # 可能失败，因为 Node.js 版本太旧
```

**配置位置**: `~/.zshrc` 中有 `export PATH="${HOME}/tools/nodejs/bin:${PATH}"`
**经验**:
- 所有需要 Node.js 22 的命令都应该通过 zsh 执行
- AI 助手在执行 git commit 时应该使用 `zsh -c "cd ... && git commit ..."` 格式
- **不要修改 git hooks 文件**，应该在执行命令时使用正确的 shell

#### axios 拦截器已经解包了响应，所以 res 本身就是数据，而不是 res.data。

修复代码：在 rbac.ts 的 getSpaceResources 函数中检查 `'resource_list' in res`，如果存在则直接返回 res。

#### 资源类型 ID 的来源

RBAC 中的资源类型 ID (4, 5, 6, 7, 17, 23) **不是随便定义的**，它们来自：
- `/backend/domain/permission/consts.go` - 项目全局资源类型定义
- 这是整个项目统一的资源编号标准
- **不建议修改**，因为其他模块也依赖这些数字

#### Agent 资源的特殊性

**问题**: `library_resource_list` API 不支持 Agent 资源类型
**原因**: 该 API 只支持 Plugin(1)、Workflow(2)、Knowledge(4)、Prompt(6)、Database(7)
**解决**: 为 Agent 创建专用 API `/api/rbac/resources/agents`
**数据源**: 直接查询 `single_agent_draft` 表

**关键代码**:
```go
// backend/domain/rbac/service/rbac_impl.go
s.db.WithContext(ctx).
    Table("single_agent_draft").
    Select("id, agent_id, name, description").
    Where("space_id = ? AND deleted_at IS NULL", spaceID).
    Find(&agents)
```

**注意**: 使用 `agent_id` 字段作为资源 ID，而不是表的主键 `id`

#### 权限继承机制的实现

**设计原则**: 具体资源的有效权限 = 所有资源权限 ∪ 具体资源权限（并集）

**场景示例**:
- 对"所有 Agent"有 `read`, `execute` 权限
- 对"Agent-123"有 `create` 权限
- 则对"Agent-123"实际有: `read`, `execute`, `create` 权限

**实现位置**:
1. 后端聚合: `backend/domain/rbac/service/rbac_impl.go` - `GetUserPermissions`
2. 前端角色配置: 继承的权限显示"(继承)"并禁用修改
3. 前端用户查看: 自动合并显示所有权限

#### React useEffect 依赖数组的陷阱

**问题**: 在 useEffect 的依赖数组中添加 state 可能导致无限循环
**场景**:
```typescript
// ❌ 错误：会导致循环
useEffect(() => {
  loadData();
  setPermissions(data); // 这会触发重新渲染
}, [permissions]); // permissions 变化又触发 useEffect

// ✅ 正确：分离加载和初始化
useEffect(() => {
  if (visible && spaceId) {
    loadAllResources();
  }
}, [visible, spaceId]); // 只依赖外部状态

// 使用单独的 useEffect 处理数据初始化
useEffect(() => {
  if (visible && resourceLists && !isInitialized) {
    initializeSelectedResources();
    setIsInitialized(true);
  }
}, [visible, resourceLists, isInitialized]);
```

####
 移除了可能有问题的 Collapse 组件
✅ 使用 Tabs 分类展示接口（角色管理、用户角色分配、权限管理、权限检查）

#### 如果 `IconCozSetting` 不存在，可以使用以下替代图标：

```typescript
// 选项 1: 使用齿轮图标
import { IconCozGear, IconCozGearFill } from '@coze-arch/coze-design/icons';
// 选项 2: 使用工具图标
import { IconCozTool, IconCozToolFill } from '@coze-arch/coze-design/icons';
// 选项 3: 使用管理图标
import { IconCozManage, IconCozManageFill } from '@coze-arch/coze-design/icons';
```

#### 确认`package.json` 存在且包含所有需要的依赖和包

#### 每个react的组件的最大代码量不过超过150行，如果超过了要划分成小的组件

#### 不同的组件应该分别导入不同的api，而不是批量导入

错误示范：
import { rbacApi } from '@/api/rbac';

#### @coze-arch/coze-design 组件导入规范

**问题**: React 页面崩溃，控制台报错 "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined"

**原因**: `Text` 组件不能直接从 `@coze-arch/coze-design` 导入，它是 `Typography` 的子组件

**错误示范**:
```typescript
// ❌ 错误：导致页面崩溃
import { Modal, Text, Card, Tag } from '@coze-arch/coze-design';
```

**正确示范**:
```typescript
// ✅ 正确：Text 需要从 Typography 中解构
import { Modal, Card, Tag, Typography } from '@coze-arch/coze-design';

const { Text, Title } = Typography;
```

**适用组件**:
- `Text` - 必须从 `Typography` 解构
- `Title` - 必须从 `Typography` 解构
- `Paragraph` - 必须从 `Typography` 解构

**影响文件示例**:
- `frontend/apps/coze-studio/src/pages/system/components/UserPermissionDetailModal.tsx`
- `frontend/apps/coze-studio/src/pages/system/components/PermissionConfigModal.tsx`
- 其他使用 `Text` 组件的文件

**调试提示**: 如果页面显示错误页面，检查浏览器控制台是否有 "Element type is invalid" 错误，通常是组件导入问题

#### Modal 组件的 footer 属性使用

**问题**: Modal 的 footer 属性使用 JSX 数组时可能导致错误

**错误示范**:
```typescript
// ❌ 可能导致错误
<Modal
  footer={[
    <Button key="close" onClick={onClose}>
      关闭
    </Button>,
  ]}
/>
```

**正确示范**:
```typescript
// ✅ 方案1: 使用标准的 onOk/okText
<Modal
  onOk={onClose}
  onCancel={onClose}
  okText="关闭"
  cancelText=""
/>

// ✅ 方案2: footer 设为 null（无按钮）
<Modal
  footer={null}
  onCancel={onClose}
/>
```

这是一起典型的多重配置冲突导致的故障：

#### 路由前缀冲突（核心原因）: 开发服务器配置了代理规则 proxy: { '/api': 'http://localhost:8888' }。当访问 /api-docs 时，请求错误地匹配到了代理规则，被转发至后端，后端返回 404 HTML 页面，导致前端 JS 解析失败（< 错误）。

路由嵌套干扰: 目标页面最初被嵌套在主应用的 Layout 组件下。Layout 组件可能包含强制重定向或鉴权逻辑，导致未登录状态下页面无法正常渲染。
HMR 配置不当: 开发服务器的 HMR（热更新）客户端尝试连接默认的 localhost:8080，而实际服务运行在 3000 端口且通过局域网 IP 访问，导致 HMR 连接失败。

解决方案
修改路由路径（避开冲突）: 将前端路由从 /api-docs 修改为 /dev-interface，彻底避开 /api 代理前缀。
提升路由层级: 将该路由移出主 Layout，配置为顶级路由，确保其独立渲染不受干扰。

修正开发服务器配置:
设置 server.historyApiFallback.disableDotRule: true，防止静态资源请求错误返回 index.html。
显式配置 dev.client 的 host 和 port，确保 HMR 在局域网环境下正常工作。
经验教训
前端路由命名需谨慎: 千万不要以 /api 开头，除非你真的想让它走后端代理。

#### 不要用任何any类型！！！

#### library_resource_list API 的资源类型和 RBAC 资源类型不一致

**问题**: library_resource_list 返回的 res_type 和 RBAC 的 resource_type 编号不同
**影响**: 权限检查时类型不匹配，导致权限失效

**类型映射**:
| 资源 | library ResType | RBAC ResourceType |
|------|----------------|-------------------|
| Plugin | 1 | 5 |
| Workflow | 2 | 6 |
| Knowledge | 4 | 7 |
| Prompt | 6 | 17 |
| Database | 7 | 23 |

**解决**: 创建类型映射器 `rbac-resource-type-mapper.ts`，在权限检查前转换类型

**文件位置**:
- `frontend/packages/studio/workspace/entry-base/src/pages/library/hooks/rbac-resource-type-mapper.ts`
- `frontend/packages/studio/workspace/entry-base/src/pages/library/hooks/use-resource-permissions.ts`

#### RBAC 前端集成需要添加的依赖

**问题**: 使用 `@coze-common/auth` 的包需要在 package.json 中添加依赖

**需要添加依赖的包**:
1. `frontend/apps/coze-studio/package.json` - 主应用
2. `frontend/packages/studio/workspace/entry-base/package.json` - workspace基础包
3. `frontend/packages/data/knowledge/knowledge-ide-base/package.json` - knowledge IDE基础包
4. `frontend/packages/data/memory/database-v2-main/package.json` - database详情页包

**添加方式**:
```json
"dependencies": {
  "@coze-common/auth": "workspace:*",
  ...
}
```

**运行**: `rush update` 后生效（只需运行一次）

### 后端注意事项

#### JSON 数组序列化

**问题**: `[]string` 类型无法直接存入 MySQL JSON 字段
**解决**: 实现自定义 `StringArray` 类型 + `driver.Valuer` + `sql.Scanner` 接口

```go
type StringArray []string

func (s StringArray) Value() (driver.Value, error) {
    b, err := json.Marshal(s)
    return string(b), err
}

func (s *StringArray) Scan(value interface{}) error {
    return json.Unmarshal(bytes, s)
}
```

#### GORM Delete 操作 panic

**问题**: `UseTable` 导致 `reflect.New(nil)` 错误
**解决**: 使用原生 GORM SQL 进行删除操作

```go
dao.query.RbacRoleResourcePermission.WithContext(ctx).UnderlyingDB().
    Where("role_id = ?", roleID).
    Delete(&model.RbacRoleResourcePermission{}).Error
```

#### 参数绑定错误

**问题**: 路径参数和查询参数使用错误的标签
**解决**: 正确使用 `path`, `query`, `json` 标签

```go
type GetRoleRequest struct {
    RoleID int64 `path:"roleId,string" binding:"required"`  // 路径参数
}

type ListRolesRequest struct {
    SpaceID int64 `query:"space_id,string" binding:"required"`  // 查询参数
}
```

#### Workflow 复制命名和 Redis 缓存清理

**问题**: 删除 workflow 后，Redis 中的复制计数缓存未清理，导致复制序号不重置（如删除后仍从 2、3、4 开始）

**解决**:
1. 在 `cache.Cmdable` 接口中添加 `Scan` 方法
2. 在 workflow 删除时使用 `Scan` 扫描并删除所有匹配的 Redis key

**关键代码**:
```go
// backend/infra/cache/cache.go - 添加 Scan 方法到接口
type GenericCmdable interface {
    // ...
    Scan(ctx context.Context, cursor uint64, match string, count int64) ScanCmd
}

// backend/domain/workflow/internal/repo/repository.go - 删除时清理缓存
const copyWorkflowRedisKeyPrefix = "copy_workflow_redis_key_prefix"
pattern := fmt.Sprintf("%s:%d:*", copyWorkflowRedisKeyPrefix, id)
var cursor uint64
var keys []string
for {
    batch, nextCursor, err := r.redis.Scan(ctx, cursor, pattern, 100).Result()
    // ... 收集所有匹配的 key
    if cursor == 0 {
        break
    }
}
if len(keys) > 0 {
    r.redis.Del(ctx, keys...)
}
```

**注意**: Redis key 格式为 `copy_workflow_redis_key_prefix:workflowID:userID`，删除时需要扫描所有匹配的 key

#### 权限实时更新机制

**问题**: 管理员修改权限后，用户端需要手动刷新才能生效，用户体验差

**解决**: 添加权限轮询机制，前端每 30 秒自动检查权限是否有更新

**实现位置**:
- `frontend/packages/common/auth/src/rbac/use-rbac-permission.ts`

**关键代码**:
```typescript
// 添加权限轮询机制，定期检查权限是否有更新（每30秒检查一次）
useEffect(() => {
  if (!userId || !spaceId || !axiosInstance) return;

  const POLL_INTERVAL = 30000; // 30秒轮询一次
  const pollTimer = setInterval(async () => {
    const permissions = await loadUserPermissions(userId, spaceId);
    // 通过比较权限数据的 hash 判断是否有变化
    const currentHash = calculatePermissionHash(userPermissions?.detail_permissions);
    const newHash = calculatePermissionHash(permissions.detail_permissions);

    if (currentHash !== newHash) {
      setUserPermissions(permissions);
    }
  }, POLL_INTERVAL);

  return () => clearInterval(pollTimer);
}, [userId, spaceId, axiosInstance]);
```

**注意事项**:
- 轮询间隔为 30 秒，平衡实时性和服务器负载
- 通过 hash 比较判断变化，仅在变化时更新，避免不必要的 UI 刷新
- 轮询失败不显示错误，避免干扰用户体验

#### ESLint 代码规范修复

**问题**: 函数过长、使用 `any` 类型、`import()` 类型注解等问题

**解决**:
1. **函数长度限制**: 将长函数拆分为多个小函数（如 `calculatePermissionHash`）
2. **类型定义**: 使用具体的类型接口，避免 `any`
3. **类型导入**: 使用直接导入类型，避免 `import('./types').UserPermissions`

**关键修复**:
```typescript
// ❌ 错误：函数过长，使用 any 类型
const pollPermissions = async () => {
  // 173 行代码...
  const newHash = permData.detail_permissions.map((p: any) => ...)
  setUserPermissions(permissions as import('./types').UserPermissions);
}

// ✅ 正确：提取函数，使用具体类型
const calculatePermissionHash = (permissions: Permission[] | undefined): string => {
  // 提取的逻辑
};

const pollPermissions = async () => {
  const newHash = calculatePermissionHash(permData.detail_permissions);
  setUserPermissions(permData); // 直接使用导入的类型
}
```

**经验**:
- 每个 React 组件的最大代码量不超过 150 行（已在 ATTENTION.md 中）
- 函数也应该遵循类似的长度限制，超过时提取为独立函数
- 始终使用具体类型，避免 `any`
